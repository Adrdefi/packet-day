/**
 * One-off verification for the image Storage backfill (scripts/backfill-
 * image-storage.ts): proves every migrated packet still renders its
 * images, rather than trusting that a column holding an https URL and an
 * object existing in Storage means the render actually worked.
 *
 * Why this is necessary and not redundant with the backfill's own report:
 * react-pdf's <Image> swallows a bad src with a bare console.warn and just
 * omits it — no error, no crash, no trace (see CLAUDE.md's react-pdf
 * gotchas / resolveMascotImageForRender's header). A column and a Storage
 * object can both be exactly right and the PDF can still silently render
 * an empty box. The only real proof is counting what actually got painted.
 *
 * WHAT IT DOES
 * ------------
 * For every packet in a pre-backfill snapshot (written by
 * backfill-image-storage.ts), fetches the row fresh, renders it through
 * scripts/sweep-packets.ts's own buildProps() + PacketPDF — the exact same
 * path the fleet sweep uses, which already calls
 * resolveMascotImageForRender and resolveColoringImageForRender. This is
 * the first time those two resolve functions' https:// branch has ever
 * actually executed against real hosted URLs in this codebase's history —
 * every prior fleet sweep ran when the mascot/coloring columns were still
 * ~100% base64, so the data: pass-through branch was all that ever ran.
 *
 * Counts embedded image XObjects in the rendered PDF (sweep-packets.ts's
 * countImageXObjects — reuses its existing raw-PDF object parser) and
 * compares against the snapshot's expectedImageCount (1 or 0/1 mascot +
 * 1 or 0/1 coloring, from column non-nullness at snapshot time).
 *
 * Separately, and outside the snapshot (since neither of their columns is
 * base64, so backfill-image-storage.ts never touched them and they were
 * never in any snapshot), re-checks the 2 known dead-replicate.delivery
 * mascot rows still render 0 images — confirming their already-established
 * "renders as absent" behavior is unchanged by this backfill.
 *
 * READ-ONLY: fetches packets with a service-role client (SELECT only,
 * same as scripts/sweep-packets.ts / app/api/dev-render-packet), renders
 * in-process, writes nothing to the DB or Storage. Only touches the local
 * filesystem to write its own JSON report.
 *
 * USAGE
 * -----
 *   npm run verify-image-backfill -- --snapshot <path-to-snapshot.json>
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import fs from "fs";
import path from "path";
import PacketPDF from "../components/PacketPDF";
import type { PacketPDFProps } from "../components/PacketPDF";
import { buildProps, countImageXObjects, type PacketRow } from "./sweep-packets";

// cwd is the project root when run via `npm run verify-image-backfill`.
const DURABLE_OUT_DIR = path.join(process.cwd(), "backfill-output");

// ─── CLI args ───────────────────────────────────────────────────────────────

function parseArgs(): { snapshotPath: string } {
  const idx = process.argv.indexOf("--snapshot");
  const snapshotPath = idx === -1 ? null : process.argv[idx + 1];
  if (!snapshotPath) {
    console.error("Usage: npm run verify-image-backfill -- --snapshot <path-to-snapshot.json>");
    process.exit(1);
  }
  return { snapshotPath };
}

// ─── Supabase (service-role, read-only) ──────────────────────────────────────

function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  return createClient(url, key);
}

// ─── Snapshot shape (written by scripts/backfill-image-storage.ts) ─────────

interface SnapshotEntry {
  packetId: string;
  mascotPresent: boolean;
  coloringPresent: boolean;
  expectedImageCount: number;
  mascotState: string;
  coloringState: string;
}

interface SnapshotFile {
  cutoff: string;
  packetCount: number;
  packets: SnapshotEntry[];
}

// ─── Per-packet check ────────────────────────────────────────────────────────

interface CheckResult {
  packetId: string;
  expectedImageCount: number;
  actualImageCount: number;
  match: boolean;
  renderError: string | null;
}

async function checkPacket(supabase: SupabaseClient, entry: SnapshotEntry): Promise<CheckResult> {
  try {
    const { data: packet, error } = await supabase
      .from("packets")
      .select("*, children(avatar_emoji, special_notes)")
      .eq("id", entry.packetId)
      .single();

    if (error || !packet) {
      return {
        packetId: entry.packetId,
        expectedImageCount: entry.expectedImageCount,
        actualImageCount: -1,
        match: false,
        renderError: `fetch failed: ${error?.message ?? "not found"}`,
      };
    }

    const props = await buildProps(packet as unknown as PacketRow);
    const buf = await renderToBuffer(createElement(PacketPDF, props) as React.ReactElement<PacketPDFProps>);
    const actualImageCount = countImageXObjects(Buffer.from(buf));

    return {
      packetId: entry.packetId,
      expectedImageCount: entry.expectedImageCount,
      actualImageCount,
      match: actualImageCount === entry.expectedImageCount,
      renderError: null,
    };
  } catch (err) {
    return {
      packetId: entry.packetId,
      expectedImageCount: entry.expectedImageCount,
      actualImageCount: -1,
      match: false,
      renderError: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Control group: the 2 dead-replicate.delivery mascot rows ──────────────
// Not in any snapshot (neither column is base64, so the backfill never
// touched them) — re-checked directly here to confirm their pre-existing
// "renders as absent" behavior is unchanged.

async function checkReplicateDeliveryRows(supabase: SupabaseClient) {
  const { data: rows, error } = await supabase
    .from("packets")
    .select("*, children(avatar_emoji, special_notes)")
    .like("mascot_image_url", "%replicate.delivery%");

  if (error) {
    console.error("Failed to fetch replicate.delivery rows:", error.message);
    return [];
  }

  const results: { packetId: string; imageCount: number }[] = [];
  for (const packet of rows ?? []) {
    const props = await buildProps(packet as unknown as PacketRow);
    const buf = await renderToBuffer(createElement(PacketPDF, props) as React.ReactElement<PacketPDFProps>);
    results.push({ packetId: packet.id, imageCount: countImageXObjects(Buffer.from(buf)) });
  }
  return results;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const { snapshotPath } = parseArgs();
  const supabase = getServiceClient();

  console.log("=== Image backfill verification ===");
  console.log(`Snapshot: ${snapshotPath}`);
  console.log(
    "Rendering through scripts/sweep-packets.ts's buildProps() -> PacketPDF, which calls " +
      "resolveMascotImageForRender and resolveColoringImageForRender — the same path " +
      "app/api/generate-pdf's cache-miss route and app/api/dev-render-packet use.\n"
  );

  const snapshot: SnapshotFile = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  console.log(`Packets in snapshot: ${snapshot.packetCount}\n`);

  const results: CheckResult[] = [];
  for (let i = 0; i < snapshot.packets.length; i++) {
    const entry = snapshot.packets[i];
    const result = await checkPacket(supabase, entry);
    results.push(result);
    process.stdout.write(result.renderError ? "E" : result.match ? "." : "S");
    if ((i + 1) % 20 === 0) process.stdout.write(` ${i + 1}\n`);
  }
  console.log("\n");

  const matched = results.filter((r) => r.match);
  const short = results.filter((r) => !r.match && !r.renderError);
  const errored = results.filter((r) => r.renderError);

  console.log("=== Summary ===");
  console.log(`Total packets checked: ${results.length}`);
  console.log(`Match expected exactly: ${matched.length}`);
  console.log(`Render SHORT (actual < expected, or mismatched): ${short.length}`);
  console.log(`Render errors: ${errored.length}`);

  if (short.length > 0) {
    console.log("\n!!! SHORT RENDERS — actual image count below expected !!!");
    for (const r of short) {
      console.log(`  - ${r.packetId}: expected ${r.expectedImageCount}, got ${r.actualImageCount}`);
    }
  }
  if (errored.length > 0) {
    console.log("\nRender errors:");
    for (const r of errored) console.log(`  - ${r.packetId}: ${r.renderError}`);
  }

  // ── WebP control group — explicit before/after, known from the earlier
  // read-only investigation's direct dev-render-packet measurements ──────
  const WEBP_CONTROL = [
    { packetId: "ac44b9cb-a85b-449c-8e4e-cef6ec0ceb7b", column: "mascot", preBackfillActual: 0 },
    { packetId: "3479d19b-9d2b-42ec-afcc-1dfc7761599b", column: "coloring", preBackfillActual: 1 },
    { packetId: "ce4d9051-a77e-4620-b8fc-7c17ce1ca59c", column: "coloring", preBackfillActual: 1 },
  ];
  console.log("\n=== WebP control group (before/after) ===");
  const webpResults = WEBP_CONTROL.map((c) => {
    const r = results.find((res) => res.packetId === c.packetId);
    return { ...c, ...r };
  });
  for (const w of webpResults) {
    const improved = (w.actualImageCount ?? -1) > w.preBackfillActual;
    console.log(
      `  - ${w.packetId} (${w.column} was WebP): before=${w.preBackfillActual}, ` +
        `expected=${w.expectedImageCount}, actual=${w.actualImageCount}, ` +
        `${improved ? "IMPROVED (fix confirmed)" : "DID NOT IMPROVE — conversion may not have taken"}`
    );
  }

  // ── Replicate.delivery control group ────────────────────────────────────
  console.log("\n=== replicate.delivery control group (expected: unchanged, 0 images) ===");
  const replicateResults = await checkReplicateDeliveryRows(supabase);
  for (const r of replicateResults) {
    console.log(`  - ${r.packetId}: ${r.imageCount} images (expected 0) — ${r.imageCount === 0 ? "OK, unchanged" : "UNEXPECTED"}`);
  }

  // ── Write report ─────────────────────────────────────────────────────────
  fs.mkdirSync(DURABLE_OUT_DIR, { recursive: true });
  const reportPath = path.join(
    DURABLE_OUT_DIR,
    `verify-image-backfill-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  );
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        snapshotPath,
        checkedAt: new Date().toISOString(),
        summary: { total: results.length, matched: matched.length, short: short.length, errored: errored.length },
        results,
        webpControlGroup: webpResults,
        replicateDeliveryControlGroup: replicateResults,
      },
      null,
      2
    )
  );
  console.log(`\nFull report: ${reportPath}`);
}

main().catch((err) => {
  console.error("Verification failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
