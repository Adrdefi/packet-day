/**
 * Locks the coloring page image prompts to known exact strings.
 *
 *   npm run check-coloring-prompt
 *
 * K-2 must stay byte for byte what production sent before grade bands
 * existed (GPT Image 2 and the Recraft fallback). 3-5 and 6-8 must stay
 * exactly what the blind bakeoff sent for the variants Andy picked (round 1
 * 35B and round 2 D_T2, on the image-bakeoff branch). Every band's Recraft
 * fallback must stay today's prompt. Grades must land in the right band,
 * and a missing or unreadable grade must fall back to K-2.
 *
 * No API calls and no env vars: it only builds strings and compares them.
 * Exits 1 on any difference. If a prompt changes on purpose, update the
 * expected string here in the same commit, and re-sync the bakeoff script
 * on the image-bakeoff branch (see CLAUDE.md).
 */

import { buildColoringPrompts, coloringBandForGrade } from "../lib/generateMascotImage";

// Bakeoff scene S1 (pepper garden), already in the shape production hands
// the image model: no child or mascot names.
const SCENE =
  "a boy and the mascot, a smiling green pepper wearing a straw sun hat, stand together in a sunny vegetable garden with a woven basket full of peppers, a tall pepper plant with flowers, a red watering can, and a wooden wheelbarrow";

// Pasted from main at 6113af2, before grade bands: buildColoringPrompt(SCENE, true).
const EXPECTED_K2_GPT_IMAGE_2 =
  "black and white coloring book page for children featuring a boy and the mascot, a smiling green pepper wearing a straw sun hat, stand together in a sunny vegetable garden with a woven basket full of peppers, a tall pepper plant with flowers, a red watering can, and a wooden wheelbarrow, clean black outlines only, no color, no shading, no fill, pure white background, thick clean outlines with large open white regions for coloring, no pencils, crayons, or art supplies in the image, no crosshatching or gray fill, simple shapes, kid-friendly line art ready to color, no letters, numbers, words, or signs anywhere in the image, including on vehicles, clothing, banners, and objects, an original, generic child character; do not depict any copyrighted, trademarked, or real-world-recognizable character, celebrity, or franchise mascot; invented, non-specific features only";

// Pasted from main at 6113af2, before grade bands: buildColoringPrompt(SCENE, false).
const EXPECTED_RECRAFT =
  "black and white coloring book page for children featuring a boy and the mascot, a smiling green pepper wearing a straw sun hat, stand together in a sunny vegetable garden with a woven basket full of peppers, a tall pepper plant with flowers, a red watering can, and a wooden wheelbarrow, clean black outlines only, no color, no shading, no fill, pure white background, thick clean outlines with large open white regions for coloring, no pencils, crayons, or art supplies in the image, no crosshatching or gray fill, simple shapes, kid-friendly line art ready to color, an original, generic child character; do not depict any copyrighted, trademarked, or real-world-recognizable character, celebrity, or franchise mascot; invented, non-specific features only";

// Pasted from what the bakeoff sent: round 1 letter B (35B), scene 1.
const EXPECTED_3_5 =
  "black and white coloring book page featuring a boy and the mascot, a smiling green pepper wearing a straw sun hat, stand together in a sunny vegetable garden with a woven basket full of peppers, a tall pepper plant with flowers, a red watering can, and a wooden wheelbarrow, clean black outlines only, no color, no shading, no fill, pure white background, no pencils, crayons, or art supplies in the image, no crosshatching or gray fill, medium weight outlines with a mix of large and medium regions to color, a fuller scene with background details, textures drawn as line patterns such as leaves, bark, fur, and fabric, natural proportions, line art ready for colored pencils or markers, simple decorative patterns inside some of the larger shapes, no letters, numbers, words, or signs anywhere in the image, including on vehicles, clothing, banners, and objects, an original, generic child character; do not depict any copyrighted, trademarked, or real-world-recognizable character, celebrity, or franchise mascot; invented, non-specific features only";

