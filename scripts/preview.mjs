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
 * Needs the Vercel CLI logged in once (`npx vercel login`). Git pushes no
 * longer build previews (vercel.json git.deploymentEnabled), so this is the
 * only way to get one.
 *
 * `vercel pull` writes the Preview env to .vercel/.env.preview.local. That
 * folder is gitignored, and this script deletes the file when it finishes,
 * whether or not the deploy worked.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();
const ENV_FILE = path.join(REPO_ROOT, ".vercel", ".env.preview.local");
const SHARE_LINK_SECONDS = 7 * 24 * 60 * 60;

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

async function main() {
  console.log("1/4 Pulling Preview settings and env...");
  vercel(["pull", "--yes", "--environment=preview"]);

  console.log("2/4 Building on this machine...");
  vercel(["build"]);

  console.log("3/4 Uploading the prebuilt output...");
  const deployOutput = vercel(["deploy", "--prebuilt"], { capture: true });
  const url = deployOutput.split(/\s+/).find((word) => /^https:\/\/\S+\.vercel\.app$/.test(word));
  if (!url) throw new Error(`Couldn't find the preview URL in the deploy output:\n${deployOutput}`);

  console.log("4/4 Making a share link...");
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

try {
  await main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  if (existsSync(ENV_FILE)) rmSync(ENV_FILE);
}
