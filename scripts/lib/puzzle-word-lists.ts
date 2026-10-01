// Theme word lists for npm run check-puzzles, shaped like what the packet
// writer will return for a puzzle break: about 18 words, in the model's
// order, each with a short clue. Lengths and vocabulary are pitched at each
// grade band the way the real prompt asks for. The "messy" lists exercise the
// cleanup: mixed case, punctuation, duplicates, palindromes, words hidden
// inside other words, and words too long for the grid.

import type { BandKey } from "../../lib/pdf-tokens";
import type { PuzzleWordInput } from "../../lib/puzzles";

type ThemeList = { theme: string; words: PuzzleWordInput[] };

const list = (theme: string, pairs: [string, string][]): ThemeList => ({
  theme,
  words: pairs.map(([word, clue]) => ({ word, clue })),
});

export const THEME_WORD_LISTS: Record<BandKey, ThemeList[]> = {
  "K-2": [
    list("Dinosaurs", [
      ["DINO", "A short name for a dinosaur."], ["EGG", "A baby dino hatches from this."], ["BONE", "Diggers find these in the ground."],
      ["CLAW", "A sharp, pointy toenail."], ["TAIL", "The long part at a dino's back end."], ["ROAR", "The loud sound a T. rex makes."],
      ["NEST", "A mama dino lays eggs in it."], ["HORN", "Triceratops had three of these."], ["TEETH", "T. rex had big sharp ones."],
      ["FERN", "A leafy plant dinos ate."], ["SWAMP", "A wet, muddy place."], ["FOSSIL", "A dino bone turned to stone."],
      ["STOMP", "A big heavy step."], ["SPIKE", "A pointy part on a dino's back."], ["HUGE", "Very, very big."],
      ["ROCK", "Fossils are found in this."], ["DIG", "What you do with a shovel."], ["LEAF", "A green part of a plant."],
    ]),
    list("Ocean", [
      ["FISH", "It swims and has fins."], ["SHARK", "A big fish with lots of teeth."], ["WAVE", "Water that rolls onto the beach."],
      ["CRAB", "It walks sideways."], ["SHELL", "A hard home on the sand."], ["WHALE", "The biggest animal in the sea."],
      ["CORAL", "A colorful reef is made of this."], ["SAND", "The beach is covered in it."], ["KELP", "A tall seaweed."],
      ["SEAL", "It barks and swims."], ["BOAT", "It floats on top of the water."], ["SALT", "Ocean water tastes like this."],
      ["TIDE", "The sea goes in and out with this."], ["FIN", "A fish uses this to steer."], ["OCTOPUS", "It has eight arms."],
      ["SQUID", "It squirts ink."], ["CLAM", "It opens and shuts its shell."], ["REEF", "Lots of fish live here."],
    ]),
    list("Farm", [
      ["COW", "It gives us milk."], ["PIG", "It says oink."], ["HEN", "She lays eggs."], ["BARN", "A big red farm building."],
      ["HAY", "Horses and cows eat it."], ["GOAT", "It has a beard and loves to climb."], ["DUCK", "It says quack."],
      ["SHEEP", "Its wool keeps us warm."], ["CORN", "A yellow crop on a cob."], ["SEED", "Plant this to grow food."],
      ["MUD", "Pigs love to roll in it."], ["FARMER", "The person who runs the farm."], ["TRACTOR", "A farm machine that pulls."],
      ["HORSE", "You can ride it."], ["FENCE", "It keeps the animals in."], ["APPLE", "A red fruit from a tree."],
      ["CHICK", "A baby chicken."], ["MILK", "A white drink from a cow."],
    ]),
    list("Bugs", [
      ["ANT", "A tiny bug that works hard."], ["BEE", "It makes honey."], ["WING", "Bugs fly with these."], ["WORM", "It wiggles in the dirt."],
      ["MOTH", "It flies at night to the light."], ["SNAIL", "It carries its shell."], ["SPIDER", "It spins a web."],
      ["WEB", "A spider's sticky net."], ["LEG", "Bugs have six of these."], ["HIVE", "A home for bees."], ["FLY", "A buzzing bug."],
      ["BEETLE", "A bug with a hard back."], ["LADYBUG", "A red bug with black spots."], ["HONEY", "Sweet food bees make."],
      ["DIRT", "Worms live in it."], ["BUZZ", "The sound a bee makes."], ["CRAWL", "Move slowly on legs."], ["SLIME", "Snails leave a trail of it."],
    ]),
  ],
  "3-5": [
    list("Space", [
      ["PLANET", "Earth is one of eight of these."], ["ORBIT", "The path a planet takes around the Sun."], ["COMET", "An icy ball with a long glowing tail."],
      ["SATURN", "The planet with the famous rings."], ["GALAXY", "Our Milky Way is one of these."], ["ROCKET", "It blasts astronauts into space."],
      ["METEOR", "A space rock that streaks across the sky."], ["ASTEROID", "A rocky chunk that orbits the Sun."], ["NEBULA", "A cloud of gas where stars are born."],
      ["GRAVITY", "The pull that keeps your feet on the ground."], ["JUPITER", "The biggest planet."], ["CRATER", "A bowl shaped hole made by a space rock."],
      ["TELESCOPE", "A tool for looking at faraway stars."], ["ECLIPSE", "When the Moon blocks the Sun."], ["MOON", "It lights up the night sky."],
      ["ASTRONAUT", "A person who travels to space."], ["MARS", "The red planet."], ["STAR", "The Sun is one of these."],
    ]),
    list("Weather", [
      ["THUNDER", "The boom after lightning."], ["CLOUD", "A floating puff of water drops."], ["TORNADO", "A spinning funnel of wind."],
      ["RAINBOW", "Colors in the sky after rain."], ["BREEZE", "A gentle wind."], ["HAIL", "Balls of ice that fall from the sky."],
      ["FORECAST", "A guess about tomorrow's weather."], ["HUMID", "Sticky, damp air."], ["DROUGHT", "A long time with no rain."],
      ["BLIZZARD", "A big snowstorm with strong wind."], ["DRIZZLE", "Very light rain."], ["FROST", "Ice crystals on the grass."],
      ["SLEET", "Rain that freezes as it falls."], ["CLIMATE", "The usual weather of a place."], ["MONSOON", "A season of heavy rain."],
      ["HURRICANE", "A huge storm that forms over the ocean."], ["DEGREE", "A unit for measuring temperature."], ["FOG", "A cloud that sits on the ground."],
    ]),
    list("Rainforest", [
      ["CANOPY", "The leafy top layer of the forest."], ["JAGUAR", "A spotted big cat."], ["TOUCAN", "A bird with a huge colorful beak."],
      ["SLOTH", "A slow animal that hangs from branches."], ["VINE", "A long climbing plant."], ["PARROT", "A bright bird that can copy sounds."],
      ["ORCHID", "A fancy flower that grows on trees."], ["MONKEY", "It swings through the trees."], ["FROG", "A jumper that can be bright and poisonous."],
      ["AMAZON", "The biggest rainforest on Earth."], ["HUMID", "Warm and damp, like the forest air."], ["EMERGENT", "The tallest trees poke up into this layer."],
      ["UNDERSTORY", "The shady layer below the canopy."], ["LIANA", "A woody vine that climbs to the light."], ["BROMELIAD", "A plant that holds a tiny pool of water."],
      ["PIRANHA", "A fish with sharp teeth."], ["ANACONDA", "A giant snake."], ["MACAW", "A large parrot."],
    ]),
    list("Pirates", [
      ["TREASURE", "Gold hidden in a chest."], ["CAPTAIN", "The leader of the ship."], ["ANCHOR", "It keeps the ship from drifting."],
      ["PARROT", "A bird that sits on a shoulder."], ["COMPASS", "It shows which way is north."], ["ISLAND", "Land with water all around."],
      ["CANNON", "A big gun on the ship."], ["PLANK", "A board pirates walk."], ["MAP", "An X marks the spot on it."],
      ["SAIL", "Wind pushes the ship with this."], ["CREW", "The people who work on a ship."], ["GALLEON", "A big sailing ship."],
      ["DOUBLOON", "An old gold coin."], ["DECK", "The floor of a ship."], ["SPYGLASS", "A small telescope."],
      ["CUTLASS", "A short curved sword."], ["VOYAGE", "A long trip by sea."], ["HARBOR", "A safe place for ships."],
    ]),
  ],
  "6-8": [
    list("Ancient Rome", [
      ["AQUEDUCT", "Stone channel that carried water into cities."], ["COLOSSEUM", "Arena where crowds watched games."], ["SENATE", "Council that advised Rome's leaders."],
      ["LEGION", "Army unit of about 5,000 soldiers."], ["GLADIATOR", "Trained fighter in the arena."], ["EMPEROR", "Augustus was the first one."],
      ["FORUM", "Open square at the heart of city life."], ["TOGA", "Wool garment worn by citizens."], ["CONCRETE", "Building mix of lime and volcanic ash."],
      ["REPUBLIC", "Rome's government before the emperors."], ["CENTURION", "Officer in charge of about 80 men."], ["CHARIOT", "Two wheeled cart raced in the Circus Maximus."],
      ["MOSAIC", "Picture made from tiny colored stones."], ["BASILICA", "Large public hall for courts and business."], ["TIBER", "River that flows through Rome."],
      ["CONSUL", "One of two elected leaders each year."], ["PATRICIAN", "Member of a wealthy old family."], ["PLEBEIAN", "An ordinary Roman citizen."],
    ]),
    list("Volcanoes", [
      ["MAGMA", "Melted rock under the ground."], ["LAVA", "Melted rock once it reaches the surface."], ["CRATER", "Bowl at the top of a volcano."],
      ["ERUPTION", "When a volcano blows."], ["DORMANT", "Quiet now, but could erupt again."], ["EXTINCT", "Will never erupt again."],
      ["PLATE", "A huge moving piece of Earth's crust."], ["MANTLE", "Hot layer under the crust."], ["CALDERA", "Giant hollow left after a collapse."],
      ["PUMICE", "Light rock full of air bubbles."], ["OBSIDIAN", "Glassy black volcanic rock."], ["ASH", "Fine dust blasted into the sky."],
      ["VENT", "Opening where magma escapes."], ["GEYSER", "Hot spring that shoots water into the air."], ["TSUNAMI", "Giant wave an eruption can trigger."],
      ["BASALT", "Dark rock from cooled lava."], ["SEISMIC", "Having to do with earthquakes."], ["PYROCLASTIC", "Describes a fast flow of hot gas and rock."],
    ]),
    list("Human Body", [
      ["NEURON", "A nerve cell that carries signals."], ["SKELETON", "The frame of 206 bones."], ["ARTERY", "Carries blood away from the heart."],
      ["VEIN", "Carries blood back to the heart."], ["LUNG", "Organ that takes in oxygen."], ["CORTEX", "Wrinkled outer layer of the brain."],
      ["ENZYME", "Protein that speeds up digestion."], ["TENDON", "Connects muscle to bone."], ["LIGAMENT", "Connects bone to bone."],
      ["PLASMA", "The liquid part of blood."], ["MARROW", "Soft tissue inside bones that makes blood cells."], ["DIAPHRAGM", "Muscle that helps you breathe."],
      ["KIDNEY", "Organ that filters blood."], ["RETINA", "Light sensing layer of the eye."], ["CARTILAGE", "Bendy tissue in your nose and ears."],
      ["PANCREAS", "Organ that makes insulin."], ["HORMONE", "Chemical messenger in the blood."], ["ALVEOLI", "Tiny air sacs in the lungs."],
    ]),
    list("Ancient Egypt", [
      ["PHARAOH", "Ruler of ancient Egypt."], ["PYRAMID", "Giant stone tomb with four sloping sides."], ["MUMMY", "A preserved body wrapped in linen."],
      ["NILE", "River that flooded every year."], ["PAPYRUS", "Reed used to make paper."], ["SPHINX", "Lion body with a human head."],
      ["SCRIBE", "Person trained to read and write."], ["TOMB", "Burial place for the dead."], ["DELTA", "Fan of land where the river meets the sea."],
      ["OBELISK", "Tall four sided stone pillar."], ["DYNASTY", "A line of rulers from one family."], ["HIEROGLYPH", "A picture symbol used in writing."],
      ["SARCOPHAGUS", "Stone coffin for a mummy."], ["CARTOUCHE", "Oval around a royal name."], ["AMULET", "Charm worn for protection."],
      ["SCARAB", "Beetle symbol of the rising sun."], ["CANOPIC", "Kind of jar that held organs."], ["IRRIGATION", "Watering crops with canals."],
    ]),
  ],
};

