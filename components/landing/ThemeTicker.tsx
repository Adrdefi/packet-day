import Link from "next/link";
import { getLiveUnitStudies } from "@/lib/unit-studies/loader";

const ROW1 = [
  "🦈 Sharks",
  "🦇 Bats",
  "🌋 Volcanoes",
  "🚀 Outer Space",
  "🏰 Medieval Castles",
  "🍪 Baking Science",
  "🦄 Unicorns",
  "⚽ Soccer",
  "🎮 Block Building Games",
  "🦕 Dinosaurs",
  "🐙 Deep Ocean",
  "🎸 Rock & Roll History",
  "🏗️ How Buildings Work",
  "🧁 Cupcake Wars",
  "🐉 Dragons & Mythology",
];

const ROW2 = [
  "🎨 Famous Artists",
  "🎃 Pumpkins",
  "🌿 Rainforest Animals",
  "❄️ Arctic Explorers",
  "🏎️ Race Cars & Physics",
  "🧬 Human Body",
  "🐝 Beekeeping",
  "✨ Pop Stars",
  "🤖 Underwater Robots",
  "🏺 Ancient Egypt",
  "🎪 Circus Math",
  "🐺 Wolves & Pack Behavior",
  "🧊 Ice Cream Chemistry",
  "🏀 Basketball Stats",
  "🌈 Weather Science",
];

// Chip label -> unit study theme slug, for chips that clearly match a
// planned theme. A chip only becomes a link once that theme's page is live.
const CHIP_THEME: Record<string, string> = {
  "🦈 Sharks": "sharks",
  "🦇 Bats": "bats",
  "🎃 Pumpkins": "pumpkins",
  "❄️ Arctic Explorers": "polar-animals",
  "🐝 Beekeeping": "insects",
  "🌋 Volcanoes": "volcanoes",
  "🚀 Outer Space": "outer-space",
  "🏰 Medieval Castles": "medieval-castles",
  "🍪 Baking Science": "kitchen-science",
  "🦕 Dinosaurs": "dinosaurs",
  "🐙 Deep Ocean": "ocean-animals",
  "🐉 Dragons & Mythology": "dragons",
  "🧬 Human Body": "human-body",
  "🏺 Ancient Egypt": "ancient-egypt",
  "🌈 Weather Science": "weather",
};

const CHIP_CLASS =
  "inline-flex items-center gap-2 bg-cream border border-border rounded-full px-4 py-2 mx-2 text-sm font-semibold text-dark whitespace-nowrap shadow-sm";

function TickerRow({
  themes,
  direction,
  liveSlugs,
}: {
  themes: string[];
  direction: "left" | "right";
  liveSlugs: Set<string>;
}) {
  // The row is drawn twice for a seamless loop. The second copy is hidden
  // from screen readers and skipped by the keyboard, so each chip is read and
  // tabbed to once.
  return (
    <div className="overflow-hidden py-2">
      <div
        className={`flex w-max ${
          direction === "left" ? "animate-ticker-left" : "animate-ticker-right"
        }`}
      >
        {[false, true].map((isCopy) => (
          <div key={String(isCopy)} className="flex" aria-hidden={isCopy || undefined}>
            {themes.map((theme) => {
              const slug = CHIP_THEME[theme];
              if (slug && liveSlugs.has(slug)) {
                return (
                  <Link
                    key={theme}
                    href={`/unit-studies/${slug}`}
                    tabIndex={isCopy ? -1 : undefined}
                    className={`${CHIP_CLASS} hover:border-sage hover:text-sage transition-colors`}
                  >
                    {theme}
                  </Link>
                );
              }
              return (
                <span key={theme} className={CHIP_CLASS}>
                  {theme}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ThemeTicker() {
  const liveSlugs = new Set(getLiveUnitStudies().map((page) => page.slug));
  return (
    <div className="mt-12 -mx-6 lg:-mx-12">
      <TickerRow themes={ROW1} direction="left" liveSlugs={liveSlugs} />
      <TickerRow themes={ROW2} direction="right" liveSlugs={liveSlugs} />
      {liveSlugs.size > 0 && (
        <p className="mt-8 px-6 text-center">
          <Link href="/unit-studies" className="font-semibold text-sage hover:underline">
            See a real packet for your kid&apos;s current obsession.
          </Link>
        </p>
      )}
    </div>
  );
}
