/**
 * Tells IndexNow (Bing, Yandex and others) which www.packetday.com pages changed.
 *
 *   npm run indexnow -- <url> <url> ...          submit specific URLs
 *   npm run indexnow -- --all                    submit every URL in the live sitemap
 *   npm run indexnow -- --changed-since <sha> [--head <sha>]
 *                                                submit pages whose source files changed
 *                                                between two commits (used by
 *                                                .github/workflows/indexnow.yml)
 *   add --dry-run to any of these to print the URLs without submitting
 *
 * Before submitting, it checks the live key file matches INDEXNOW_KEY, since
 * IndexNow rejects submissions it can't verify. Exits non-zero unless
 * IndexNow answers 200 or 202. No secrets: the key is public by design.
 */
import { execFileSync } from "node:child_process";
import { SITE_URL } from "../lib/site";
import { INDEXNOW_ENDPOINT, INDEXNOW_HOST, INDEXNOW_KEY, INDEXNOW_KEY_LOCATION } from "../lib/indexnow";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function fetchSitemapUrls(): Promise<string[]> {
  const response = await fetch(`${SITE_URL}/sitemap.xml`);
  if (!response.ok) fail(`Couldn't load ${SITE_URL}/sitemap.xml (HTTP ${response.status}).`);
  const xml = await response.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
}

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" });
}

function existsAt(ref: string, path: string): boolean {
  try {
    execFileSync("git", ["cat-file", "-e", `${ref}:${path}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Is this component imported by the homepage and nothing else? Deliberately
 * conservative: any other file that mentions a path ending in the same file
 * name counts as another importer, so a shared component is always skipped.
 */
function isHomepageOnlyComponent(ref: string, filePath: string): boolean {
  const baseName = filePath.split("/").pop()!.replace(/\.(tsx|ts)$/, "");
  let importers: string[] = [];
  try {
    importers = git(["grep", "-l", "-E", `["'][^"']*/${baseName}["']`, ref, "--", "*.ts", "*.tsx"])
      .split("\n")
      .filter(Boolean)
      .map((line) => line.slice(ref.length + 1));
  } catch {
    // git grep exits 1 when nothing matches: no importers at all.
  }
  return importers.length === 1 && importers[0] === "app/page.tsx";
}

/** Maps changed files between two commits to page paths. Skips anything that doesn't map cleanly. */
function changedPaths(base: string, head: string): Set<string> {
  const diff = git(["diff", "--name-status", "--no-renames", base, head]);
  const paths = new Set<string>();

  for (const line of diff.split("\n").filter(Boolean)) {
    const [status, file] = line.split("\t");
    let mapped: string[] = [];

    const blogPost = file.match(/^content\/blog\/([a-z0-9-]+)\.md$/);
    const situationData = file.match(/^lib\/situations\/([a-z0-9-]+)\.ts$/);
    const topLevelPage = file.match(/^app\/([a-z0-9-]+)\/page\.tsx$/);

    if (blogPost) {
      mapped = [`/blog/${blogPost[1]}`];
      // A new or removed post changes the blog list too.
      if (status === "A" || status === "D") mapped.push("/blog");
    } else if (situationData && existsAt(head, `app/${situationData[1]}/page.tsx`)) {
      mapped = [`/${situationData[1]}`];
    } else if (file === "app/page.tsx") {
      mapped = ["/"];
    } else if (topLevelPage) {
      mapped = [`/${topLevelPage[1]}`];
    } else if (file.startsWith("components/") && status !== "D" && isHomepageOnlyComponent(head, file)) {
      mapped = ["/"];
    }

    console.log(`  ${status} ${file}${mapped.length ? ` -> ${mapped.join(", ")}` : "  (skipped)"}`);
    mapped.forEach((path) => paths.add(path));
  }

  return paths;
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const dryRun = args.includes("--dry-run");
  const flagValue = (flag: string) => {
    const index = args.indexOf(flag);
    return index === -1 ? undefined : args[index + 1];
  };

  let urlList: string[];

  if (args.includes("--all")) {
    urlList = await fetchSitemapUrls();
  } else if (args.includes("--changed-since")) {
    const base = flagValue("--changed-since");
    const head = flagValue("--head") ?? "HEAD";
    if (!base) fail("--changed-since needs a commit.");
    console.log(`Files changed between ${base} and ${head}:`);
    const paths = changedPaths(base, head);
    // Only pages the live sitemap lists: keeps private or retired routes out.
    const sitemapUrls = new Set(await fetchSitemapUrls());
    urlList = [];
    for (const path of paths) {
      const url = path === "/" ? SITE_URL : `${SITE_URL}${path}`;
      if (sitemapUrls.has(url)) urlList.push(url);
      else console.log(`  ${url} is not in the live sitemap, so it won't be submitted`);
    }
  } else {
    urlList = args.filter((arg) => !arg.startsWith("--"));
    if (urlList.length === 0) {
      fail("Usage: npm run indexnow -- <url> ... | --all | --changed-since <sha> [--head <sha>]  [--dry-run]");
    }
  }

  for (const url of urlList) {
    let host: string;
    try {
      host = new URL(url).host;
    } catch {
      fail(`Not a full URL: ${url}`);
    }
    if (host !== INDEXNOW_HOST) fail(`${url} isn't on ${INDEXNOW_HOST}. IndexNow only accepts URLs on the key's host.`);
  }

  if (urlList.length === 0) {
    console.log("Nothing to submit.");
    return;
  }

  console.log(`\nURLs (${urlList.length}):`);
  urlList.forEach((url) => console.log(`  ${url}`));

  if (dryRun) {
    console.log("\nDry run: nothing submitted.");
    return;
  }

  const keyResponse = await fetch(INDEXNOW_KEY_LOCATION);
  const keyBody = keyResponse.ok ? (await keyResponse.text()).trim() : "";
  if (keyBody !== INDEXNOW_KEY) {
    fail(`The live key file ${INDEXNOW_KEY_LOCATION} doesn't match INDEXNOW_KEY (HTTP ${keyResponse.status}). Deploy it first.`);
  }

  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: INDEXNOW_HOST,
      key: INDEXNOW_KEY,
      keyLocation: INDEXNOW_KEY_LOCATION,
      urlList,
    }),
  });
  const body = await response.text();

  console.log(`\nIndexNow responded HTTP ${response.status}${body ? `: ${body}` : ""}`);
  if (response.status !== 200 && response.status !== 202) process.exit(1);
}

main().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));