/** Deliberately messy model output, one per band. */
export const MESSY_WORD_LISTS: Record<BandKey, ThemeList> = {
  "K-2": list("Messy farm", [
    ["cow", "It gives us milk."], ["Pig!", "It says oink."], ["HEN", "She lays eggs."], ["HEN", "Duplicate."], ["MOM", "A palindrome."],
    ["BARN", "A big red farm building."], ["BARNYARD", "Too long for K-2 crosswords, and BARN hides inside it."], ["GOAT", "It loves to climb."],
    ["DUCK", "It says quack."], ["SHEEP", "Its wool keeps us warm."], ["CORN", "A yellow crop."], ["SEED", "Plant this to grow food."],
    ["MUD", "Pigs love to roll in it."], ["TOOT", "A palindrome."], ["HORSE", "You can ride it."], ["FENCE", "It keeps the animals in."],
    ["APPLE", "A red fruit."], ["CHICK", "A baby chicken."], ["Tractor-trailer", "Too long."], ["MILK", "A white drink."],
  ]),
  "3-5": list("Messy space", [
    ["planet", "Earth is one."], ["PLANETS", "PLANET hides inside it."], ["STAR", "The Sun is one."], ["RATS", "STAR backwards."],
    ["ORBIT", "A planet's path."], ["COMET", "Icy ball with a tail."], ["SATURN", "Ringed planet."], ["GALAXY", "Milky Way is one."],
    ["ROCKET", "It blasts off."], ["METEOR", "Streaks across the sky."], ["ASTEROID", "Rocky chunk."], ["NEBULA", "Gas cloud."],
    ["GRAVITY", "The pull."], ["JUPITER", "Biggest planet."], ["CRATER", "Bowl shaped hole."], ["SOLARSYSTEMS", "Too long."],
    ["ECLIPSE", "Moon blocks Sun."], ["MOON", "Lights the night."], ["NOON", "A palindrome."], ["MARS", "Red planet."],
  ]),
  "6-8": list("Messy Rome", [
    ["Aqueduct", "Water channel."], ["COLOSSEUM", "Arena."], ["SENATE", "Council."], ["SENATES", "SENATE hides inside it."],
    ["LEGION", "Army unit."], ["GLADIATOR", "Arena fighter."], ["EMPEROR", "Augustus was one."], ["FORUM", "City square."],
    ["TOGA", "Wool garment."], ["AGOT", "TOGA backwards."], ["CONCRETE", "Lime and ash."], ["REPUBLIC", "Before the emperors."],
    ["CENTURION", "Officer."], ["CHARIOT", "Two wheeled cart."], ["MOSAIC", "Tiny stones."], ["BASILICA", "Public hall."],
    ["TIBER", "River."], ["CIVIC", "A palindrome."], ["MEDITERRANEANSEA", "Too long."], ["CONSUL", "Elected leader."],
  ]),
};
