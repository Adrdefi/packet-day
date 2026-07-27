// Quick smoke-test: render 3 PDFs (K-2, 3-5, 6-8) and save to disk.
// Run with: npx tsx scripts/test-pdf.ts

import { createElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import fs from 'fs';
import path from 'path';
import type { PacketPDFProps, PDFActivity } from '../components/PacketPDF';
import PacketPDF from '../components/PacketPDF';

function oceanActivities(grade: string, full = true): PDFActivity[] {
  const isMid = ['Grade 3', 'Grade 4', 'Grade 5'].includes(grade);
  const isHigh = ['Grade 6', 'Grade 7', 'Grade 8'].includes(grade);

  const math: PDFActivity = {
    subject: 'Math',
    content_type: 'worksheet',
    title: 'Ocean Math Challenge',
    description: isMid || isHigh
      ? 'Practice multiplication and division with ocean creatures.'
      : 'Count and add the sea creatures in the ocean.',
    instructions: isHigh
      ? [
          "SPARKY'S QUICK CALCULATIONS: 7 x 8 = ___ || 144 divided by 12 = ___ || 3/4 + 1/4 = ___ || 25% of 80 = ___",
          "WORD PROBLEMS: A reef has 4 zones each containing 36 fish. How many fish total? || A shark swims 45 miles in 3 hours. What is its speed per hour?",
          "DRAW & SOLVE: Draw a number line from 0-50. Mark the multiples of 7. My answer: ___",
        ]
      : isMid
      ? [
          "SPARKY'S QUICK CALCULATIONS: 6 x 7 = ___ || 48 divided by 6 = ___ || 23 + 49 = ___ || 91 - 37 = ___",
          "WORD PROBLEMS: The tide pool has 8 rows of 6 starfish. How many starfish? || A dolphin jumps 12 times each day for 5 days. How many jumps total?",
          "DRAW & SOLVE: Draw 3 groups of 4 fish. Write a multiplication equation. My answer: ___",
        ]
      : [
          "SPARKY'S QUICK CALCULATIONS: 2 + 5 = ___ || 8 - 3 = ___ || 4 + 4 = ___ || 7 - 2 = ___",
          "WORD PROBLEMS: Lily saw 3 dolphins. Then 4 more came. How many dolphins? || There were 9 shells. The tide took 4 away. How many remain?",
          "DRAW & SOLVE: Draw 2 groups of 3 fish. How many fish in all? My answer: ___",
        ],
    estimated_minutes: 25,
    materials: ['pencil', 'paper'],
    fun_fact: 'The ocean is home to the largest animal on Earth — the blue whale, which can grow up to 100 feet long!',
    encouragement: 'Your math skills are as deep as the ocean!',
    answer_key: null,
  };

  const reading: PDFActivity = {
    subject: 'Reading',
    content_type: 'reading_passage',
    title: 'Secrets of the Deep',
    description: 'Read a fascinating passage about ocean life.',
    passage: isHigh
      ? `The ocean depths hold secrets that scientists are only beginning to uncover. Below 200 meters, sunlight cannot penetrate, creating the mesopelagic zone — a twilight world where bioluminescent creatures glow with their own light. Species like the anglerfish use this ability to lure prey in absolute darkness. The deep sea, comprising over 95% of the biosphere, remains largely unexplored. Hydrothermal vents discovered in 1977 revealed ecosystems that thrive without sunlight, challenging our understanding of where life can exist. These discoveries have profound implications for the search for life on other planets. Scientists hypothesize that similar conditions may exist beneath the icy surface of Europa, one of Jupiter's moons. The ocean, in this way, is not merely Earth's largest habitat but a window into the possibility of life across the cosmos.`
      : isMid
      ? `The ocean is the largest habitat on Earth, covering more than 70 percent of our planet's surface. Millions of species call it home, from microscopic plankton to the massive blue whale. The coral reef is one of the ocean's most important ecosystems. Though reefs cover less than one percent of the ocean floor, they support about 25 percent of all marine species. Coral reefs face many threats today, including rising water temperatures caused by climate change and pollution from human activities. Scientists around the world are working to protect these vital underwater forests. Some researchers are growing coral in special tanks and transplanting it back into damaged reefs — a process called coral gardening. Understanding and protecting the ocean is one of the most important challenges of our time.`
      : `Sparky the seahorse lived in a bright coral reef. Every morning, Sparky swam past the waving anemones and winking fish. One day, Sparky found a mysterious treasure chest covered in barnacles. Inside were five glittering pearls. Sparky shared the pearls with the reef's fish, the starfish, and the crabs. Everyone was happy! The reef shone brighter than ever that day.`,
    instructions: isHigh
      ? [
          'What is the mesopelagic zone, and what makes it unique?',
          'Explain why the discovery of hydrothermal vents was significant for science.',
          'How does the author connect ocean exploration to the search for life on other planets? Do you find this argument convincing?',
        ]
      : isMid
      ? [
          'Why are coral reefs important to ocean life?',
          'What does the word "ecosystem" mean in this passage?',
          'What is coral gardening, and why do scientists do it?',
        ]
      : [
          "What color were the pearls Sparky found?",
          "Who did Sparky share the pearls with?",
          "What would you put in a treasure chest? Why?",
        ],
    estimated_minutes: 25,
    materials: ['pencil'],
    fun_fact: 'Dolphins have names for each other — they use unique whistle sounds to call specific friends!',
    encouragement: 'Every page you read makes you smarter and stronger!',
    answer_key: null,
  };

  const writing: PDFActivity = {
    subject: 'Writing',
    content_type: 'writing_prompt',
    title: 'Message in a Bottle',
    description: isHigh
      ? 'Write a structured essay or short story about an ocean discovery.'
      : 'Imagine you are an explorer discovering something amazing in the ocean.',
    instructions: isHigh
      ? [
          'Introduce your ocean discovery and explain why it matters.',
          'Describe what you find using vivid, specific sensory details.',
          'Conclude with what this discovery means for science or humanity.',
        ]
      : isMid
      ? [
          "Describe what you discover in the ocean. What does it look like?",
          "How do you feel when you find it? Write at least two descriptive words.",
          "What will you do with your discovery? Will you tell anyone?",
        ]
      : [
          "If you found a treasure in the ocean, what would it be?",
          "Who would you share it with?",
          "Draw a picture of your treasure!",
        ],
    estimated_minutes: 20,
    materials: ['pencil', 'paper'],
    fun_fact: 'The oldest message in a bottle ever found was sent in 1906 and discovered 108 years later!',
    encouragement: 'Your writing voice is one of a kind. Let it shine!',
    answer_key: null,
  };

  const puzzle: PDFActivity = {
    subject: 'Puzzle Break',
    content_type: 'puzzle_break',
    title: 'Ocean Word Search',
    description: 'Hunt for hidden ocean words in the grid. Circle each one when you find it!',
    instructions: ['OCEAN', 'WAVE', 'CORAL', 'SHARK', 'ANCHOR', 'TIDE', 'REEF', 'KELP', 'SHELL', 'WHALE'],
    estimated_minutes: 10,
    materials: ['pencil'],
    fun_fact: 'Word searches were invented in 1968 — they are over 50 years old!',
    encouragement: 'Puzzle solvers are great thinkers!',
    answer_key: null,
  };

  const science: PDFActivity = {
    subject: 'Science',
    content_type: 'worksheet',
    title: 'Ocean Layers',
    description: 'Learn about the five layers of the ocean and the creatures that live there.',
    instructions: isHigh
      ? [
          'Name and describe the five ocean zones from shallowest to deepest.',
          'Explain how pressure and temperature change as depth increases, and why this matters for marine life.',
          'Choose one deep-sea creature and explain how it has adapted to its environment.',
        ]
      : isMid
      ? [
          'Label the three main ocean zones: sunlight, twilight, and midnight.',
          'What kind of animals live in the sunlight zone? Why do they need light?',
          'How do deep-sea fish survive without sunlight? Give one example.',
        ]
      : [
          'Draw the ocean and show where fish, whales, and crabs live.',
          'Why do fish need water to breathe?',
          'What is your favorite ocean animal? Draw it!',
        ],
    estimated_minutes: 25,
    materials: ['pencil', 'colored pencils'],
    fun_fact: 'The deepest part of the ocean is the Mariana Trench — it is deeper than Mount Everest is tall!',
    encouragement: 'Scientists ask great questions — just like you!',
    answer_key: null,
  };

  const baseActivities = [math, reading, writing];
  if (full) {
    return [...baseActivities, puzzle, science];
  }
  return baseActivities;
}

function makeProps(grade: string, name: string): PacketPDFProps {
  const full = true;
  return {
    childName: name,
    childEmoji: '🌊',
    childGrade: grade,
    theme: 'Ocean Adventure',
    title: `${name}'s Ocean Adventure Day`,
    activities: oceanActivities(grade, full),
    createdAt: new Date().toISOString(),
    mascotImageUrl: null,
    mascotName: 'Sparky',
    greeting: `Today is all about the ocean, ${name}! Get ready to dive deep into a day of discovery.`,
    packetMission: `Your mission today is to explore the ocean with Sparky! Complete all your activities, solve the word search, and earn your certificate. The sea awaits, brave explorer!`,
    packetCelebration: `You did it, ${name}! Sparky is bursting with pride. You read about the deep sea, tackled math, wrote a masterpiece, and found all the hidden words. What an explorer you are!`,
    coloringPage: {
      title: `${name} and Sparky at the Reef`,
      coloring_scene: `${name} and Sparky the seahorse float near a coral reef surrounded by a treasure chest, three colorful fish, a starfish, and a sea turtle`,
      instructions: 'Color the coral reef in bright pinks, oranges, and purples! Make Sparky the most colorful seahorse in the ocean.',
    },
    parentNotes: `Today's packet was built around ocean exploration to spark curiosity about marine science. The reading passage scales to grade level — feel free to read it aloud together.`,
    dailyReflection: `What was the most surprising thing you learned about the ocean today? What would you like to explore more?`,
  };
}

async function renderTest(grade: string, name: string, filename: string) {
  console.log(`Rendering ${grade} (${name})...`);
  try {
    const props = makeProps(grade, name);
    const buf = await renderToBuffer(createElement(PacketPDF, props) as React.ReactElement<PacketPDFProps>);
    fs.writeFileSync(filename, buf);
    console.log(`  ✓ ${filename} — ${(buf.byteLength / 1024).toFixed(0)} KB`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ ${grade} FAILED: ${msg}`);
    process.exit(1);
  }
}

(async () => {
  console.log('\nPart 3: Test Packet Render\n');
  await renderTest('Grade 1', 'Lily', 'test-k2.pdf');
  await renderTest('Grade 4', 'Noah', 'test-35.pdf');
  await renderTest('Grade 7', 'Maya', 'test-68.pdf');
  console.log('\nAll test packets rendered. Review PDFs before committing.\n');
})();
