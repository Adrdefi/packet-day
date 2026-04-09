const ROW1 = [
  "🦈 Sharks",
  "🌋 Volcanoes",
  "🚀 Outer Space",
  "🏰 Medieval Castles",
  "🍪 Baking Science",
  "🦄 Unicorns",
  "⚽ Soccer",
  "🎮 Minecraft",
  "🦕 Dinosaurs",
  "🐙 Deep Ocean",
  "🎸 Rock & Roll History",
  "🏗️ How Buildings Work",
  "🧁 Cupcake Wars",
  "🐉 Dragons & Mythology",
];

const ROW2 = [
  "🎨 Famous Artists",
  "🌿 Rainforest Animals",
  "❄️ Arctic Explorers",
  "🏎️ Race Cars & Physics",
  "🧬 Human Body",
  "🐝 Beekeeping",
  "✨ Taylor Swift",
  "🤖 Underwater Robots",
  "🌎 Ancient Egypt",
  "🎪 Circus Math",
  "🐺 Wolves & Pack Behavior",
  "🧊 Ice Cream Chemistry",
  "🏀 Basketball Stats",
  "🌈 Weather Science",
];

function TickerRow({
  themes,
  direction,
}: {
  themes: string[];
  direction: "left" | "right";
}) {
  // Duplicate for seamless infinite loop
  const items = [...themes, ...themes];
  return (
    <div className="overflow-hidden py-2">
      <div
        className={`flex w-max ${
          direction === "left" ? "animate-ticker-left" : "animate-ticker-right"
        }`}
      >
        {items.map((theme, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 bg-white border border-border rounded-full px-4 py-2 mx-2 text-sm font-semibold text-dark whitespace-nowrap shadow-sm"
          >
            {theme}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ThemeTicker() {
  return (
    <div className="mt-12 -mx-6 lg:-mx-12">
      <TickerRow themes={ROW1} direction="left" />
      <TickerRow themes={ROW2} direction="right" />
    </div>
  );
}
