#!/usr/bin/env node
/**
 * Compiles a TypeScript/TSX script with esbuild (bundling its relative
 * imports, leaving node_modules packages as native runtime imports) to a
 * temp ESM file, then runs that file with plain, unmodified node.
 *
 * WHY THIS EXISTS instead of `tsx` or `ts-node`: on this project's Node
 * version (24.14.1, and confirmed across every tsx release from 4.0.0
 * through the current 4.23.13 — the tsx version is not the variable),
 * `npx tsx` fails on any script that imports @react-pdf/renderer, with
 * `ERR_PACKAGE_PATH_NOT_EXPORTED` on @react-pdf/hyphenate's `/en-us`
 * subpath. Root cause: @react-pdf/hyphenate is pure ESM (its package.json
 * exports map defines only an `import` condition, no `require`), and tsx
 * always installs a CJS require-hook — confirmed via `--import tsx` too,
 * not just the tsx CLI wrapper — that routes ALL module resolution
 * (including resolution triggered from deep inside an already-ESM import
 * chain) through Node's CJS `resolveExports`, which correctly rejects a
 * package with no `require` condition. This is inherent to how tsx's
 * require-patching works, not a version regression.
 *
 * Plain native Node resolves the same import correctly (confirmed
 * directly) because it never routes through CJS resolution — but native
 * Node's own TypeScript support (--experimental-strip-types) is
 * erasure-only and cannot transform JSX, which components/PacketPDF.tsx
 * uses throughout. So: use esbuild (already a transitive dependency of
 * this project's own toolchain, pinned here as a direct devDependency so
 * that stays true on purpose) to do the actual JSX/TS transform ahead of
 * time, producing a plain ESM file with no remaining TS/JSX syntax, then
 * hand that to plain node — no tsx, no require-hook, no CJS resolution of
 * anything.
 *
 * USAGE (see package.json's "script" and "sweep" scripts for the short
 * forms):
 *   node scripts/run-ts.mjs <path-to-ts-file> [-- <args for that script>]
 *
 * A script run this way should treat itself as ESM: no `__dirname` or
 * `require.main === module` (see components/../scripts/sweep-packets.ts's
 * isMainModule check and __dirnameEsm for the pattern to follow).
 */

import { build } from "esbuild";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import path from "node:path";

const [, , targetArg, ...scriptArgs] = process.argv;
if (!targetArg) {
  console.error("Usage: node scripts/run-ts.mjs <path-to-ts-file> [-- <script args>]");
  process.exit(1);
}

const target = path.resolve(process.cwd(), targetArg);
// Compiled output MUST live somewhere Node's node_modules resolution walk
// finds this project's real node_modules (externalized packages like
// @supabase/supabase-js still need to resolve at runtime) — the OS temp dir
// (os.tmpdir()) is outside that walk entirely and fails with
// ERR_MODULE_NOT_FOUND. node_modules/.cache/ satisfies it directly.
const cacheRoot = path.join(process.cwd(), "node_modules", ".cache", "run-ts");
mkdirSync(cacheRoot, { recursive: true });
const tmpDir = mkdtempSync(path.join(cacheRoot, "build-"));
const outFile = path.join(tmpDir, `${path.basename(target).replace(/\.[^.]+$/, "")}.mjs`);

try {
  await build({
    entryPoints: [target],
    bundle: true,
    platform: "node",
    format: "esm",
    packages: "external", // node_modules stay real runtime imports — only our own relative-import files get bundled/transformed
    outfile: outFile,
    logLevel: "warning",
  });
} catch (err) {
  console.error("esbuild compile failed:", err instanceof Error ? err.message : err);
  rmSync(tmpDir, { recursive: true, force: true });
  process.exit(1);
}

const child = spawn(process.execPath, [outFile, ...scriptArgs], { stdio: "inherit" });
child.on("exit", (code) => {
  rmSync(tmpDir, { recursive: true, force: true });
  process.exit(code ?? 1);
});
