/**
 * Makes a Vercel preview without using Vercel build minutes: pulls the
 * Preview settings and env, builds on this machine, and uploads the
 * prebuilt output. Prints the preview URL and a share link that opens it
 * without a Vercel login.
 *
 * USAGE:
 *   npm run preview                 share link opens the home page
 *   npm run preview -- /sample      share link opens /sample
 *
 * Needs the Vercel CLI logged in once (`npx vercel login`) and, on Windows,
 * Developer Mode on (vercel build creates symlinks). Git pushes no longer
 * build previews (vercel.json git.deploymentEnabled), so this is the only
 * way to get one.
 *
 * Secret safety, in order:
 * 1. .env.local is set aside for the whole run so Next.js can't read local
 *    values into the build. It is always put back: in `finally`, on Ctrl+C,
 *    and at the start of the next run if a crash left it set aside.
 * 2. Every STRIPE_ value is removed from the pulled Preview env before the
 *    build, so no Stripe key or price ID is baked into the output.
 * 3. After the build, the output is scanned for live Stripe keys and for any
 *    value that only .env.local has. Any hit stops the run before upload.
 * 4. The deployed preview's server code gets Vercel's Preview env at run
 *    time, whatever we build. If that env holds a live Stripe key, the run
 *    stops before upload. Fix it in Vercel (test keys, or none) first.
 * The pulled env file (.vercel/.env.preview.local, gitignored) is deleted
 * when the run ends, whether or not it worked.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();
const PULLED_ENV = path.join(REPO_ROOT, ".vercel", ".env.preview.local");
const OUTPUT_DIR = path.join(REPO_ROOT, ".vercel", "output");
const LOCAL_ENV = path.join(REPO_ROOT, ".env.local");
const LOCAL_ENV_ASIDE = path.join(REPO_ROOT, ".env.local.preview-set-aside");
const SHARE_LINK_SECONDS = 7 * 24 * 60 * 60;
const LIVE_STRIPE = /\b(sk_live_|rk_live_|pk_live_)/;

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const sharePath = args[0]?.startsWith("/") ? args[0] : "/";

function vercel(cliArgs, { capture = false } = {}) {
  const result = spawnSync("npx", ["--no-install", "vercel", ...cliArgs], {
    cwd: REPO_ROOT,
    shell: process.platform === "win32",
    encoding: "utf8",
    stdio: capture ? ["inherit", "pipe", "inherit"] : "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`vercel ${cliArgs[0]} failed (exit ${result.status}).`);
  }
  return capture ? result.stdout.trim() : "";
}

function teamId() {
  const project = JSON.parse(readFileSync(path.join(REPO_ROOT, ".vercel", "project.json"), "utf8"));
  return project.orgId;
}

/** KEY=value pairs from a dotenv file, quotes and trailing # comments stripped. */
function readEnv(file) {
  const out = new Map();
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (/^["']/.test(value)) value = value.slice(1, value.indexOf(value[0], 1));
    else value = value.replace(/\s+#.*$/, "");
    out.set(m[1], value);
  }
  return out;
}

function restoreLocalEnv() {
  if (existsSync(LOCAL_ENV_ASIDE) && !existsSync(LOCAL_ENV)) renameSync(LOCAL_ENV_ASIDE, LOCAL_ENV);
}

function setAsideLocalEnv() {
  if (existsSync(LOCAL_ENV_ASIDE)) {
    if (existsSync(LOCAL_ENV)) {
      throw new Error(`Both .env.local and ${path.basename(LOCAL_ENV_ASIDE)} exist. Sort that out by hand first.`);
    }
    restoreLocalEnv();
  }
  if (existsSync(LOCAL_ENV)) renameSync(LOCAL_ENV, LOCAL_ENV_ASIDE);
}

function* textFiles(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = statSync(full, { throwIfNoEntry: false });
    if (!stat) continue;
    if (stat.isDirectory()) yield* textFiles(full);
    else if (stat.size < 20 * 1024 * 1024 && /\.(js|mjs|cjs|json|html|rsc|txt|map|css|body|meta)$/.test(name)) yield full;
  }
}

/** Names of the leaks found in the build output (never the values). */
function scanOutput(localOnly) {
  const hits = new Set();
  for (const file of textFiles(OUTPUT_DIR)) {
    const text = readFileSync(file, "utf8");
    if (LIVE_STRIPE.test(text)) hits.add(`a live Stripe key (in ${path.relative(REPO_ROOT, file)})`);
    for (const [key, value] of localOnly) {
      if (text.includes(value)) hits.add(`${key} from .env.local (in ${path.relative(REPO_ROOT, file)})`);
    }
  }
  return [...hits];
}

async function main() {
  // Read .env.local's values first, so the scan can look for them later.
  const localEnv = existsSync(LOCAL_ENV)
    ? readEnv(LOCAL_ENV)
    : existsSync(LOCAL_ENV_ASIDE)
      ? readEnv(LOCAL_ENV_ASIDE)
      : new Map();
  setAsideLocalEnv();

  console.log("1/5 Pulling Preview settings and env...");
  vercel(["pull", "--yes", "--environment=preview"]);
  const previewEnv = readEnv(PULLED_ENV);
  const liveStripeInVercel = [...previewEnv].some(([key, value]) => key.includes("STRIPE") && LIVE_STRIPE.test(value));
  const kept = readFileSync(PULLED_ENV, "utf8")
    .split(/\r?\n/)
    .filter((line) => !/^\s*[A-Za-z0-9_]*STRIPE[A-Za-z0-9_]*\s*=/.test(line));
  writeFileSync(PULLED_ENV, kept.join("\n"));

  console.log("2/5 Building on this machine (.env.local set aside, Stripe values removed)...");
  vercel(["build"]);

  console.log("3/5 Checking the build output for leaked secrets...");
  const previewValues = new Set(previewEnv.values());
  const localOnly = [...localEnv].filter(([, value]) => value.length >= 12 && !previewValues.has(value));
  const leaks = scanOutput(localOnly);
  if (leaks.length) throw new Error(`Stopped before upload. Found ${leaks.join("; ")}.`);
  console.log(`   Clean: no live Stripe keys and none of ${localOnly.length} .env.local only values.`);

  if (liveStripeInVercel) {
    throw new Error(
      "Stopped before upload. Vercel's Preview env holds a live Stripe key, and a deployed preview's server code " +
        "reads that env at run time. Switch Preview's STRIPE_ values to test keys (or remove them) in Vercel first.",
    );
  }

  console.log("4/5 Uploading the prebuilt output...");
  const deployOutput = vercel(["deploy", "--prebuilt"], { capture: true });
  const url = deployOutput.split(/\s+/).find((word) => /^https:\/\/\S+\.vercel\.app$/.test(word));
  if (!url) throw new Error(`Couldn't find the preview URL in the deploy output:\n${deployOutput}`);

  console.log("5/5 Making a share link...");
  const inspect = JSON.parse(vercel(["inspect", url, "--json"], { capture: true }));
  const deploymentId = inspect.id ?? inspect.uid;
  const bypass = JSON.parse(
    vercel(
      ["api", `/aliases/${deploymentId}/protection-bypass?teamId=${teamId()}`, "-X", "PATCH", "-F", `ttl=${SHARE_LINK_SECONDS}`, "--raw"],
      { capture: true },
    ),
  );
  const token = typeof bypass.value === "string" ? bypass.value : null;

  console.log("");
  console.log(`Preview URL: ${url}`);
  if (token) {
    console.log(`Share link (no Vercel login, works for 7 days): ${url}${sharePath}?_vercel_share=${token}`);
  } else {
    console.log("Couldn't make a share link. The preview URL still works for anyone logged in to Vercel.");
  }
}

function cleanUp() {
  restoreLocalEnv();
  if (existsSync(PULLED_ENV)) rmSync(PULLED_ENV);
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => {
    cleanUp();
    process.exit(130);
  });
}

try {
  await main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  cleanUp();
}
