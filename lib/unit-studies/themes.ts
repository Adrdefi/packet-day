/**
 * Every planned unit study theme, whether or not its page exists yet. A
 * content file's `related` slugs are checked against this list (not against
 * the content files that happen to exist), so a page can name its related
 * themes before those pages are written. The page itself only links to the
 * ones visible on the current deployment.
 *
 * `generatorInput` is the exact theme text typed into Packet Day to make the
 * sample packet. `name` is the short display name (the part before the
 * colon). `season` is when the theme is most searched for.
 */

export type ThemeSeason = "fall" | "winter" | "spring" | "summer" | "evergreen";

export interface UnitStudyTheme {
  slug: string;
  name: string;
  generatorInput: string;
  grade: number;
  season: ThemeSeason;
  related: [string, string, string];
  /** 2 or 3 hand picked situation pages that genuinely fit. Across all themes, every situation page is picked at least once. */
  useCaseLinks: string[];
}

function theme(
  slug: string,
  generatorInput: string,
  grade: number,
  season: ThemeSeason,
  related: [string, string, string],
  useCaseLinks: string[],
): UnitStudyTheme {
  return { slug, name: generatorInput.split(":")[0].trim(), generatorInput, grade, season, related, useCaseLinks };
}

export const THEMES: readonly UnitStudyTheme[] = [
  theme("bats", "Bats: echolocation, bat habitats and nocturnal animals", 2, "fall", ["pumpkins", "insects", "polar-animals"], ["/screen-free", "/fun-friday"]),
  theme("pumpkins", "Pumpkins: life cycle from seed to jack o lantern and pumpkin science", 2, "fall", ["bats", "thanksgiving", "kitchen-science"], ["/fun-friday", "/screen-free", "/multiple-kids"]),
  theme("thanksgiving", "Thanksgiving: the Mayflower voyage and the first harvest feast", 4, "fall", ["pumpkins", "us-constitution", "kitchen-science"], ["/road-trip", "/multiple-kids", "/fun-friday"]),
  theme("polar-animals", "Polar animals: penguins and polar bears and how they survive the cold", 3, "winter", ["ocean-animals", "weather", "bats"], ["/sick-day", "/screen-free"]),
  theme("dinosaurs", "Dinosaurs: Tyrannosaurus rex, Triceratops and how fossils form", 2, "evergreen", ["volcanoes", "dragons", "insects"], ["/multiple-kids", "/sick-day", "/fun-friday"]),
  theme("sharks", "Sharks: shark anatomy, the ocean food chain and famous species", 3, "evergreen", ["ocean-animals", "dinosaurs", "human-body"], ["/road-trip", "/screen-free"]),
  theme("outer-space", "Outer space: the solar system, planets and rockets", 4, "evergreen", ["weather", "volcanoes", "human-body"], ["/road-trip", "/screen-free", "/sick-day"]),
  theme("ocean-animals", "Ocean animals: whales, octopuses and coral reefs", 3, "evergreen", ["sharks", "polar-animals", "weather"], ["/road-trip", "/sick-day"]),
  theme("horses", "Horses: breeds, gaits and horse care", 4, "evergreen", ["medieval-castles", "ancient-greece", "human-body"], ["/road-trip", "/screen-free"]),
  theme("volcanoes", "Volcanoes: how they erupt and the layers of the Earth", 3, "evergreen", ["dinosaurs", "ancient-rome", "weather"], ["/fun-friday", "/screen-free"]),
  theme("ancient-egypt", "Ancient Egypt: pharaohs, pyramids and hieroglyphics", 4, "evergreen", ["ancient-greece", "ancient-rome", "human-body"], ["/fun-friday", "/multiple-kids"]),
  theme("dragons", "Dragons and mythical creatures: legends from around the world", 3, "evergreen", ["ancient-greece", "medieval-castles", "dinosaurs"], ["/sick-day", "/fun-friday"]),
  theme("insects", "Bugs and insects: butterflies, bees and life cycles", 2, "spring", ["bats", "pumpkins", "human-body"], ["/screen-free", "/multiple-kids"]),
  theme("ancient-greece", "Ancient Greece: city states, the Olympics and Greek myths", 5, "evergreen", ["ancient-rome", "ancient-egypt", "dragons"], ["/fun-friday", "/road-trip"]),
  theme("ancient-rome", "Ancient Rome: the Colosseum, Roman roads and daily life", 5, "evergreen", ["ancient-greece", "volcanoes", "medieval-castles"], ["/fun-friday", "/road-trip"]),
  theme("medieval-castles", "Medieval castles and knights: how castles were built and defended", 4, "evergreen", ["dragons", "horses", "ancient-rome"], ["/multiple-kids", "/fun-friday"]),
  theme("us-constitution", "The U.S. Constitution: the three branches and the Bill of Rights", 5, "evergreen", ["thanksgiving", "ancient-greece", "ancient-rome"], ["/road-trip", "/multiple-kids"]),
  theme("human-body", "The human body: bones, organs and the five senses", 3, "evergreen", ["ancient-egypt", "sharks", "kitchen-science"], ["/sick-day", "/screen-free"]),
  theme("weather", "Weather and storms: clouds, the water cycle and hurricanes", 3, "evergreen", ["volcanoes", "outer-space", "ocean-animals"], ["/sick-day", "/screen-free", "/road-trip"]),
  theme("kitchen-science", "Baking science: how heat, yeast and ingredients change food", 4, "evergreen", ["pumpkins", "human-body", "thanksgiving"], ["/fun-friday", "/multiple-kids", "/screen-free"]),
];

export const THEME_SLUGS: ReadonlySet<string> = new Set(THEMES.map((t) => t.slug));

export function getTheme(slug: string): UnitStudyTheme | undefined {
  return THEMES.find((t) => t.slug === slug);
}

/** Problems with the registry itself (duplicate slugs, related slugs that aren't registered). */
export function registryProblems(): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const t of THEMES) {
    if (seen.has(t.slug)) problems.push(`theme "${t.slug}" is listed twice`);
    seen.add(t.slug);
    for (const r of t.related) {
      if (r === t.slug) problems.push(`theme "${t.slug}" lists itself as related`);
      else if (!THEME_SLUGS.has(r)) problems.push(`theme "${t.slug}" lists unknown related slug "${r}"`);
    }
    if (new Set(t.related).size !== t.related.length) problems.push(`theme "${t.slug}" lists a related slug twice`);
    if (t.useCaseLinks.length < 2 || t.useCaseLinks.length > 3) problems.push(`theme "${t.slug}" has ${t.useCaseLinks.length} use case links (needs 2 to 3)`);
    if (new Set(t.useCaseLinks).size !== t.useCaseLinks.length) problems.push(`theme "${t.slug}" lists a use case link twice`);
  }
  return problems;
}
