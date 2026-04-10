import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { Child } from "@/types";

// Allow up to 90 seconds — streaming generation can take ~60s
export const maxDuration = 90;

// Lazy — only instantiated when the route is actually called
function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

// ─── Quota config ─────────────────────────────────────────────────────────────

const PACKET_LIMITS: Record<string, number> = {
  free: 3,
  pro: Infinity,
  cancelled: 0,
};

// ─── System prompt (exact) ────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a warm, imaginative, and experienced homeschool educator who specializes in creating engaging, theme-based learning packets for children in grades K-8. Your packets are joyful, rigorous, and deeply personalized. You believe that learning is most powerful when it connects to a child's genuine interests and curiosity. Every packet you create should feel like it was made specifically for THIS child, by someone who truly knows and loves teaching them.

DESIGN PRINCIPLES:
- Use the child's name throughout the packet
- Weave the theme into EVERY activity
- Match complexity and vocabulary precisely to the grade level
- Hands-on and kinesthetic activities are always preferred
- Include genuine humor, wonder, and delight
- Answer keys should be complete and easy for a parent to check
- Supply lists should only include household items

GRADE CALIBRATION:
K-1: Very simple, visual, oral instructions okay, 10-15 min activities max
2-3: Simple sentences, concrete math, beginning reading comprehension
4-5: Multi-step problems, paragraph writing, more complex science
6-8: Abstract thinking, essay prompts, algebra-level math, research skills

Respond ONLY with valid JSON. No prose before or after.

ACTIVITY COUNT BY LENGTH:
half day: 4 activities (math, reading, one creative, one pe/movement)
full day: 7 activities (math, reading, writing, science or history, art, pe/movement, independent afternoon activity)`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeneratedActivity {
  subject: string;
  title: string;
  description: string;
  instructions: string[];
  estimated_minutes: number;
  materials?: string[];
  answer_key?: string | null;
}

interface ParsedPacketContent {
  title: string;
  activities: GeneratedActivity[];
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildUserPrompt(
  child: Child,
  theme: string,
  packetLength: "half" | "full",
  specialNotes?: string,
  date?: string
): string {
  const gradeDisplay =
    child.grade_level === "K" ? "Kindergarten" : `Grade ${child.grade_level}`;
  const activityCount = packetLength === "half" ? 4 : 7;
  const subjectList =
    packetLength === "half"
      ? "math, reading, one creative activity, one PE/movement break"
      : "math, reading, writing, science or history, art, PE/movement, one independent afternoon activity";

  return `Create a ${packetLength === "half" ? "half day" : "full day"} learning packet for ${child.name}.

CHILD PROFILE:
- Name: ${child.name}
- Grade: ${gradeDisplay}
- Learning style: ${child.learning_style}
- Favorite subjects: ${child.favorite_subjects.length > 0 ? child.favorite_subjects.join(", ") : "varied"}
${child.special_notes ? `- About ${child.name}: ${child.special_notes}` : ""}
${specialNotes ? `- Parent note for today: ${specialNotes}` : ""}

TODAY'S THEME: "${theme}"
${date ? `Date: ${date}` : ""}

Create exactly ${activityCount} activities covering: ${subjectList}.

