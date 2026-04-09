import Anthropic from "@anthropic-ai/sdk";
import type { Child, PacketActivity, SubjectArea } from "@/types";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("Missing ANTHROPIC_API_KEY environment variable");
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface GeneratePacketOptions {
  child: Child;
  theme: string;
  subjects: SubjectArea[];
  date: string;
}

export interface GeneratedPacket {
  title: string;
  activities: PacketActivity[];
  prompt: string;
}

export async function generatePacket(
  options: GeneratePacketOptions
): Promise<GeneratedPacket> {
  const { child, theme, subjects, date } = options;

  const prompt = buildPacketPrompt(child, theme, subjects, date);

  const message = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  const parsed = parsePacketResponse(content.text);
  return { ...parsed, prompt };
}

function buildPacketPrompt(
  child: Child,
  theme: string,
  subjects: SubjectArea[],
  date: string
): string {
  const interestsList = child.interests.join(", ");
  const subjectsList = subjects.join(", ");

  return `You are creating a personalized homeschool learning packet for a child.

Child: ${child.name}, age ${child.age}, grade ${child.grade_level}
Interests: ${interestsList}
Learning style: ${child.learning_style ?? "not specified"}
Theme: ${theme}
Date: ${date}
Subjects to cover: ${subjectsList}
${child.notes ? `Parent notes: ${child.notes}` : ""}

Create a warm, engaging learning packet that weaves the "${theme}" theme throughout all activities. Each activity should feel fun and connected to something ${child.name} loves.

Return your response as valid JSON with this exact structure:
{
  "title": "packet title",
  "activities": [
    {
      "subject": "math",
      "title": "activity title",
      "description": "brief description",
      "instructions": ["step 1", "step 2"],
      "estimated_minutes": 20,
      "materials": ["paper", "pencil"]
    }
  ]
}

Rules:
- One activity per subject requested
- Keep instructions clear and age-appropriate for grade ${child.grade_level}
- Tie every activity to the "${theme}" theme naturally
- Estimated time should be realistic (15–45 min per activity)
- Materials should be common household items
- Tone: encouraging and fun, never clinical`;
}

function parsePacketResponse(text: string): Omit<GeneratedPacket, "prompt"> {
  // Extract JSON from the response (Claude may wrap it in markdown)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON found in Claude response");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  if (!parsed.title || !Array.isArray(parsed.activities)) {
    throw new Error("Invalid packet structure in Claude response");
  }

  return {
    title: parsed.title,
    activities: parsed.activities as PacketActivity[],
  };
}
