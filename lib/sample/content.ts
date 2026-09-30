/**
 * Copy and facts for /sample, all from Kai's real grade 4 outer space packet
 * (and Mia's grade 1 and Jonah's grade 7 packets for the grade toggle). Page
 * images live in public/sample/ and public/sample/toggle/. Every caption
 * describes what is printed on that page; don't add anything that isn't.
 */
import type { LandingIconName } from "@/components/landing/art/LandingIcon";

export const SAMPLE_CHILD = "Kai";
export const SAMPLE_GRADE = 4;
export const SAMPLE_CHARACTER = "Orbit";

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
    caption: "The cover. Orbit the otter astronaut gives Kai today's mission.",
    alt: "Cover of Kai's Outer Space Adventure Day: Orbit the otter astronaut, 6 activities, 127 minutes, grade 4, and a mission note from Orbit.",
  },
  {
    label: "Today at a glance",
    caption: "Today at a glance: six activities, 127 minutes, and a short note for you.",
    alt: "Today at a Glance page listing the six activities with their minutes, a note for the parent and lines for observations.",
  },
  {
    label: "Math",
    caption: "Rocket fuel math: two digit multiplication, long division and a fraction of Orbit's moon rocks.",
    alt: "Math page, Rocket Fuel Math Mission: six quick problems like 34 x 12 and 945 divided by 7, then four space word problems.",
  },
  {
    label: "Math, draw and solve",
    caption: "Draw and solve: sketch 4 rows of 13 solar panels on the moon base.",
    alt: "Draw and solve page: a big box to draw 4 rows of 13 solar panels, a space fact and a bonus challenge.",
  },
  {
    label: "Reading",
    caption: "Reading: Orbit's grand tour past all eight planets.",
    alt: "Reading page, Orbit's Grand Tour of the Planets: a story about Orbit flying past every planet from Mercury to Neptune.",
  },
  {
    label: "Reading questions",
    caption: "Six questions about the story, from why Venus is so hot to the joke in Orbit's name.",
    alt: "Six comprehension questions about the planet story, with lines to write each answer.",
  },
  {
    label: "Writing",
    caption: "Writing: Commander Kai writes a mission log, with Orbit as copilot.",
    alt: "Writing page, Commander Kai's Mission Log: four prompts for a two paragraph log about a trip to one planet, with writing lines.",
  },
  {
    label: "Puzzle break",
    caption: "Puzzle break: a galaxy word search with nine space words.",
    alt: "Galaxy Word Search: a letter grid with nine words to find, like PLANET, ROCKET, SATURN and GRAVITY.",
  },
  {
    label: "Movement break",
    caption: "Movement break: count down, blast off, moonwalk and do 10 star jumps.",
    alt: "Rocket Launch Workout: six moves, from a countdown jump to a slow moonwalk and 10 star jumps.",
  },
  {
    label: "Science",
    caption: "Science: a flashlight and a ball show why we have day and night.",
    alt: "Science page, Spinning Earth: The Science of Day and Night: observe the Sun, then spin a ball in flashlight light and explain what happens.",
  },
  {
    label: "More science",
    caption: "More science: why Mars takes longer to go around the Sun, and what if Earth stopped spinning.",
    alt: "Second science page with two thinking questions, a Venus fact and a bonus challenge.",
  },
  {
    label: "Coloring page",
    caption: "Coloring page: Kai and Orbit on the Moon, with a rocket, a flag and a ringed planet.",
    alt: "Coloring page, Kai and Orbit Explore the Moon: a kid and an otter in spacesuits on the Moon next to a rocket, a flag and a ringed planet.",
  },
  {
    label: "Daily reflection",
    caption: "Daily reflection: Orbit says mission complete, and Kai answers one last question.",
    alt: "Daily Reflection page: a note from Orbit, one question about the day and lines to answer it.",
  },
  {
    label: "Certificate",
    caption: "The certificate, with a spot for your signature and Kai's.",
    alt: "Certificate of completion for Kai, with signature lines and the words Orbit is proud of you, Kai.",
  },
  {
    label: "Parent answer key",
    caption: "Parent answer key: the math, reading and science answers, plus teaching notes. You don't have to print it.",
    alt: "Parent answer key and teaching notes with every math answer and the reading and science answers.",
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
  { icon: "math", kind: "Math", title: "Rocket Fuel Math Mission", minutes: 30 },
  { icon: "reading", kind: "Reading", title: "Orbit's Grand Tour of the Planets", minutes: 25 },
  { icon: "artPe", kind: "Writing", title: "Commander Kai's Mission Log", minutes: 25 },
  { icon: "limitless", kind: "Puzzle break", title: "Galaxy Word Search", minutes: 10 },
  { icon: "peBreaks", kind: "Movement break", title: "Rocket Launch Workout", minutes: 7 },
  { icon: "science", kind: "Science", title: "Spinning Earth: The Science of Day and Night", minutes: 30 },
  { icon: "original", kind: "Coloring page", title: "Kai and Orbit Explore the Moon", note: "Whenever they want" },
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
}

export const GRADE_SAMPLES: GradeSample[] = [
  {
    grade: 1,
    childName: "Mia",
    character: "Comet the cat",
    caption: "Adding and subtracting within 10, and a short rocket story.",
    math: {
      src: "/sample/toggle/grade-1-math.png",
      alt: "Grade 1 math page, Rocket Counting and Star Math: problems like 2 + 3 and 9 minus 3, and word problems about planets, stars and space snacks.",
    },
    reading: {
      src: "/sample/toggle/grade-1-reading.png",
      alt: "Grade 1 reading page, Blast Off to the Planets: a short story about Mia and Comet the cat flying past the Sun, Mars and Saturn.",
    },
  },
  {
    grade: 4,
    childName: "Kai",
    character: "Orbit the otter",
    caption: "Two digit multiplication, long division and a tour of the planets.",
    math: {
      src: "/sample/toggle/grade-4-math.png",
      alt: "Grade 4 math page, Rocket Fuel Math Mission: problems like 56 x 23 and 945 divided by 7, and four space word problems.",
    },
    reading: {
      src: "/sample/toggle/grade-4-reading.png",
      alt: "Grade 4 reading page, Orbit's Grand Tour of the Planets: a story about Orbit flying past all eight planets.",
    },
  },
  {
    grade: 7,
    childName: "Jonah",
    character: "Nova the owl",
    caption: "Two step equations, rocket data and the true story of the Voyager probes.",
    math: {
      src: "/sample/toggle/grade-7-math.png",
      alt: "Grade 7 math page, Launch Math: two step equations, a mean, the volume of a cylinder and word problems about a rocket's climb.",
    },
    reading: {
      src: "/sample/toggle/grade-7-reading.png",
      alt: "Grade 7 reading page, The Longest Road Trip in History: the true story of the Voyager probes, told with Nova the owl.",
    },
  },
];

export const DEFAULT_GRADE = SAMPLE_GRADE;
