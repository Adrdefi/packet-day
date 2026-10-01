/**
 * Copy and facts for /sample, all from Kai's real grade 4 outer space packet
 * (and Mia's grade 1 and Jonah's grade 7 packets for the grade toggle). Page
 * images live in public/sample/ and public/sample/toggle/. Every caption
 * describes what is printed on that page; don't add anything that isn't.
 */
import type { LandingIconName } from "@/components/landing/art/LandingIcon";

export const SAMPLE_CHILD = "Kai";
export const SAMPLE_GRADE = 4;
export const SAMPLE_CHARACTER = "Nova";

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
    caption: "The cover. Nova the fox astronaut hands Kai an urgent case: a missing planet.",
    alt: "Cover of Kai and the Missing Planet: Nova the fox astronaut with a magnifying glass, 6 activities, 117 minutes, grade 4, and a mission note from Nova.",
  },
  {
    label: "Today at a glance",
    caption: "Today at a glance: six activities, 117 minutes, and a short note for you.",
    alt: "Today at a Glance page listing the six activities with their minutes, a note for the parent and lines for observations.",
  },
  {
    label: "Math",
    caption: "Mission Control Math: two digit multiplication, division and a fraction of the rocky planets.",
    alt: "Math page, Mission Control Math: six quick problems like 24 x 13 and 756 divided by 6, then four space word problems.",
  },
  {
    label: "Math, draw and solve",
    caption: "Draw and solve: an area model for Nova's launch pad, 23 tiles by 14 tiles.",
    alt: "Draw and solve page: a big box to draw an area model for 23 x 14, a Jupiter fact and a bonus challenge.",
  },
  {
    label: "Reading",
    caption: "Reading: an old star chart in Grandpa's attic shows nine planets. Where did the ninth one go?",
    alt: "Reading page, The Case of the Ninth Planet: a mystery story about Kai and Nova finding an old star chart with Pluto on it.",
  },
  {
    label: "Reading questions",
    caption: "Six questions about the story, from what orbit means to whether Pluto should still be a planet.",
    alt: "The end of the story and six comprehension questions, with lines to write each answer.",
  },
  {
    label: "Writing",
    caption: "Writing: Kai writes a detective report about a mystery object far beyond Neptune.",
    alt: "Writing page, Detective Report from the Edge of Space: four prompts for a two paragraph report, with writing lines.",
  },
  {
    label: "Puzzle break",
    caption: "Puzzle break: a solar system crossword, with a joke of the day.",
    alt: "Solar System Clue Crossword: a crossword grid with 11 space clues, like the eighth planet and a tool that makes faraway stars look closer, and a joke of the day.",
  },
  {
    label: "Movement break",
    caption: "Movement break: count down, blast off, moonwalk and orbit the room.",
    alt: "Rocket Launch Countdown: six moves, from a countdown jump to slow moonwalk steps and 10 star jumps.",
  },
  {
    label: "Science",
    caption: "Science: a flashlight and a ball show how Earth spins and orbits.",
    alt: "Science page, Spin and Orbit Investigation: shine a flashlight on a ball, spin it to show day and night, then walk it around the light.",
  },
  {
    label: "More science",
    caption: "More science: how bright is sunlight on Pluto, and why does Neptune take so long to go around the Sun?",
    alt: "Second science page with two thinking questions, a Mercury and Neptune fact and a bonus challenge.",
  },
  {
    label: "Coloring page",
    caption: "Coloring page: Kai and Nova spot a faraway dwarf planet through a telescope.",
    alt: "Coloring page, Kai and Nova Spot a Faraway Dwarf Planet: a kid and a fox in spacesuits next to a telescope and a rocket, with a ringed planet and a comet overhead.",
  },
  {
    label: "Daily reflection",
    caption: "Daily reflection: Nova says case closed, and Kai answers one last question.",
    alt: "Daily Reflection page: a note from Nova, one question about the day and lines to answer it.",
  },
  {
    label: "Certificate",
    caption: "The certificate, with a spot for your signature and Kai's.",
    alt: "Certificate of completion for Kai, with signature lines and the words Nova is proud of you, Kai.",
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
  { icon: "math", kind: "Math", title: "Mission Control Math", minutes: 25 },
  { icon: "reading", kind: "Reading", title: "The Case of the Ninth Planet", minutes: 25 },
  { icon: "artPe", kind: "Writing", title: "Detective Report from the Edge of Space", minutes: 20 },
  { icon: "limitless", kind: "Puzzle break", title: "Solar System Clue Crossword", minutes: 15 },
  { icon: "peBreaks", kind: "Movement break", title: "Rocket Launch Countdown", minutes: 7 },
  { icon: "science", kind: "Science", title: "Spin and Orbit Investigation", minutes: 25 },
  { icon: "original", kind: "Coloring page", title: "Kai and Nova Spot a Faraway Dwarf Planet", note: "Whenever they want" },
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
    character: "Nova the fox",
    caption: "Two digit multiplication, a Pluto mystery and a crossword.",
    math: {
      src: "/sample/toggle/grade-4-math.png",
      alt: "Grade 4 math page, Mission Control Math: problems like 36 x 25 and 756 divided by 6, and four space word problems.",
    },
    reading: {
      src: "/sample/toggle/grade-4-reading.png",
      alt: "Grade 4 reading page, The Case of the Ninth Planet: a mystery story about Kai and Nova the fox finding an old star chart with nine planets.",
    },
    puzzle: {
      src: "/sample/toggle/grade-4-puzzle.png",
      alt: "Grade 4 puzzle page, Solar System Clue Crossword: a crossword with 11 space clues and a joke of the day.",
    },
  },
  {
    grade: 7,
    childName: "Jonah",
    character: "Kepler the owl",
    caption: "Two step equations, escape velocity and a 9 by 9 sudoku.",
    math: {
      src: "/sample/toggle/grade-7-math.png",
      alt: "Grade 7 math page, Launch Control Equations: integers, two step equations, a mean, the volume of a cylinder and word problems about a rocket launch.",
    },
    reading: {
      src: "/sample/toggle/grade-7-reading.png",
      alt: "Grade 7 reading page, The Second Launch: Jonah and Kepler the owl work out why their first simulated rocket launch failed to reach escape velocity.",
    },
    puzzle: {
      src: "/sample/toggle/grade-7-puzzle.png",
      alt: "Grade 7 puzzle page, Kepler's Orbital Number Grid: a 9 by 9 sudoku, a Venus fact and a joke of the day.",
    },
  },
];

export const DEFAULT_GRADE = SAMPLE_GRADE;
