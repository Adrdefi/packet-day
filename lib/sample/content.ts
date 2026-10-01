/**
 * Copy and facts for /sample, all from Kai's real grade 4 outer space packet
 * (and Mia's grade 1 and Jonah's grade 7 packets for the grade toggle). Page
 * images live in public/sample/ and public/sample/toggle/. Every caption
 * describes what is printed on that page; don't add anything that isn't.
 */
import type { LandingIconName } from "@/components/landing/art/LandingIcon";

export const SAMPLE_CHILD = "Kai";
export const SAMPLE_GRADE = 4;
export const SAMPLE_CHARACTER = "Cosmo";

export const PAGE_WIDTH = 1200;
export const PAGE_HEIGHT = 1553;

export interface SamplePage {
  src: string;
  /** Short name shown over the page in the flipbook. */
  label: string;
  caption: string;
  alt: string;
}

const PAGES: Omit<SamplePage, "src">[] = [
  {
    label: "Cover",
    caption: "The cover. Cosmo the puppy astronaut sends Kai off to map the whole solar system.",
    alt: "Cover of Kai's Expedition Across the Solar System: Cosmo the puppy astronaut in an orange spacesuit, 6 activities, 138 minutes, grade 4, and a mission note from Cosmo.",
  },
  {
    label: "Today at a glance",
    caption: "Today at a glance: six activities, 138 minutes, and a short note for you.",
    alt: "Today at a Glance page listing the six activities with their minutes, a note for the parent and lines for observations.",
  },
  {
    label: "Math",
    caption: "Rocket Fuel Math: two digit multiplication, long division and a fraction of the rocky planets.",
    alt: "Math page, Rocket Fuel Math: six quick problems like 47 x 36 and 432 divided by 8, then four space word problems.",
  },
  {
    label: "Math, draw and solve",
    caption: "Draw and solve: an area model for 16 rows of 23 stars.",
    alt: "Draw and solve page: a big box to draw an area model for 16 x 23, a fact about sunlight and a bonus challenge.",
  },
  {
    label: "Reading",
    caption: "Reading: Kai and Cosmo fly from Mercury to Neptune and map every planet on the way.",
    alt: "Reading page, The Great Solar System Map: a story about Kai and Cosmo mapping every planet from Mercury to Neptune.",
  },
  {
    label: "Reading questions",
    caption: "Five questions about the story, from what makes craters to why Jupiter needed two boxes on the map.",
    alt: "Five comprehension questions about the story with lines to write each answer, and a Venus fact.",
  },
  {
    label: "Writing",
    caption: "Writing: Kai writes an explorer's log about a brand new planet past Neptune.",
    alt: "Writing page, Explorer's Log: A Brand New Planet: four prompts for a two paragraph log entry, with writing lines.",
  },
  {
    label: "Puzzle break",
    caption: "Puzzle break: a solar system crossword, with a joke of the day.",
    alt: "Cosmo's Solar System Crossword: a crossword grid with 11 space clues, like the biggest planet and an icy space traveler with a long glowing tail, and a joke of the day.",
  },
  {
    label: "Movement break",
    caption: "Movement break: count down, blast off, orbit a pretend Sun and dodge the asteroid belt.",
    alt: "Rocket Launch Workout: six moves, from a countdown jump to jogging around a chair or pillow Sun and 10 side hops each way.",
  },
  {
    label: "Science",
    caption: "Science: track a stick's shadow outside, then swing a sock on a string to see how gravity holds an orbit.",
    alt: "Science page, Planet Scientist Field Notes: mark a stick's shadow twice, explain why it moved, then swing a sock on a string and let go.",
  },
  {
    label: "More science",
    caption: "More science: what if Earth moved to where Venus is, and how the rocky and giant planets differ.",
    alt: "Second science page with two thinking questions, a Neptune fact and a bonus challenge.",
  },
  {
    label: "Coloring page",
    caption: "Coloring page: Kai and Cosmo float past a ringed planet.",
    alt: "Coloring page, Kai and Cosmo Float Past the Ringed Planet: a kid and a puppy in spacesuits floating near a rocket, a telescope, a ringed planet, a crescent moon and a comet.",
  },
  {
    label: "Daily reflection",
    caption: "Daily reflection: Cosmo says expedition complete, and Kai answers one last question.",
    alt: "Daily Reflection page: a note from Cosmo, one question about the day and lines to answer it.",
  },
  {
    label: "Certificate",
    caption: "The certificate, with a spot for your signature and Kai's.",
    alt: "Certificate of completion for Kai, with signature lines and the words Cosmo is proud of you, Kai.",
  },
  {
    label: "Parent answer key",
    caption: "Parent answer key: every answer, including the finished crossword. You don't have to print it.",
    alt: "Parent answer key and teaching notes with the math, reading and science answers and the solved crossword.",
  },
];

