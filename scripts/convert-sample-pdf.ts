/**
 * One-time conversion script for the public /sample page.
 *
 * Rasterizes each page of a local source PDF to a web-resolution PNG and
 * writes them to public/sample/page-NN.png. This is a manual dev tool, not
 * a route — run it by hand whenever the sample packet needs updating.
 *
 * USAGE:
 *   npm run convert-sample -- <path-to-pdf>
 *   npm run convert-sample -- Noah-Grand-Canyon-Design-CleanedUp.pdf
 *
 * Resolution: pages are rendered at TARGET_WIDTH_PX (see below) — sized for
 * sharp on-screen mobile viewing, not print. Output is palette-quantized
 * PNG via sharp to keep per-page size down; final sizes are reported so the
 * caller can eyeball whether further compression is worth it before
 * committing.
 */

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

// NOTE: this script is compiled by scripts/run-ts.mjs (esbuild) to a temp
// file under node_modules/.cache/run-ts/ before being run, so
// import.meta.url points at that temp location, not this file's real path —
// confirmed empirically, not an assumption. process.cwd() (the repo root,
// since npm scripts run from there) is the only reliable anchor here.
const REPO_ROOT = process.cwd();
const OUTPUT_DIR = path.join(REPO_ROOT, "public", "sample");

// Render width in CSS px. Chosen so the page stays sharp up to ~2.5x device
// pixel ratio at a ~480px-wide mobile column (this route's primary
// audience), and next/image's optimizer can still downscale per-viewport in
// production. Well below print DPI (300 DPI on 8.5x11in would be
// 2550x3300px — over 4x the pixel count here).
const TARGET_WIDTH_PX = 1200;

const workerPath = path.join(
  REPO_ROOT,
  "node_modules",
  "pdfjs-dist",
  "legacy",
  "build",
  "pdf.worker.mjs",
);
pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

class NodeCanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    return { canvas, context };
  }
  reset(
    canvasAndContext: { canvas: ReturnType<typeof createCanvas> },
    width: number,
    height: number,
  ) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }
  destroy(canvasAndContext: {
    canvas: ReturnType<typeof createCanvas> | null;
    context: SKRSContext2D | null;
  }) {
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

async function main() {
  const inputArg = process.argv[2];
  if (!inputArg) {
    console.error(
      "Usage: npm run convert-sample -- <path-to-pdf>\n" +
        "  (path can be absolute, or relative to the repo root)",
    );
    process.exit(1);
  }
  const inputPath = path.isAbsolute(inputArg)
    ? inputArg
    : path.join(REPO_ROOT, inputArg);

  const pdfBytes = await readFile(inputPath);
  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBytes),
    // pdfjs instantiates this itself (`new CanvasFactory(...)`) — pass the
    // class, not an instance.
    CanvasFactory: NodeCanvasFactory,
  }).promise;

  console.log(`Loaded "${path.basename(inputPath)}" — ${doc.numPages} pages.`);

  await mkdir(OUTPUT_DIR, { recursive: true });

  const pageCount = doc.numPages;
  const padWidth = String(pageCount).length < 2 ? 2 : String(pageCount).length;

  let totalRawBytes = 0;
  let totalFinalBytes = 0;

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await doc.getPage(pageNum);
    const unscaledViewport = page.getViewport({ scale: 1 });
    const scale = TARGET_WIDTH_PX / unscaledViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = createCanvas(
      Math.round(viewport.width),
      Math.round(viewport.height),
    );
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      // @napi-rs/canvas's Canvas/context are API-compatible with the DOM
      // surfaces pdf.js expects here. The document's CanvasFactory (set at
      // getDocument()) covers rendering internals — no per-call factory
      // option exists on RenderParameters.
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    const rawPng = await canvas.encode("png");
    totalRawBytes += rawPng.length;

    const finalPng = await sharp(rawPng)
      .flatten({ background: "#ffffff" })
      .png({ palette: true, compressionLevel: 9, effort: 10 })
      .toBuffer();
    totalFinalBytes += finalPng.length;

    const filename = `page-${String(pageNum).padStart(padWidth, "0")}.png`;
    await writeFile(path.join(OUTPUT_DIR, filename), finalPng);
    console.log(
      `  ${filename}  ${(finalPng.length / 1024).toFixed(0)} KB` +
        ` (raw ${(rawPng.length / 1024).toFixed(0)} KB)`,
    );
  }

  console.log("");
  console.log(`Done. ${pageCount} pages written to public/sample/.`);
  console.log(
    `Total: ${(totalFinalBytes / 1024 / 1024).toFixed(2)} MB` +
      ` (raw canvas output was ${(totalRawBytes / 1024 / 1024).toFixed(2)} MB)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
