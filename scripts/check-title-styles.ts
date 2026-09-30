/**
 * Checks the rotating title style picker and the title safety net.
 *
 *   npm run check-title-styles
 *
 * - pickTitleStyle never returns the previous style, for every style and
 *   across the whole range of the random source.
 * - A missing or unknown previous style counts as "classic", so it never
 *   picks classic.
 * - Every other style is reachable from every previous style.
 * - The classic title built in code uses the right possessive.
 * - The safety net rejects a missing title, one without the child's first
 *   name, and one over the length cap, and accepts a good one.
 *
 * No API calls and no env vars. Exits 1 on any failure.
 */

import {
  TITLE_STYLES,
  buildClassicTitle,
  buildCoverKicker,
  buildTitleBrief,
  normalizeTitleStyle,
  pickTitleStyle,
  titleRejectionReason,
  type TitleStyle,
} from "../lib/titleStyles";

const failures: string[] = [];
let passed = 0;

function expect(label: string, ok: boolean, detail = "") {
  if (ok) passed++;
  else failures.push(`${label}${detail ? `: ${detail}` : ""}`);
}

// Deterministic sweep of the random source, including both edges.
const RANDOM_VALUES = [0, 0.0001, 0.19, 0.2, 0.39, 0.4, 0.5, 0.61, 0.8, 0.9999, 0.999999999];

const previousValues: unknown[] = [...TITLE_STYLES, null, undefined, "", "not-a-style", 42];

for (const previous of previousValues) {
  const expectedPrevious = normalizeTitleStyle(previous);
  const seen = new Set<TitleStyle>();
  for (const r of RANDOM_VALUES) {
    const picked = pickTitleStyle(previous, () => r);
    seen.add(picked);
    expect(
      `pick after ${JSON.stringify(previous)} with random ${r}`,
      picked !== expectedPrevious && (TITLE_STYLES as readonly string[]).includes(picked),
      `got ${picked}`
    );
  }
  // Every other style must be reachable.
  const missing = TITLE_STYLES.filter((s) => s !== expectedPrevious && !seen.has(s));
  expect(`every style reachable after ${JSON.stringify(previous)}`, missing.length === 0, `missing ${missing.join(", ")}`);
}

// Real Math.random, many times.
for (const previous of previousValues) {
  const expectedPrevious = normalizeTitleStyle(previous);
  let repeats = 0;
  for (let i = 0; i < 2000; i++) if (pickTitleStyle(previous) === expectedPrevious) repeats++;
  expect(`2000 random picks after ${JSON.stringify(previous)} never repeat`, repeats === 0, `${repeats} repeats`);
}

for (const missing of [null, undefined, "", "Classic", "adventure"]) {
  expect(`missing style ${JSON.stringify(missing)} counts as classic`, normalizeTitleStyle(missing) === "classic");
}

expect("classic title, name ending in s", buildClassicTitle("Anders", "bicycle") === "Anders' Bicycle Adventure Day", buildClassicTitle("Anders", "bicycle"));
expect("classic title, plain name", buildClassicTitle("Kai", "outer space") === "Kai's Outer Space Adventure Day", buildClassicTitle("Kai", "outer space"));
expect("classic title, two word name uses first name", buildClassicTitle("Mia Rose", "bats") === "Mia's Bats Adventure Day", buildClassicTitle("Mia Rose", "bats"));

expect("safety net: good title", titleRejectionReason("Jonah vs. Gravity", "Jonah") === null);
expect("safety net: name check ignores case", titleRejectionReason("JONAH VS. GRAVITY", "jonah") === null);
expect("safety net: missing title", titleRejectionReason(undefined, "Jonah") !== null);
expect("safety net: empty title", titleRejectionReason("   ", "Jonah") !== null);
expect("safety net: no child name", titleRejectionReason("The Secret of the Rings", "Kai") !== null);
expect("safety net: too long", titleRejectionReason("Kai and the Very Long Secret of the Distant Ringed Planet", "Kai") !== null);
expect("safety net: 50 characters is fine", titleRejectionReason("Kai" + "x".repeat(47), "Kai") === null);

const brief = buildTitleBrief({
  childName: "Anders",
  gradeLevel: "7",
  theme: "bicycles",
  style: "episode",
  packetNumber: 8,
  recentTitles: ["Anders' Bicycle Adventure Day"],
});
expect("brief carries the exact possessive", brief.includes("Possessive form: Anders' "));
expect("brief carries the packet number", brief.includes("Packet number: 8"));
expect("brief lists recent titles", brief.includes("- Anders' Bicycle Adventure Day"));
expect("brief uses the 6-8 voice", brief.includes("No exclamation points"));
expect("brief does not offer the chosen style as a switch", !brief.includes("- episode:"));

const k = (mascotName: string | null, packetNumber: number | null | undefined, titleStyle: string | null, band: "K-2" | "3-5" | "6-8") =>
  buildCoverKicker({ mascotName, packetNumber, titleStyle, band });
const kickerCases: [string, string | null, string | null][] = [
  ["K-2 with mascot", k("Nova", 7, "quest", "K-2"), "Nova · Adventure #7"],
  ["3-5 with mascot", k("Nova", 7, "mystery", "3-5"), "Nova · Adventure #7"],
  ["6-8 pads to 2 digits", k("Nova", 7, "versus", "6-8"), "Nova · Mission File 07"],
  ["6-8 two digits as is", k("Nova", 34, "versus", "6-8"), "Nova · Mission File 34"],
  ["6-8 three digits as is", k("Nova", 123, "versus", "6-8"), "Nova · Mission File 123"],
  ["episode shows only the mascot", k("Nova", 7, "episode", "3-5"), "Nova"],
  ["episode with no mascot shows nothing", k(null, 7, "episode", "6-8"), null],
  ["no mascot, K-5", k(null, 7, "quest", "K-2"), "Adventure #7"],
  ["no mascot, 6-8", k("  ", 7, "quest", "6-8"), "Mission File 07"],
  ["old packet: no number", k("Nova", undefined, null, "3-5"), null],
  ["old packet: null number", k("Nova", null, null, "6-8"), null],
  ["bad number", k("Nova", 0, "quest", "3-5"), null],
  ["missing style is not episode", k("Nova", 2, null, "3-5"), "Nova · Adventure #2"],
];
for (const [label, actual, expected] of kickerCases) {
  expect(`kicker: ${label}`, actual === expected, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

if (failures.length > 0) {
  process.stderr.write(`\nTITLE STYLE CHECK FAILED (${failures.length} problem${failures.length === 1 ? "" : "s"}):\n\n`);
  for (const f of failures) process.stderr.write(`  ${f}\n`);
  process.exit(1);
}
process.stdout.write(`Title style check passed: ${passed} checks.\n`);