// Pasted from what the bakeoff sent: round 2 variant D_T2, scene 1.
const EXPECTED_6_8 =
  "black and white coloring book page featuring a boy and the mascot, a smiling green pepper wearing a straw sun hat, stand together in a sunny vegetable garden with a woven basket full of peppers, a tall pepper plant with flowers, a red watering can, and a wooden wheelbarrow, clean black outlines only, no color, no shading, no fill, pure white background, no pencils, crayons, or art supplies in the image, no crosshatching or gray fill, intricate illustrated line art for older kids and teens, fine but clearly printable black outlines, many small and medium regions to color, detailed background, realistic proportions, not cartoonish, textures rendered with line work only, crisp, smooth, continuous black outlines, clean line art with no sketchy, broken, or doubled strokes, no stippling or hatching texture, no labels, markings, symbols, or numbers on walls, panels, railings, or equipment, balance detailed areas with a few larger open areas to color, avoid tiny cluttered details, no letters, numbers, words, or signs anywhere in the image, including on vehicles, clothing, banners, and objects, an original, generic child character; do not depict any copyrighted, trademarked, or real-world-recognizable character, celebrity, or franchise mascot; invented, non-specific features only";

const failures: string[] = [];
let passed = 0;

function firstDifference(actual: string, expected: string): string {
  let at = 0;
  while (at < actual.length && at < expected.length && actual[at] === expected[at]) at++;
  return (
    `first difference at character ${at} (actual length ${actual.length}, expected ${expected.length})\n` +
    `      actual:   ...${JSON.stringify(actual.slice(Math.max(0, at - 40), at + 40))}\n` +
    `      expected: ...${JSON.stringify(expected.slice(Math.max(0, at - 40), at + 40))}`
  );
}

function expectString(label: string, actual: string, expected: string) {
  if (actual === expected) {
    passed++;
    return;
  }
  failures.push(`${label}: prompt changed, ${firstDifference(actual, expected)}`);
}

function expectBand(grade: string | null | undefined, expected: string) {
  const actual = coloringBandForGrade(grade);
  if (actual === expected) {
    passed++;
    return;
  }
  failures.push(`grade ${JSON.stringify(grade)}: expected band ${expected}, got ${actual}`);
}

const k2 = buildColoringPrompts(SCENE, "K-2");
const b35 = buildColoringPrompts(SCENE, "3-5");
const b68 = buildColoringPrompts(SCENE, "6-8");

expectString("K-2 GPT Image 2", k2.gptImage2, EXPECTED_K2_GPT_IMAGE_2);
expectString("K-2 Recraft fallback", k2.recraft, EXPECTED_RECRAFT);
expectString("3-5 GPT Image 2 (bakeoff 35B)", b35.gptImage2, EXPECTED_3_5);
expectString("3-5 Recraft fallback", b35.recraft, EXPECTED_RECRAFT);
expectString("6-8 GPT Image 2 (bakeoff D_T2)", b68.gptImage2, EXPECTED_6_8);
expectString("6-8 Recraft fallback", b68.recraft, EXPECTED_RECRAFT);

for (const grade of ["K", "1", "2", "Kindergarten"]) expectBand(grade, "K-2");
for (const grade of [undefined, null, "", "  ", "unknown"]) expectBand(grade, "K-2");
for (const grade of ["3", "4", "5"]) expectBand(grade, "3-5");
for (const grade of ["6", "7", "8"]) expectBand(grade, "6-8");

if (failures.length > 0) {
  process.stderr.write(`\nCOLORING PROMPT CHECK FAILED (${failures.length} problem${failures.length === 1 ? "" : "s"}):\n\n`);
  for (const f of failures) process.stderr.write(`  ${f}\n\n`);
  process.exit(1);
}
process.stdout.write(`Coloring prompt check passed: ${passed} checks (6 exact prompts, ${passed - 6} grade bands).\n`);