Return a JSON object with this exact structure:
{
  "title": "${child.name}'s [Theme] Adventure Day",
  "activities": [
    {
      "subject": "Math",
      "title": "Activity title here",
      "description": "One sentence describing the activity.",
      "instructions": ["Step 1", "Step 2", "Step 3"],
      "estimated_minutes": 25,
      "materials": ["pencil", "paper"],
      "answer_key": "Complete answers for parent, or null if not applicable"
    }
  ]
}`;
}

// ─── Claude call (streaming for perceived speed + Vercel timeout safety) ───────

async function callClaude(userPrompt: string): Promise<string> {
  const stream = getAnthropic().messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const message = await stream.finalMessage();
  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }
  return content.text;
}

// ─── JSON parser ──────────────────────────────────────────────────────────────

function parsePacketJSON(text: string): ParsedPacketContent {
  const cleaned = text
    .replace(/^```json\s*/m, "")
    .replace(/^```\s*/m, "")
    .replace(/```\s*$/m, "")
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON object found in response");

  const parsed = JSON.parse(jsonMatch[0]);

  if (
    typeof parsed.title !== "string" ||
    !Array.isArray(parsed.activities) ||
    parsed.activities.length === 0
  ) {
    throw new Error("Invalid packet structure — missing title or activities");
  }

  return parsed as ParsedPacketContent;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // ── Auth ──────────────────────────────────────────────────────────────────
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You need to be logged in to generate a packet." },
        { status: 401 }
      );
    }

    // ── Validate body ─────────────────────────────────────────────────────────
    const body = await req.json();
    const { childId, theme, packetLength, specialNotes, date } = body;

    if (
      !childId ||
      typeof theme !== "string" ||
      !theme.trim() ||
      !["half", "full"].includes(packetLength)
    ) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    // ── Quota check ───────────────────────────────────────────────────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status, packets_used_this_month")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    const limit = PACKET_LIMITS[profile.subscription_status] ?? 3;

    if (profile.packets_used_this_month >= limit) {
      return NextResponse.json(
        {
          error: "limit_reached",
          message: "You've used all 3 free packets this month.",
          upgradeUrl: "/pricing",
        },
        { status: 403 }
      );
    }

    // ── Fetch child (ownership enforced by RLS + explicit filter) ─────────────
    const { data: child } = await supabase
      .from("children")
      .select("*")
      .eq("id", childId)
      .eq("user_id", user.id)
      .single();

    if (!child) {
      return NextResponse.json({ error: "Child not found." }, { status: 404 });
    }

    // ── Generate via Claude (with one retry on malformed JSON) ────────────────
    const userPrompt = buildUserPrompt(
      child as Child,
      theme.trim(),
      packetLength,
      specialNotes?.trim(),
      date
    );

    let generatedContent: ParsedPacketContent;

    try {
      const responseText = await callClaude(userPrompt);
      generatedContent = parsePacketJSON(responseText);
    } catch (firstErr) {
      console.warn("[generate-packet] First attempt failed, retrying:", firstErr);

      // Retry once with a stricter prompt that reinforces JSON-only output
      const stricterPrompt =
        userPrompt +
        "\n\nCRITICAL: Return ONLY the raw JSON object. No markdown, no code fences, no text before or after. Just the JSON.";

      try {
        const responseText = await callClaude(stricterPrompt);
        generatedContent = parsePacketJSON(responseText);
      } catch (retryErr) {
        console.error("[generate-packet] Retry failed:", retryErr);
        return NextResponse.json(
          {
            error:
              "Something went wrong generating your packet. Please try again.",
          },
          { status: 500 }
        );
      }
    }

    // ── Save to DB — share_token is auto-generated by the DB default ──────────
    const { data: savedPacket, error: insertError } = await supabase
      .from("packets")
      .insert({
        user_id: user.id,
        child_id: child.id,
        child_name: child.name,
        grade_level: child.grade_level,
        theme: theme.trim(),
        packet_length: packetLength,
        special_notes: specialNotes?.trim() || null,
        generated_content: generatedContent,
      })
      .select()
      .single();

    if (insertError || !savedPacket) {
      console.error("[generate-packet] Failed to save packet:", insertError);
      return NextResponse.json(
        {
          error:
            "Your packet was generated but couldn't be saved. Please try again.",
        },
        { status: 500 }
      );
    }

    // ── Increment usage counter ───────────────────────────────────────────────
    await supabase
      .from("profiles")
      .update({ packets_used_this_month: profile.packets_used_this_month + 1 })
      .eq("id", user.id);

    return NextResponse.json({ packet: savedPacket });
  } catch (err) {
    console.error("[generate-packet] Unexpected error:", err);
    return NextResponse.json(
      { error: "Something went sideways. Let's try that again." },
      { status: 500 }
    );
  }
}
