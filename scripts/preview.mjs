/**
 * Makes a Vercel preview of this folder on demand. Git pushes never build
 * previews (vercel.json git.deploymentEnabled builds only main), so this is
 * the way to get one. It uploads the working folder (including uncommitted
 * changes) with `vercel deploy`, Vercel builds it, and the script prints the
 * preview URL and a share link that opens it without a Vercel login.
 *
 * USAGE:
 *   npm run preview                 share link opens the home page
 *   npm run preview -- /sample      share link opens /sample
 *
 * Needs the Vercel CLI logged in once (`npx vercel login`).
 *
 * Secret safety:
 * - .vercelignore mirrors .gitignore, so .env.local and every other file git
 *   keeps out of the public repo is never uploaded.
 * - Previews must never have Stripe keys or price IDs. Before deploying, the
 *   script lists the Preview env variable names (never values) and stops if
 *   any STRIPE variable is there.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();
const SHARE_LINK_SECONDS = 7 * 24 * 60 * 60;

// Git Bash on Windows rewrites "/sample" into "C:/Program Files/Git/sample"
// before node sees it, so undo that, and accept "sample" without a slash too.
function sharePathFrom(arg) {
  if (!arg) return "/";
  const msys = arg.match(/^[A-Za-z]:[\\/].*?[\\/]Git[\\/](.*)$/);
  const raw = msys ? msys[1] : arg;
  return `/${raw.replace(/^[\\/]+/, "").replace(/\\/g, "/")}`;
}
const sharePath = sharePathFrom(process.argv.slice(2).filter((arg) => arg !== "--")[0]);

/**
 * Runs the Vercel CLI and returns stdout plus stderr (deploy prints its URL
 * on stderr when it isn't a TTY). Progress still shows on screen.
 */
function vercel(cliArgs) {
  const result = spawnSync("npx", ["--no-install", "vercel", ...cliArgs], {
    cwd: REPO_ROOT,
    shell: process.platform === "win32",
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
  });
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) throw new Error(`vercel ${cliArgs[0]} failed (exit ${result.status}).`);
  return { stdout: result.stdout.trim(), all: `${result.stdout}\n${result.stderr}` };
}

function linkedProject() {
  return JSON.parse(readFileSync(path.join(REPO_ROOT, ".vercel", "project.json"), "utf8"));
}

async function main() {
  const { orgId, projectId } = linkedProject();

  console.log("1/3 Checking Preview has no Stripe variables...");
  const envList = JSON.parse(vercel(["api", `/v10/projects/${projectId}/env?teamId=${orgId}`, "--raw"]).stdout);
  const stripeInPreview = envList.envs
    .filter((e) => e.target?.includes("preview") && e.key.includes("STRIPE"))
    .map((e) => e.key);
  if (stripeInPreview.length) {
    throw new Error(
      `Stopped before deploying. Preview has Stripe variables (${stripeInPreview.join(", ")}). ` +
        "Previews must never have Stripe keys or price IDs, so take Preview off them in Vercel first.",
    );
  }

  console.log("2/3 Deploying to Vercel (it builds this folder)...");
  const deployOutput = vercel(["deploy", "--yes"]).all.replace(/\x1b\[[0-9;]*[A-Za-z]/g, " ");
  const url = deployOutput.match(/https:\/\/[a-z0-9-]+\.vercel\.app/)?.[0];
  if (!url) throw new Error("Couldn't find the preview URL in the deploy output.");

  console.log("3/3 Making a share link...");
  const deploymentId = JSON.parse(vercel(["inspect", url, "--json"]).stdout).id;
  const bypass = JSON.parse(
    vercel([
      "api",
      `/aliases/${deploymentId}/protection-bypass?teamId=${orgId}`,
      "-X",
      "PATCH",
      "-F",
      `ttl=${SHARE_LINK_SECONDS}`,
      "--raw",
    ]).stdout,
  );
  // The reply maps each bypass token to its details; the share link is the
  // one scoped "shareable-link".
  const token =
    Object.entries(bypass.protectionBypass ?? {}).find(([, info]) => info?.scope === "shareable-link")?.[0] ?? null;

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
}
