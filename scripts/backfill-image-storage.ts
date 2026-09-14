/**
 * One-off backfill: moves packets.mascot_image_url / coloring_image_url
 * base64 blobs out of the database and into Storage (packet-mascots /
 * packet-coloring-pages), rewriting each column to the hosted public URL.
 *
 * Read side already handles hosted URLs — resolveMascotImageForRender and
 * resolveColoringImageForRender are both live in production (commit
 * 5e93bc0). This script only ever produces a shape those two already know
 * how to render.
 *
 * SCOPE
 * -----
 * Targets any row, created before this run started, where mascot_image_url
 * and/or coloring_image_url matches 'data:%'. Left alone, on purpose:
 *   - null values
 *   - values already holding an https Storage URL (already migrated)
 *   - the 2 mascot rows holding dead replicate.delivery URLs (2026-04-11
 *     test packets) — permanently unrecoverable, already render as absent
 *     today via resolveMascotImageForRender's own fetch-failure handling.
 *     Neither of their columns match 'data:%', so they never enter the
 *     target list — no special-casing needed.
 *
 * PER-TASK SEQUENCE (mascot and coloring are independent tasks even when
 * they belong to the same packet row — a mascot upload failure must never
 * block or invalidate an otherwise-successful coloring migration on the
 * same row, and vice versa):
 *   1. Decode the base64 payload.
 *   2+3. sharp(original).png({ palette: true }) in a single call — this
 *      decodes whatever format is actually stored (confirmed via the
 *      backfill audit: 175 of 178 rows are already PNG, 3 are WebP from
 *      2026-04-11) and re-encodes as a palette-reduced PNG in one pass.
 *      Doing format conversion and palette reduction as one decode->encode
 *      round trip (rather than two separate re-encodes) avoids a pointless
 *      extra generation loss for the 3 WebP rows. WebP is never used as the
 *      stored output format — react-pdf/pdfkit cannot consume it (see
 *      CLAUDE.md's PDF section) — and no lossy step is applied: the
 *      coloring page is printed line art, where lossy artifacts at line
 *      edges are a real, visible quality cost, and palette reduction is
 *      visually lossless for this flat-cartoon/line-art content (see the
 *      backfill audit's real before/after numbers).
 *   4. Upload to `${userId}/${packetId}.png` in the task's bucket,
 *      upsert: true — same path convention as uploadMascotImage.
 *   5. Verify the object is actually listable in the bucket before
 *      proceeding — trusting upload()'s own response is most of this, but
 *      an explicit list() call catches anything upload() itself missed.
 *   6. Only then update the one column this task owns.
 *
 * CLIENT: service-role. Bypasses RLS (rolbypassrls=true, confirmed), which
 * is correct for a maintenance job spanning many accounts and means the
 * classic 42501 SELECT-policy trap (upload() compiles to
 * INSERT ... RETURNING) never applies here — RLS isn't evaluated for this
 * role at all. The cost: RLS is no longer a backstop against a wrong user
 * id in the storage path. userId is ALWAYS read from the same packets row
 * being processed (never a separate lookup or cache) — see buildTasks.
 *
 * ROW SELECTION: one plain SELECT of every packet created before the
 * cutoff, fetched once into memory, then filtered client-side with
 * `.startsWith("data:")`. No OFFSET pagination against the live table —
 * migrated rows would drop out of a re-queried WHERE clause mid-run and
 * later pages would silently skip rows. The in-memory snapshot is the
 * fixed iteration list for this run.
 *
 * RESUMABILITY: `.startsWith("data:")` is both the selection filter and
 * the resume mechanism — a row a previous run finished no longer matches
 * it, so a fresh run naturally skips it with no separate ledger. A row
 * that failed partway is safe to retry: nothing about the fresh run
 * remembers a prior attempt, upload() is called again with upsert: true
 * (overwriting the same path with the same bytes, not appending), and the
 * column is only ever written after a verified upload — so a row can never
 * end up with a column pointing at an object that isn't there.
 *
 * FAILURE HANDLING: a single task's error is caught, logged with its
 * packet id, and the run continues — never throws out to the loop.
 *
 * DRY RUN: --dry-run does everything except the upload and the column
 * write — decode, convert, compress, and report exactly what would be
 * written where. Also writes the pre-backfill verification snapshot
 * (expected image count per target packet, from current column
 * non-nullness) that scripts/sweep-packets.ts's image-count check
 * (proposed, not yet built) compares against after a real run.
 *
 * USAGE
 * -----
 *   npm run backfill-images -- --dry-run [--limit N]
 *   npm run backfill-images               (a real run — NOT executed by
 *                                           this script's author without
 *                                           explicit authorization)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filenameEsm = fileURLToPath(import.meta.url);
const __dirnameEsm = path.dirname(__filenameEsm);
// run-ts.mjs compiles this script to a temp file under
// node_modules/.cache/run-ts/ before running it, so __dirname-relative
// paths land there too — fine for the full JSON report (regenerated every
// run), but the pre-backfill snapshot is the one thing Step 3's
// verification depends on later, and that cache directory can be wiped by
// `npm ci`/a dependency reinstall/a cache clear at any point in between.
// DURABLE_OUT_DIR (resolved from cwd, i.e. the project root when run via
// `npm run backfill-images`) is a second, permanent copy of the snapshot
// only — the ephemeral OUT_DIR behavior below is unchanged.
const OUT_DIR = path.join(__dirnameEsm, "..", "backfill-output");
const DURABLE_OUT_DIR = path.join(process.cwd(), "backfill-output");

// ─── CLI args ───────────────────────────────────────────────────────────────

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run");
  const limitIdx = process.argv.indexOf("--limit");
  const limit =
    limitIdx === -1 ? null : (() => {
      const n = parseInt(process.argv[limitIdx + 1], 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    })();
  return { dryRun, limit };
}

// ─── Supabase (service-role — see header for why) ────────────────────────────

function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    console.error("Run via: npm run backfill-images -- --dry-run");
    process.exit(1);
  }
  return createClient(url, key);
}

// ─── Row shapes ─────────────────────────────────────────────────────────────

interface PacketRow {
  id: string;
  user_id: string;
  created_at: string;
  mascot_image_url: string | null;
  coloring_image_url: string | null;
}

type ColumnName = "mascot_image_url" | "coloring_image_url";
type BucketName = "packet-mascots" | "packet-coloring-pages";

interface MigrationTask {
  packetId: string;
  userId: string;
  column: ColumnName;
  bucket: BucketName;
  dataUrl: string;
}

type ImageState = "null" | "base64" | "hosted" | "replicate.delivery" | "other";

function classify(url: string | null): ImageState {
  if (url == null) return "null";
  if (url.startsWith("data:")) return "base64";
  if (url.includes("replicate.delivery")) return "replicate.delivery";
  if (url.startsWith("https://")) return "hosted";
  return "other";
}

interface TaskResult {
  packetId: string;
  userId: string;
  column: ColumnName;
  bucket: BucketName;
  declaredMime?: string;
  detectedFormat?: string;
  wasWebp?: boolean;
  beforeBytes?: number;
  afterBytes?: number;
  status: "would-migrate" | "migrated" | "error";
  error?: string;
  hostedUrl?: string;
}

// ─── Snapshot (pre-backfill verification baseline) ──────────────────────────

interface SnapshotEntry {
  packetId: string;
  mascotPresent: boolean;
  coloringPresent: boolean;
  expectedImageCount: number;
  mascotState: ImageState;
  coloringState: ImageState;
}

function buildSnapshot(targetRows: PacketRow[]): SnapshotEntry[] {
  return targetRows.map((r) => {
    const mascotPresent = r.mascot_image_url != null;
    const coloringPresent = r.coloring_image_url != null;
    return {
      packetId: r.id,
      mascotPresent,
      coloringPresent,
      expectedImageCount: (mascotPresent ? 1 : 0) + (coloringPresent ? 1 : 0),
      mascotState: classify(r.mascot_image_url),
      coloringState: classify(r.coloring_image_url),
    };
  });
}

// ─── Task building ──────────────────────────────────────────────────────────

function buildTasks(rows: PacketRow[]): MigrationTask[] {
  const tasks: MigrationTask[] = [];
  for (const r of rows) {
    // userId is always read off this same row — never a separate lookup —
    // see the header's note on what service-role costs us (no RLS backstop).
    if (r.mascot_image_url?.startsWith("data:")) {
      tasks.push({
        packetId: r.id,
        userId: r.user_id,
        column: "mascot_image_url",
        bucket: "packet-mascots",
        dataUrl: r.mascot_image_url,
      });
    }
    if (r.coloring_image_url?.startsWith("data:")) {
      tasks.push({
        packetId: r.id,
        userId: r.user_id,
        column: "coloring_image_url",
        bucket: "packet-coloring-pages",
        dataUrl: r.coloring_image_url,
      });
    }
  }
  return tasks;
}

// ─── Per-task processing ────────────────────────────────────────────────────

async function processTask(
  supabase: SupabaseClient,
  task: MigrationTask,
  dryRun: boolean
): Promise<TaskResult> {
  const base: Pick<TaskResult, "packetId" | "userId" | "column" | "bucket"> = {
    packetId: task.packetId,
    userId: task.userId,
    column: task.column,
    bucket: task.bucket,
  };

  try {
    const match = /^data:([^;]+);base64,(.+)$/.exec(task.dataUrl);
    if (!match) {
      return { ...base, status: "error", error: "data URL did not match the expected format" };
    }
    const [, declaredMime, base64Payload] = match;
    const original = Buffer.from(base64Payload, "base64");

    const meta = await sharp(original).metadata();
    const detectedFormat = meta.format ?? "unknown";
    const wasWebp = detectedFormat === "webp";

    // Single decode->palette-PNG-encode pass — handles both WebP->PNG
    // conversion (3 rows need this) and palette compression (all rows get
    // this) in one lossless-in-effect step. See header for why no lossy
    // step and no WebP output.
    const compressed = await sharp(original).png({ palette: true }).toBuffer();

    const result: TaskResult = {
      ...base,
      declaredMime,
      detectedFormat,
      wasWebp,
      beforeBytes: original.length,
      afterBytes: compressed.length,
      status: "would-migrate",
    };

    if (dryRun) return result;

    // ── Live path: upload, verify, then (only then) write the column ──────
    const storagePath = `${task.userId}/${task.packetId}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(task.bucket)
      .upload(storagePath, compressed, { contentType: "image/png", upsert: true });

    if (uploadError || !uploadData) {
      return { ...result, status: "error", error: `upload failed: ${uploadError?.message ?? "no data returned"}` };
    }

    // Explicit existence check beyond trusting upload()'s own response —
    // "confirm the upload succeeded before proceeding" per spec.
    const { data: listing, error: listError } = await supabase.storage
      .from(task.bucket)
      .list(task.userId, { search: `${task.packetId}.png` });
    const confirmed = !listError && (listing ?? []).some((f) => f.name === `${task.packetId}.png`);
    if (!confirmed) {
      return {
        ...result,
        status: "error",
        error: `upload verify failed: object not listed after upload (${listError?.message ?? "not found"})`,
      };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(task.bucket).getPublicUrl(uploadData.path);

    const { error: updateError } = await supabase
      .from("packets")
      .update({ [task.column]: publicUrl })
      .eq("id", task.packetId);

    if (updateError) {
      return { ...result, status: "error", error: `column update failed: ${updateError.message}` };
    }

    return { ...result, status: "migrated", hostedUrl: publicUrl };
  } catch (err) {
    return {
      ...base,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Fetching ───────────────────────────────────────────────────────────────

// Keyset-paginated (ORDER BY id, WHERE id > lastId), not OFFSET: a single
// request for every row's mascot/coloring text hits a statement timeout —
// the base64 payload we're migrating away from is exactly what makes the
// table large. `id` order is stable regardless of what this script does to
// the row's columns mid-run, so — unlike OFFSET — a page boundary never
// drifts as rows get migrated out of the 'data:%' filter. This still adds
// up to one upfront, in-memory snapshot fetched before any task runs; it's
// just fetched in safe-sized chunks rather than a single oversized request.
async function fetchAllPacketsBeforeCutoff(
  supabase: SupabaseClient,
  cutoff: string,
  pageSize = 10
): Promise<PacketRow[]> {
  const rows: PacketRow[] = [];
  let lastId: string | null = null;
  for (;;) {
    let query = supabase
      .from("packets")
      .select("id, user_id, created_at, mascot_image_url, coloring_image_url")
      .lt("created_at", cutoff)
      .order("id", { ascending: true })
      .limit(pageSize);
    if (lastId) query = query.gt("id", lastId);

    const { data, error } = await query.returns<PacketRow[]>();
    if (error) throw new Error(`fetch page failed (after id ${lastId ?? "<start>"}): ${error.message}`);
    if (!data || data.length === 0) break;

    rows.push(...data);
    lastId = data[data.length - 1].id;
    if (data.length < pageSize) break;
  }
  return rows;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const { dryRun, limit } = parseArgs();
  const supabase = getServiceClient();
  const cutoff = new Date().toISOString();

  console.log(`=== Packet Day image Storage backfill ${dryRun ? "(DRY RUN — no uploads, no column writes)" : "(LIVE)"} ===`);
  console.log(`Cutoff: only packets created before ${cutoff}\n`);

  const allRows = await fetchAllPacketsBeforeCutoff(supabase, cutoff);

  const targetRows = allRows.filter(
    (r) => r.mascot_image_url?.startsWith("data:") || r.coloring_image_url?.startsWith("data:")
  );

  console.log(`Packets scanned (created before cutoff): ${allRows.length}`);
  console.log(`Packets targeted (>=1 column is base64): ${targetRows.length}`);

  // ── Pre-backfill verification snapshot — written every run, dry or live ──
  const snapshot = buildSnapshot(targetRows);
  const snapshotJson = JSON.stringify({ cutoff, packetCount: snapshot.length, packets: snapshot }, null, 2);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const snapshotPath = path.join(OUT_DIR, `pre-backfill-snapshot-${cutoff.replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(snapshotPath, snapshotJson);
  console.log(`Pre-backfill verification snapshot written: ${snapshotPath}`);

  // Durable copy — same content, outside node_modules, survives a cache
  // clear or dependency reinstall. This is the copy Step 3 should read.
  fs.mkdirSync(DURABLE_OUT_DIR, { recursive: true });
  const durableSnapshotPath = path.join(
    DURABLE_OUT_DIR,
    `pre-backfill-snapshot-${cutoff.replace(/[:.]/g, "-")}.json`
  );
  fs.writeFileSync(durableSnapshotPath, snapshotJson);
  console.log(`Durable snapshot copy written: ${durableSnapshotPath}`);

  const scopedRows = limit ? targetRows.slice(0, limit) : targetRows;
  if (limit) console.log(`--limit ${limit}: processing only the first ${scopedRows.length} targeted packets`);

  const tasks = buildTasks(scopedRows);
  const mascotTaskCount = tasks.filter((t) => t.column === "mascot_image_url").length;
  const coloringTaskCount = tasks.filter((t) => t.column === "coloring_image_url").length;
  console.log(`Tasks: ${tasks.length} (mascot: ${mascotTaskCount}, coloring: ${coloringTaskCount})\n`);

  const results: TaskResult[] = [];
  for (let i = 0; i < tasks.length; i++) {
    const result = await processTask(supabase, tasks[i], dryRun);
    results.push(result);
    process.stdout.write(result.status === "error" ? "F" : ".");
    if ((i + 1) % 20 === 0) process.stdout.write(` ${i + 1}\n`);
  }
  console.log("\n");

  // ── Summary ──────────────────────────────────────────────────────────────
  const succeeded = results.filter((r) => r.status !== "error");
  const failed = results.filter((r) => r.status === "error");
  const webpRows = results.filter((r) => r.wasWebp);
  const totalBefore = succeeded.reduce((s, r) => s + (r.beforeBytes ?? 0), 0);
  const totalAfter = succeeded.reduce((s, r) => s + (r.afterBytes ?? 0), 0);

  console.log("=== Summary ===");
  console.log(`${dryRun ? "Would migrate" : "Migrated"}: ${succeeded.length}/${results.length}`);
  console.log(
    `  mascot: ${succeeded.filter((r) => r.column === "mascot_image_url").length}, ` +
      `coloring: ${succeeded.filter((r) => r.column === "coloring_image_url").length}`
  );
  console.log(`Failures: ${failed.length}`);
  for (const r of failed) console.log(`  - ${r.packetId} (${r.column}): ${r.error}`);
  console.log(`\nWebP source rows (converted to PNG): ${webpRows.length}`);
  for (const r of webpRows) {
    console.log(
      `  - ${r.packetId} (${r.column}): ${r.beforeBytes} -> ${r.afterBytes} bytes, status=${r.status}`
    );
  }
  console.log(`\nTotal bytes before: ${totalBefore.toLocaleString()} (${(totalBefore / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`Total bytes after:  ${totalAfter.toLocaleString()} (${(totalAfter / 1024 / 1024).toFixed(2)} MB)`);
  console.log(
    `Projected column-byte reduction: ${(totalBefore - totalAfter).toLocaleString()} bytes ` +
      `(${(100 * (1 - totalAfter / totalBefore)).toFixed(1)}%) — this is the base64-column-text reduction; ` +
      `the actual packets table (TOAST) shrinks by roughly this same order of magnitude once the base64 text ` +
      `columns are replaced with short hosted URLs, confirmed at VACUUM-FULL time, not estimated further here.`
  );

  if (dryRun) {
    console.log(`\nDRY RUN — confirmed no Storage upload and no column write occurred for any of the ${results.length} tasks above.`);
  }

  // ── Write full JSON report ────────────────────────────────────────────────
  const reportPath = path.join(
    OUT_DIR,
    `backfill-${dryRun ? "dryrun" : "live"}-${cutoff.replace(/[:.]/g, "-")}.json`
  );
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        dryRun,
        cutoff,
        packetsScanned: allRows.length,
        packetsTargeted: targetRows.length,
        tasksRun: tasks.length,
        summary: {
          succeeded: succeeded.length,
          failed: failed.length,
          totalBeforeBytes: totalBefore,
          totalAfterBytes: totalAfter,
          webpRowCount: webpRows.length,
        },
        results,
      },
      null,
      2
    )
  );
  console.log(`\nFull report: ${reportPath}`);
}

// Guarded the same way scripts/sweep-packets.ts is, and for the same
// reason: importable (e.g. to unit-test buildSnapshot/buildTasks) without
// a live Supabase connection as an import side effect.
const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  main().catch((err) => {
    console.error("Backfill failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
