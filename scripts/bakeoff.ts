/**
 * Model bakeoff: generate a real packet through the local dev server on
 * whatever model it's running, save the PDF, and report the cost.
 *
 * One run per dev-server start, because the model is picked when the
 * server boots:
 *
 *   1. BAKEOFF_MODEL=claude-sonnet-5 npm run dev      (unset = production model)
 *   2. BAKEOFF_EMAIL=... BAKEOFF_PASSWORD=... npm run bakeoff -- run --label sonnet-5
 *   3. Stop the dev server, repeat 1-2 for each model.
 *   4. npm run bakeoff -- blind          (shuffles into Packet_A.pdf, B, C... + key)
 *
 * Options for `run`: --label (required), --child <child id>, --theme,
 * --length half|full, --out <folder>. Defaults match round 1: Oliver
 * (grade 5) on the account you log in as, "Ancient Egypt", full length.
 *
 * Output goes to model-bakeoff-<date>/ by default, which .gitignore keeps
 * out of git (the PDFs carry a child's name, and the repo is public).
 * Login uses the account's own email and password from the shell, never
 * the service role key. Each run also sends that account the normal
 * packet-ready email and counts toward its monthly packets.
 */

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";

const BASE_URL = "http://localhost:3000";
const DEFAULT_CHILD_ID = "1021568a-9749-4bff-bb6a-bb8217420d30"; // Oliver, grade 5
const DEFAULT_THEME = "Ancient Egypt";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} before running the bakeoff.`);
  return value;
}

const outDir = path.resolve(
  arg("out") ?? `model-bakeoff-${new Date().toISOString().slice(0, 10)}`
);

async function logIn(): Promise<string> {
  const jar = new Map<string, string>();
  const supabase = createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll: () => [...jar].map(([name, value]) => ({ name, value })),
        setAll: (list) =>
          list.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
      },
    }
  );
  const { error } = await supabase.auth.signInWithPassword({
    email: requireEnv("BAKEOFF_EMAIL"),
    password: requireEnv("BAKEOFF_PASSWORD"),
  });
  if (error) throw new Error(`Login failed: ${error.message}`);
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function run() {
  const label = arg("label");
  if (!label) throw new Error("Pass --label, e.g. --label sonnet-5");
  const packetLength = arg("length") ?? "full";
  const cookie = await logIn();

  const startMs = Date.now();
  const res = await fetch(`${BASE_URL}/api/generate-packet`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      childId: arg("child") ?? DEFAULT_CHILD_ID,
      theme: arg("theme") ?? DEFAULT_THEME,
      packetLength,
      clientRequestId: randomUUID(),
    }),
  });
  if (!res.ok || !res.body) throw new Error(`generate-packet HTTP ${res.status}: ${await res.text()}`);

  // Read the SSE stream until the route reports complete or error.
  let buffer = "";
  let packetId: string | null = null;
  let errorMessage: string | null = null;
  const decoder = new TextDecoder();
  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(chunk, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      if (!raw.startsWith("data: ")) continue;
      const event = JSON.parse(raw.slice(6));
      if (event.type === "complete") packetId = event.packet.id;
      if (event.type === "error") errorMessage = event.message;
    }
  }
  const totalMs = Date.now() - startMs;
  if (!packetId) throw new Error(`Generation failed: ${errorMessage ?? "no complete event"}`);

  const pdfRes = await fetch(`${BASE_URL}/api/generate-pdf?packetId=${packetId}`, {
    headers: { Cookie: cookie },
  });
  if (!pdfRes.ok) throw new Error(`generate-pdf HTTP ${pdfRes.status}`);
  const pdf = Buffer.from(await pdfRes.arrayBuffer());

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${label}.pdf`), pdf);
  const result = { label, packetId, totalMs };
  fs.writeFileSync(path.join(outDir, `${label}.json`), JSON.stringify(result, null, 2));

  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.stdout.write(
    `Cost and tokens: select * from packet_ai_usage where packet_id = '${packetId}';\n` +
      "Check its claude_model matches the model you meant to test.\n"
  );
}

function blind() {
  const labels = fs
    .readdirSync(outDir)
    .filter((f) => f.endsWith(".pdf") && !f.startsWith("Packet_"))
    .map((f) => f.slice(0, -4));
  if (labels.length === 0) throw new Error(`No labeled PDFs in ${outDir}`);

  // Fisher-Yates shuffle
  for (let i = labels.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [labels[i], labels[j]] = [labels[j], labels[i]];
  }

  const keyLines = [`Model bakeoff key (${new Date().toISOString().slice(0, 10)})`];
  labels.forEach((label, i) => {
    const letter = String.fromCharCode(65 + i);
    fs.renameSync(path.join(outDir, `${label}.pdf`), path.join(outDir, `Packet_${letter}.pdf`));
    // Fold the run details into the key so no model-named file is left beside the PDFs.
    const jsonPath = path.join(outDir, `${label}.json`);
    const details = fs.existsSync(jsonPath) ? fs.readFileSync(jsonPath, "utf8").replace(/\s+/g, " ") : "";
    if (details) fs.unlinkSync(jsonPath);
    keyLines.push(`Packet_${letter}.pdf = ${label} ${details}`.trim());
  });
  fs.writeFileSync(path.join(outDir, "KEY_do_not_open.txt"), `${keyLines.join("\n")}\n`);
  process.stdout.write(`Lettered ${labels.length} PDFs in ${outDir}\n`);
}

const command = process.argv[2];
const main = command === "run" ? run : command === "blind" ? async () => blind() : null;
if (!main) {
  process.stderr.write("Usage: npm run bakeoff -- run --label <name> | blind\n");
  process.exit(1);
}
main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
