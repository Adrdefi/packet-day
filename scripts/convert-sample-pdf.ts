/**
 * One-time conversion script for the public /sample page.
 *
 * Rasterizes each page of a local source PDF to a web-resolution PNG and
 * writes them to public/sample/page-NN.png. This is a manual dev tool, not
 * a route. Run it by hand whenever the sample packet needs updating.
 *
 * USAGE:
 *   npm run convert-sample -- <path-to-pdf> [--out <folder>]
 *   npm run convert-sample -- Noah-Grand-Canyon-Design-CleanedUp.pdf
 *
 * --out writes somewhere other than public/sample/ (handy for checking the
 * output without touching the live sample pages).
 *
 * Rendering lives in scripts/lib/rasterize-pdf.ts, shared with
 * scripts/ingest-unit-study.ts: pages are TARGET_WIDTH_PX wide, sized for
 * sharp on-screen mobile viewing, not print. Output is palette-quantized
 * PNG via sharp to keep per-page size down; final sizes are reported so the
 * caller can eyeball whether further compression is worth it before
 * committing.
 */

import path from "node:path";
import { loadPdf, rasterizePdf } from "./lib/rasterize-pdf";

// process.cwd() is the repo root when run through npm; see the note in
// scripts/lib/rasterize-pdf.ts about why import.meta.url can't be used.
const REPO_ROOT = process.cwd();

function resolveFromRoot(p: string): string {
  return path.isAbsolute(p) ? p : path.join(REPO_ROOT, p);
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const outIndex = args.indexOf("--out");
  const outArg = outIndex === -1 ? undefined : args[outIndex + 1];
  if (outIndex !== -1 && !outArg) {
    console.error("--out needs a folder path.");
    process.exit(1);
  }
  const inputArg = args.find(
    (arg, i) => !arg.startsWith("--") && !(outIndex !== -1 && i === outIndex + 1),
  );

  if (!inputArg) {
    console.error(
      "Usage: npm run convert-sample -- <path-to-pdf> [--out <folder>]\n" +
        "  (paths can be absolute, or relative to the repo root)",
    );
    process.exit(1);
  }
  const inputPath = resolveFromRoot(inputArg);
  const outputDir = outArg ? resolveFromRoot(outArg) : path.join(REPO_ROOT, "public", "sample");
  const outputLabel = outArg ? path.relative(REPO_ROOT, outputDir) || outputDir : "public/sample";

  const doc = await loadPdf(inputPath);
  console.log(`Loaded "${path.basename(inputPath)}" — ${doc.numPages} pages.`);

  const pages = await rasterizePdf(doc, outputDir, (page) => {
    console.log(
      `  ${page.filename}  ${(page.bytes / 1024).toFixed(0)} KB` +
        ` (raw ${(page.rawBytes / 1024).toFixed(0)} KB)`,
    );
  });

  const totalFinalBytes = pages.reduce((sum, page) => sum + page.bytes, 0);
  const totalRawBytes = pages.reduce((sum, page) => sum + page.rawBytes, 0);

  console.log("");
  console.log(`Done. ${pages.length} pages written to ${outputLabel}/.`);
  console.log(
    `Total: ${(totalFinalBytes / 1024 / 1024).toFixed(2)} MB` +
      ` (raw canvas output was ${(totalRawBytes / 1024 / 1024).toFixed(2)} MB)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
