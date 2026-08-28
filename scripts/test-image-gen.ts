/**
 * Smoke-test for production image generation.
 * Calls generateMascotImage and generateColoringImage exactly as production
 * does and saves both to test-output/.
 *
 * Usage:
 *   npx dotenv -e .env.local -- npx tsx scripts/test-image-gen.ts
 */

import fs from "fs";
import path from "path";
import { generateMascotImage, generateColoringImage } from "../lib/generateMascotImage";

const TEST_DESCRIPTION = "a friendly pirate parrot with a feathered hat and golden earring";
const TEST_CHILD_NAME = "Test Child";
const OUT_DIR = path.join(__dirname, "..", "test-output");

function dataUrlToBuffer(dataUrl: string): Buffer {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) throw new Error("Not a valid data URL");
  return Buffer.from(dataUrl.slice(comma + 1), "base64");
}

async function main() {
  if (!process.env.REPLICATE_API_TOKEN) {
    console.error("REPLICATE_API_TOKEN not set");
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("=== Packet Day image generation smoke test ===");
  console.log(`Description : ${TEST_DESCRIPTION}`);
  console.log(`Output dir  : ${OUT_DIR}`);
  console.log("----------------------------------------------\n");

  const [mascotResult, coloringResult] = await Promise.allSettled([
    generateMascotImage(TEST_DESCRIPTION, TEST_CHILD_NAME),
    generateColoringImage(TEST_DESCRIPTION, TEST_CHILD_NAME),
  ]);

  // ── Mascot ────────────────────────────────────────────────────────────────────
  if (mascotResult.status === "fulfilled" && mascotResult.value) {
    const val = mascotResult.value;
    const mascotPath = path.join(OUT_DIR, "mascot.png");
    if (val.startsWith("data:")) {
      fs.writeFileSync(mascotPath, dataUrlToBuffer(val));
      console.log(`[mascot]  SAVED  → ${mascotPath}`);
    } else {
      // Direct URL fallback (expires ~1h but sufficient for local testing)
      const urlPath = path.join(OUT_DIR, "mascot-url.txt");
      fs.writeFileSync(urlPath, val);
      console.log(`[mascot]  DIRECT URL → ${urlPath}`);
    }
  } else if (mascotResult.status === "fulfilled") {
    console.log("[mascot]  SKIPPED — returned null");
  } else {
    console.log("[mascot]  FAILED —", mascotResult.reason);
  }

  // ── Coloring page ─────────────────────────────────────────────────────────────
  if (coloringResult.status === "fulfilled" && coloringResult.value) {
    const coloringPath = path.join(OUT_DIR, "coloring.png");
    fs.writeFileSync(coloringPath, dataUrlToBuffer(coloringResult.value));
    console.log(`[coloring] SAVED  → ${coloringPath}`);
  } else if (coloringResult.status === "fulfilled") {
    console.log("[coloring] SKIPPED — returned null");
  } else {
    console.log("[coloring] FAILED —", coloringResult.reason);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
