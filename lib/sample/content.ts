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
    caption: "The cover. Nova the robot rover gives Kai today's mission: land safely on Mars.",
    alt: "Cover of Episode 5: Kai Lands on Mars: Nova the robot rover with big round eyes and a blinking antenna, 6 activities, 133 minutes, grade 4, and a mission note from Nova.",
  },
  {
    label: "Today at a glance",
    caption: "Today at a glance: six activities, 133 minutes, and a short note for you.",
    alt: "Today at a Glance page listing the six activities with their minutes, a note for the parent and lines for observations.",
  },
  {
    label: "Math",
    caption: "Fueling up for the Mars landing: two digit multiplication, long division and 3/4 of the rock samples.",
    alt: "Math page, Fueling Up for the Mars Landing: six quick problems like 48 x 36 and 728 divided by 8, then four Mars word problems.",
  },
  {
    label: "Math, draw and solve",
    caption: "Draw and solve: an area model for 27 rows of 13 solar panels.",
    alt: "Draw and solve page: a big box to draw an area model for 27 x 13, a fact about a year on Mars and a bonus challenge.",
  },
  {
    label: "Reading",
    caption: "Reading: Kai and Nova touch down on Mars and collect rock samples near a giant crater.",
    alt: "Reading page, Touchdown on the Red Planet: a story about Kai landing on Mars with Nova the robot rover, bouncing in low gravity and seeing Olympus Mons.",
  },
  {
    label: "Reading questions",
    caption: "Six questions about the story, from why Mars is red to why Kai could bounce so high.",
    alt: "Six comprehension questions about the Mars story with lines to write each answer, and a fact about Martian dust storms.",
  },
  {
    label: "Writing",
    caption: "Writing: Kai writes a mission log about a first full day on Mars.",
    alt: "Writing page, Kai's Mars Mission Log: four prompts for a two paragraph log that starts Mission Log, Day 1 on Mars, with writing lines.",
  },
  {
    label: "Puzzle break",
    caption: "Puzzle break: a space crossword, with a joke of the day.",
    alt: "Nova's Cosmic Crossword Challenge: a crossword grid with 11 space clues, like the biggest planet and a robot car that explores another planet, and a joke of the day.",
  },
  {
    label: "Movement break",
    caption: "Movement break: blast off, moonwalk, and bounce like Kai on Mars.",
    alt: "Low Gravity Launch and Bounce: five moves, from a countdown jump to slow moonwalk steps and 15 springy hops.",
  },
  {
    label: "Science",
    caption: "Science: drop a flat sheet and a crumpled ball, then work out how high you could jump on Mars.",
    alt: "Science page, Gravity Lab: Earth, Moon, and Mars: a paper drop test, a hammer and feather prediction for the Moon and a Mars jumping question.",
  },
  {
    label: "More science",
    caption: "More science: how the Sun's gravity keeps planets in orbit, and walking on Jupiter versus Mars.",
    alt: "Second science page with two thinking questions, a fact about the Sun's mass and a bonus challenge.",
  },
  {
    label: "Coloring page",
    caption: "Coloring page: Kai and Nova explore the red rocks of Mars.",
    alt: "Coloring page, Kai and Nova Explore the Red Rocks of Mars: a kid in a spacesuit next to a rocket, a rover with a robot arm, a crater, a volcano, two small moons and a pile of rock samples.",
  },
  {
    label: "Daily reflection",
    caption: "Daily reflection: Nova says Episode 5 is complete, and Kai answers one last question.",
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
  { icon: "math", kind: "Math", title: "Fueling Up for the Mars Landing", minutes: 30 },
  { icon: "reading", kind: "Reading", title: "Touchdown on the Red Planet", minutes: 25 },
  { icon: "artPe", kind: "Writing", title: "Kai's Mars Mission Log", minutes: 25 },
  { icon: "limitless", kind: "Puzzle break", title: "Nova's Cosmic Crossword Challenge", minutes: 15 },
  { icon: "peBreaks", kind: "Movement break", title: "Low Gravity Launch and Bounce", minutes: 8 },
  { icon: "science", kind: "Science", title: "Gravity Lab: Earth, Moon, and Mars", minutes: 30 },
  { icon: "original", kind: "Coloring page", title: "Kai and Nova Explore the Red Rocks of Mars", note: "Whenever they want" },
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
    character: "Nova the robot rover",
    caption: "Two digit multiplication, a Mars landing and a crossword.",
    math: {
      src: "/sample/toggle/grade-4-math.png",
      alt: "Grade 4 math page, Fueling Up for the Mars Landing: problems like 48 x 36 and 728 divided by 8, and four Mars word problems.",
    },
    reading: {
      src: "/sample/toggle/grade-4-reading.png",
      alt: "Grade 4 reading page, Touchdown on the Red Planet: Kai lands on Mars with Nova the robot rover and collects rock samples.",
    },
    puzzle: {
      src: "/sample/toggle/grade-4-puzzle.png",
      alt: "Grade 4 puzzle page, Nova's Cosmic Crossword Challenge: a crossword with 11 space clues and a joke of the day.",
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
