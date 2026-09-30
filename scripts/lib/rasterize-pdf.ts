/**
 * Shared PDF helpers for the one-off dev scripts (convert-sample-pdf.ts,
 * ingest-unit-study.ts). Loads a PDF with pdfjs-dist and rasterizes every
 * page to a web-resolution, palette-quantized PNG.
 *
 * Settings are the ones /sample was built with: TARGET_WIDTH_PX wide, white
 * background, sharp PNG with palette: true, compressionLevel 9, effort 10.
 */

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

// NOTE: scripts are compiled by scripts/run-ts.mjs (esbuild) to a temp file
// under node_modules/.cache/run-ts/ before being run, so import.meta.url
// points at that temp location, not this file's real path. process.cwd()
// (the repo root, since npm scripts run from there) is the only reliable
// anchor here.
const REPO_ROOT = process.cwd();

// Render width in CSS px. Chosen so the page stays sharp up to ~2.5x device
// pixel ratio at a ~480px-wide mobile column, and next/image's optimizer can
// still downscale per-viewport in production. Well below print DPI (300 DPI
// on 8.5x11in would be 2550x3300px, over 4x the pixel count here).
export const TARGET_WIDTH_PX = 1200;

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

export type PdfDocument = Awaited<ReturnType<typeof pdfjsLib.getDocument>["promise"]>;

export async function loadPdf(pdfPath: string): Promise<PdfDocument> {
  const pdfBytes = await readFile(pdfPath);
  return pdfjsLib.getDocument({
    data: new Uint8Array(pdfBytes),
    // pdfjs instantiates this itself (`new CanvasFactory(...)`), so pass the
    // class, not an instance.
    CanvasFactory: NodeCanvasFactory,
    verbosity: 0,
  }).promise;
}

export interface RasterizedPage {
  pageNumber: number;
  filename: string;
  width: number;
  height: number;
  bytes: number;
  rawBytes: number;
}

/**
 * Writes every page of `doc` to `outputDir` as page-NN.png (zero padded to at
 * least two digits) and reports each page's real pixel size and file size.
 */
export async function rasterizePdf(
  doc: PdfDocument,
  outputDir: string,
  onPage?: (page: RasterizedPage) => void,
): Promise<RasterizedPage[]> {
  await mkdir(outputDir, { recursive: true });

  const pageCount = doc.numPages;
  const padWidth = String(pageCount).length < 2 ? 2 : String(pageCount).length;
  const pages: RasterizedPage[] = [];

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
      // getDocument()) covers rendering internals; no per-call factory
      // option exists on RenderParameters.
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    const rawPng = await canvas.encode("png");
    const finalPng = await sharp(rawPng)
      .flatten({ background: "#ffffff" })
      .png({ palette: true, compressionLevel: 9, effort: 10 })
      .toBuffer();

    const filename = `page-${String(pageNum).padStart(padWidth, "0")}.png`;
    await writeFile(path.join(outputDir, filename), finalPng);

    const result: RasterizedPage = {
      pageNumber: pageNum,
      filename,
      width: canvas.width,
      height: canvas.height,
      bytes: finalPng.length,
      rawBytes: rawPng.length,
    };
    pages.push(result);
    onPage?.(result);
  }

  return pages;
}
