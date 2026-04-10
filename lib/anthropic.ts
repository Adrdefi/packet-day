import Anthropic from "@anthropic-ai/sdk";
import type { Child, PacketContent } from "@/types";

// ─── Lazy client ──────────────────────────────────────────────────────────────

let _anthropic: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!_anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("Missing ANTHROPIC_API_KEY environment variable");
    }
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeneratePacketInput {
  child: Child;
  theme: string;
  packetLength: "half" | "full";
  todayNote?: string;
}

// Re-export the canonical type so callers don't need to import from two places
export type { PacketContent as GeneratedPacketContent };

// ─── Generation ───────────────────────────────────────────────────────────────

const STYLE_DESCRIPTIONS: Record<string, string> = {
  visual: "visual learner — responds best to diagrams, color, and seeing ideas laid out",
  "hands-on": "hands-on learner — needs to build, experiment, and move to understand",
  reader: "reader — thrives with books, written instructions, and quiet focus",
  mixed: "flexible — approach varies day to day",
};

export async function generatePacket(
  input: GeneratePacketInput
): Promise<PacketContent> {
  const { child, theme, packetLength, todayNote } = input;

  const gradeDisplay =
    child.grade_level === "K"
      ? "Kindergarten"
      : `Grade ${child.grade_level}`;

  const activityCount = packetLength === "half" ? "3–4" : "5–6";

  const subjects =
    child.favorite_subjects.length > 0
      ? child.favorite_subjects.join(", ")
      : "Math, Reading, Science, Art";

  const styleDesc =
    STYLE_DESCRIPTIONS[child.learning_style] ?? child.learning_style;

  const prompt = `You are creating a warm, personalized homeschool learning packet.

CHILD PROFILE
Name: ${child.name}
Grade: ${gradeDisplay}
Learning style: ${styleDesc}
Favorite subjects: ${subjects}
${child.special_notes ? `About ${child.name}: ${child.special_notes}` : ""}

TODAY'S PACKET
Theme: "${theme}"
Length: ${packetLength === "half" ? "Half day" : "Full day"} — create exactly ${activityCount} activities
${todayNote ? `Parent note for today: ${todayNote}` : ""}

INSTRUCTIONS
Create a cohesive packet where EVERY activity is genuinely connected to the "${theme}" theme. The theme should make each subject feel exciting and relevant to ${child.name}.

MASCOT CHARACTER
- Invent a unique, funny, expressive character that perfectly embodies "${theme}"
- Give them a memorable name ${child.name} will love (e.g., "Rex the Dino Detective", "Stella the Space Explorer")
- Write a vivid visual description for AI image generation: include pose, expression, clothing/accessories, art style
- Description format: "A cute cartoon [character] [doing something fun], [accessories], bright colors, simple clean lines, white background, kid-friendly illustration"
- This mascot appears throughout the packet and stars in the coloring page scene

COLORING PAGE
- Design a fun scene where the mascot is doing something hands-on related to the theme
- Include ${child.name}'s name in the title so it feels personal
- Scene should have clear foreground elements that are fun to color
- Describe enough detail for a fun, not overwhelming, coloring page

Return ONLY valid JSON — no markdown, no extra text:
{
  "packet_title": "${child.name}'s [Theme] Adventure",
  "greeting": "A short, warm, exciting welcome message directly to ${child.name} (2-3 sentences)",
  "mascot_name": "Rex the Dino Detective",
  "mascot_description": "A cute cartoon T-Rex wearing a magnifying glass and tiny detective hat, jumping excitedly with a big smile, bright colors, simple clean lines, white background, kid-friendly illustration",
  "mascot_emoji_cluster": "🦕 🔍 🌋 🦴 🌿",
  "activities": [
    {
      "subject": "Math",
      "title": "How Big Was Megalodon?",
      "description": "Use the megalodon's real measurements to practice comparing large numbers.",
      "instructions": [
        "Megalodons were about 18 meters long. How many of you would that be?",
        "Write this as a multiplication problem: ___ kids × your height = 18m.",
        "Compare: a great white shark is 6m. How many times longer was megalodon?"
      ],
      "estimated_minutes": 25,
      "materials": ["pencil", "paper", "measuring tape (optional)"],
      "answer_key": "If ${child.name} is 1.2m tall, 15 kids. 15 × 1.2 = 18. Megalodon was 3× longer than a great white."
    }
  ],
  "coloring_page": {
    "title": "${child.name} and Rex Explore the Deep Sea",
    "scene_description": "Rex the Dino Detective swimming underwater with a snorkel and flippers, discovering a giant ancient shark tooth on the ocean floor, surrounded by colorful fish and coral, with a treasure map in one hand",
    "instructions": "Color Rex and all his underwater friends! What colors do you think the deep sea creatures are? There are no wrong answers — use your imagination!"
  },
  "daily_reflection": "A thoughtful, age-appropriate question for ${child.name} about what they learned today",
  "parent_notes": "Helpful context for the parent about today's activities and how to support ${child.name}"
}

RULES
- Match age/grade: ${gradeDisplay} — instructions clear enough for ${child.name} to follow independently
- Create exactly ${activityCount} activities covering different subjects
- Activity titles sound exciting, not like textbook chapters
- Instructions: 3–5 concrete, numbered steps
- Estimated time: 15–40 minutes per activity, realistic for ${gradeDisplay}
- Materials: common household items only
- Tone: warm and encouraging, like a beloved teacher wrote this`;

  const message = await getAnthropic().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  return parsePacketResponse(content.text);
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function parsePacketResponse(text: string): PacketContent {
  // Strip markdown code fences if Claude wrapped the JSON
  const cleaned = text
    .replace(/^```json\s*/m, "")
    .replace(/^```\s*/m, "")
    .replace(/```\s*$/m, "")
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON found in Claude response");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Support both "packet_title" (new) and "title" (legacy)
  const title = parsed.packet_title ?? parsed.title;
  if (!title || !Array.isArray(parsed.activities)) {
    throw new Error("Invalid packet structure in Claude response");
  }

  const result: PacketContent = {
    packet_title: parsed.packet_title,
    title: parsed.title,
    activities: parsed.activities,
  };

  // Attach new fields if present
  if (parsed.greeting) result.greeting = parsed.greeting;
  if (parsed.mascot_name) result.mascot_name = parsed.mascot_name;
  if (parsed.mascot_description) result.mascot_description = parsed.mascot_description;
  if (parsed.mascot_emoji_cluster) result.mascot_emoji_cluster = parsed.mascot_emoji_cluster;
  if (parsed.coloring_page) result.coloring_page = parsed.coloring_page;
  if (parsed.daily_reflection) result.daily_reflection = parsed.daily_reflection;
  if (parsed.parent_notes) result.parent_notes = parsed.parent_notes;

  return result;
}
