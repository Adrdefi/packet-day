import Anthropic from "@anthropic-ai/sdk";
import type { Child } from "@/types";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("Missing ANTHROPIC_API_KEY environment variable");
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeneratePacketInput {
  child: Child;
  theme: string;
  packetLength: "half" | "full";
  todayNote?: string;
}

export interface ActivityItem {
  subject: string;
  title: string;
  description: string;
  instructions: string[];
  estimated_minutes: number;
  materials?: string[];
}

export interface GeneratedPacketContent {
  title: string;
  activities: ActivityItem[];
}

// ─── Generation ───────────────────────────────────────────────────────────────

const STYLE_DESCRIPTIONS: Record<string, string> = {
  visual: "visual learner — responds best to diagrams, color, and seeing ideas laid out",
  "hands-on": "hands-on learner — needs to build, experiment, and move to understand",
  reader: "reader — thrives with books, written instructions, and quiet focus",
  mixed: "flexible — approach varies day to day",
};

export async function generatePacket(
  input: GeneratePacketInput
): Promise<GeneratedPacketContent> {
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
Create a cohesive packet where EVERY activity is genuinely connected to the "${theme}" theme — not just a tag-on. The theme should make each subject feel exciting and relevant to ${child.name}.

Return ONLY valid JSON with this exact structure (no markdown fences, no extra text):
{
  "title": "Emma's Megalodon Adventure Day",
  "activities": [
    {
      "subject": "Math",
      "title": "How Big Was Megalodon?",
      "description": "Use the megalodon's real measurements to practice comparing and estimating large numbers.",
      "instructions": [
        "Megalodons were about 18 meters long. How many of you would that be?",
        "Write this as a multiplication problem: ___ kids × your height = 18m.",
        "Now compare: a great white shark is 6m. How many times longer was megalodon?"
      ],
      "estimated_minutes": 25,
      "materials": ["pencil", "paper", "measuring tape (optional)"]
    }
  ]
}

RULES
- Match age/grade: ${gradeDisplay} — instructions should be clear enough for ${child.name} to follow independently
- Create exactly ${activityCount} activities, covering different subjects where possible
- Activity titles should sound exciting, not like textbook chapters
- Instructions: 3–5 concrete, numbered steps
- Estimated time: 15–40 minutes per activity, realistic for ${gradeDisplay}
- Materials: common household items only — no specialty supplies
- Tone: warm and encouraging, like a fun aunt wrote this`;

  const message = await anthropic.messages.create({
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

function parsePacketResponse(text: string): GeneratedPacketContent {
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

  if (!parsed.title || !Array.isArray(parsed.activities)) {
    throw new Error("Invalid packet structure in Claude response");
  }

  return {
    title: parsed.title,
    activities: parsed.activities as ActivityItem[],
  };
}
