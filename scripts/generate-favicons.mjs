/**
 * Generates static favicon files in /public using sharp.
 * Run with: node scripts/generate-favicons.mjs
 *
 * Outputs:
 *   public/favicon-16x16.png
 *   public/favicon-32x32.png
 *   public/apple-touch-icon.png (180x180)
 *   public/favicon.ico          (multi-size ICO: 16 + 32)
 */

import sharp from "sharp";
import { writeFileSync } from "fs";

// SVG source — "P" in serif on sage green, with rounded corners
// We render at 100x100 then let sharp resize down cleanly.
const svgSource = `
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#4A7C59"/>
  <text
    x="50" y="74"
    text-anchor="middle"
    font-family="Georgia, 'Times New Roman', serif"
    font-weight="700"
    font-size="66"
    fill="#FDFBF7"
  >P</text>
</svg>
`.trim();

const src = Buffer.from(svgSource);

// ─── PNG sizes ───────────────────────────────────────────────────────────────

const targets = [
  { size: 16,  out: "public/favicon-16x16.png" },
  { size: 32,  out: "public/favicon-32x32.png" },
  { size: 180, out: "public/apple-touch-icon.png" },
];

for (const { size, out } of targets) {
  await sharp(src).resize(size, size).png({ compressionLevel: 9 }).toFile(out);
  console.log(`✓  ${out}`);
}

// ─── favicon.ico (multi-size: 16 + 32) ───────────────────────────────────────
// ICO format: 6-byte ICONDIR header + 16-byte ICONDIRENTRY per image + PNG data

const png16 = await sharp(src).resize(16, 16).png().toBuffer();
const png32 = await sharp(src).resize(32, 32).png().toBuffer();

const NUM_IMAGES  = 2;
const HEADER_SIZE = 6;
const ENTRY_SIZE  = 16;
const dataStart   = HEADER_SIZE + ENTRY_SIZE * NUM_IMAGES;

// ICONDIR header
const header = Buffer.alloc(HEADER_SIZE);
header.writeUInt16LE(0,          0); // reserved
header.writeUInt16LE(1,          2); // type: 1 = ICO
header.writeUInt16LE(NUM_IMAGES, 4); // number of images

// ICONDIRENTRY for 16x16
const entry16 = Buffer.alloc(ENTRY_SIZE);
entry16.writeUInt8(16, 0);                           // width
entry16.writeUInt8(16, 1);                           // height
entry16.writeUInt8(0,  2);                           // color count
entry16.writeUInt8(0,  3);                           // reserved
entry16.writeUInt16LE(1,             4);             // color planes
entry16.writeUInt16LE(32,            6);             // bits per pixel
entry16.writeUInt32LE(png16.length,  8);             // size of image data
entry16.writeUInt32LE(dataStart,     12);            // offset of image data

// ICONDIRENTRY for 32x32
const entry32 = Buffer.alloc(ENTRY_SIZE);
entry32.writeUInt8(32, 0);
entry32.writeUInt8(32, 1);
entry32.writeUInt8(0,  2);
entry32.writeUInt8(0,  3);
entry32.writeUInt16LE(1,                          4);
entry32.writeUInt16LE(32,                         6);
entry32.writeUInt32LE(png32.length,               8);
entry32.writeUInt32LE(dataStart + png16.length,   12);

writeFileSync(
  "public/favicon.ico",
  Buffer.concat([header, entry16, entry32, png16, png32])
);
console.log("✓  public/favicon.ico");
console.log("\nDone! All favicon files generated.");