/** Kai's pages in order. The page count everywhere comes from this list. */
export const SAMPLE_PAGES: SamplePage[] = PAGES.map((page, i) => ({
  ...page,
  src: `/sample/page-${String(i + 1).padStart(2, "0")}.png`,
}));

export interface DayStep {
  icon: LandingIconName;
  kind: string;
  title: string;
  minutes?: number;
  note?: string;
}

/** From Kai's Today at a Glance page, then the pages that close the day. */
export const DAY_STEPS: DayStep[] = [
  { icon: "math", kind: "Math", title: "Rocket Fuel Math", minutes: 30 },
  { icon: "reading", kind: "Reading", title: "The Great Solar System Map", minutes: 25 },
  { icon: "artPe", kind: "Writing", title: "Explorer's Log: A Brand New Planet", minutes: 25 },
  { icon: "limitless", kind: "Puzzle break", title: "Cosmo's Solar System Crossword", minutes: 15 },
  { icon: "peBreaks", kind: "Movement break", title: "Rocket Launch Workout", minutes: 8 },
  { icon: "science", kind: "Science", title: "Planet Scientist Field Notes", minutes: 35 },
  { icon: "original", kind: "Coloring page", title: "Kai and Cosmo Float Past the Ringed Planet", note: "Whenever they want" },
  { icon: "gradeAligned", kind: "Certificate", title: "Signed by you and Kai", note: "At the end" },
  { icon: "answerKeys", kind: "Answer key", title: "For you, not for Kai", note: "On your phone" },
];

export interface GradeSample {
  grade: number;
  childName: string;
  character: string;
  caption: string;
  math: { src: string; alt: string };
  reading: { src: string; alt: string };
  puzzle: { src: string; alt: string };
}

export const GRADE_SAMPLES: GradeSample[] = [
  {
    grade: 1,
    childName: "Mia",
    character: "Astro the puppy",
    caption: "Adding and subtracting within 10, a short Moon story and a maze.",
    math: {
      src: "/sample/toggle/grade-1-math.png",
      alt: "Grade 1 math page, Countdown Space Math: problems like 2 + 3 and 10 minus 4, and word problems about planets, moon rocks, rockets and stars.",
    },
    reading: {
      src: "/sample/toggle/grade-1-reading.png",
      alt: "Grade 1 reading page, The Hunt for the Moon Rock: a short story about Mia and Astro the puppy flying past the Sun, Mars and Saturn to find a moon rock.",
    },
    puzzle: {
      src: "/sample/toggle/grade-1-puzzle.png",
      alt: "Grade 1 puzzle page, Rocket Race to the Moon: a maze from START to FINISH, a Venus fact and a joke of the day.",
    },
  },
  {
    grade: 4,
    childName: "Kai",
    character: "Cosmo the puppy",
    caption: "Two digit multiplication, a map of the planets and a crossword.",
    math: {
      src: "/sample/toggle/grade-4-math.png",
      alt: "Grade 4 math page, Rocket Fuel Math: problems like 47 x 36 and 432 divided by 8, and four space word problems.",
    },
    reading: {
      src: "/sample/toggle/grade-4-reading.png",
      alt: "Grade 4 reading page, The Great Solar System Map: Kai and Cosmo the puppy map every planet from Mercury to Neptune.",
    },
    puzzle: {
      src: "/sample/toggle/grade-4-puzzle.png",
      alt: "Grade 4 puzzle page, Cosmo's Solar System Crossword: a crossword with 11 space clues and a joke of the day.",
    },
  },
  {
    grade: 7,
    childName: "Jonah",
    character: "Kepler the owl",
    caption: "Two step equations, the hunt for Planet Nine and a 9 by 9 sudoku.",
    math: {
      src: "/sample/toggle/grade-7-math.png",
      alt: "Grade 7 math page, Fuel Burns and Flight Paths: two step equations, a mean, the volume of a cylinder and word problems about rocket fuel, asteroid counts and saving for a telescope.",
    },
    reading: {
      src: "/sample/toggle/grade-7-reading.png",
      alt: "Grade 7 reading page, The Planet Found on Paper: Jonah and Kepler the owl weigh the evidence for Planet Nine and learn how Neptune was found with math first.",
    },
    puzzle: {
      src: "/sample/toggle/grade-7-puzzle.png",
      alt: "Grade 7 puzzle page, Kepler's Orbit Grid Challenge: a 9 by 9 sudoku, a Saturn fact and a joke of the day.",
    },
  },
];

export const DEFAULT_GRADE = SAMPLE_GRADE;
