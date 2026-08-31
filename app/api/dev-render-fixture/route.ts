// THROWAWAY dev-only route for visual font/color verification during the
// PDF token rebuild. Renders a synthetic (non-DB) fixture so we can inspect
// glyph rendering without touching real family/child data. Delete before
// merging — never intended to ship.

import { NextRequest } from "next/server";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import PacketPDF from "@/components/PacketPDF";
import type { PacketPDFProps, PDFActivity } from "@/components/PacketPDF";

export const runtime = "nodejs";

const activities: PDFActivity[] = [
  {
    subject: "Math",
    content_type: "worksheet",
    title: "Oliver's Treasure Map Fractions",
    description:
      "Ahoy! Oliver's crew found a treasure map torn into fraction pieces — let's put it back together & find the gold.",
    instructions: [
      "QUICK CALCULATIONS: Solve these problems: 1/2 + 1/4 || 3/8 + 2/8 || 5/6 - 1/6 || 2/3 + 1/3",
      'WORD PROBLEMS: Oliver split 12 gold coins evenly among 4 crew members — how many coins does "each" pirate get?',
      "DRAW & SOLVE: Draw a treasure chest divided into 8 equal parts and shade 3/8 gold.",
    ],
    estimated_minutes: 20,
    materials: ["Pencil", "Colored pencils (optional)"],
    answer_key: "1) 3/4  2) 5/8  3) 4/6 = 2/3  4) 1 whole. Word problem: 3 coins each.",
    encouragement: "You're doing great — fractions are just pieces of a whole!",
    fun_fact: 'Real pirates used maps with "X marks the spot" — but most treasure was buried in banks, not sand!',
  },
  {
    subject: "Reading & Comprehension",
    content_type: "reading_passage",
    title: "The Lighthouse Keeper’s Daughter",
    passage:
      "Mara’s father tended the old lighthouse at Gull’s Point — its beam sweeping the dark water every ten seconds, rain or shine. “The sea doesn’t forgive forgetfulness,” he’d say, climbing the spiral stairs each dusk. One foggy night, Mara spotted a fishing boat drifting toward the rocks & rang the warning bell herself, again and again, until the boat turned safely away. Her father found her at the top, breathless & proud. “You’ve got the keeper’s instinct,” he said — and from that night on, Mara helped him climb the stairs every evening.",
    description: "Read the passage below, then answer the questions that follow.",
    instructions: [
      "What sound warned the fishing boat away from the rocks?",
      "Why do you think Mara’s father called it \"the keeper’s instinct\"?",
      "Have you ever helped someone in an emergency, big or small? What did you do?",
    ],
    estimated_minutes: 25,
    materials: [],
    answer_key: "1) The warning bell. 2) Accept reasoned answers about instinct/duty. 3) Open-ended.",
    encouragement: "Great reading — keep an eye out for clues in the story!",
    fun_fact: "The tallest lighthouse in the U.S. is Cape Hatteras Lighthouse at 198.5 feet tall.",
  },
  {
    subject: "Writing",
    content_type: "writing_prompt",
    title: "Dear Future Me — A Letter Across Time",
    description:
      "Write a letter to yourself five years from now. What do you hope you’ll remember about today? What questions do you have for \"future you\"?",
    instructions: [
      "Start with \"Dear Future Me,\"",
      "Describe one thing you’re proud of right now.",
      "Ask future-you at least one question — & sign off however you like!",
    ],
    estimated_minutes: 20,
    materials: ["Pencil or pen"],
    answer_key: null,
    encouragement: "There’s no wrong way to write this — just be yourself!",
    fun_fact: null,
  },
  {
    subject: "PE / Movement",
    content_type: "movement_activity",
    title: "Backyard Obstacle Dash",
    description:
      "Set up a mini obstacle course — hop, crawl, and balance your way through 5 stations, then time yourself!",
    instructions: [
      "Station 1 — Hop on one foot for 10 seconds.",
      "Station 2 — Crawl under a chair or table.",
      "Station 3 — Balance-walk along a taped line.",
      "Station 4 — Do 5 jumping jacks.",
      "Station 5 — Sprint to the finish!",
    ],
    estimated_minutes: 15,
    materials: ["Open space", "Chair or table", "Tape (optional)"],
    answer_key: null,
    encouragement: "Get that heart pumping — you’ve got this!",
    fun_fact: "Astronauts do obstacle-style training to stay strong in zero gravity!",
  },
  {
    subject: "Puzzle Break",
    content_type: "puzzle_break",
    title: "Ocean Word Search",
    description: "Find all the ocean words hiding in the grid below!",
    instructions: ["CORAL", "OCEAN", "WAVES", "TIDE", "SHELL", "REEF", "ANCHOR", "HARBOR"],
    estimated_minutes: 10,
    materials: [],
    answer_key: null,
    encouragement: "Happy hunting!",
    fun_fact: null,
  },
];

const props: PacketPDFProps = {
  childName: "Oliver",
  childEmoji: "🌊",
  childGrade: "Grade 3",
  theme: "Under the Sea Adventure",
  title: "Oliver's Under the Sea Adventure",
  activities,
  createdAt: new Date().toISOString(),
  specialNotes: null,
  mascotImageUrl: null,
  mascotName: "Captain Fin",
  mascotEmojiCluster: null,
  coloringPage: {
    title: "Color the Coral Reef",
    coloring_scene: "A vibrant coral reef with fish, a sea turtle, and sunlight from above",
    instructions: "Use blues and greens for the water, and bright colors for the coral & fish!",
  },
  coloringImageUrl: null,
  greeting: null,
  parentNotes:
    "This packet leans into Oliver’s love of the ocean & pirates — feel free to skip the movement break if you’re short on space today.",
  dailyReflection: "What was your favorite \"under the sea\" discovery today?",
  packetMission:
    "Ahoy, Oliver! Today you’re a treasure-hunting pirate scientist exploring the deep blue sea — let’s dive in & discover something new!",
  packetCelebration: "You did it, Oliver — Captain Fin says you're the best first mate in the seven seas!",
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const grade = url.searchParams.get("grade");
  const withMascot = url.searchParams.get("mascot") === "1";
  const gradedProps = {
    ...props,
    ...(grade ? { childGrade: grade } : null),
    ...(withMascot ? { mascotImageUrl: `${url.origin}/landing/characters.png` } : null),
  };
  const buf = await renderToBuffer(
    createElement(PacketPDF, gradedProps) as React.ReactElement<PacketPDFProps>
  );
  return new Response(buf.buffer as ArrayBuffer, {
    status: 200,
    headers: { "Content-Type": "application/pdf" },
  });
}
