export const maxDuration = 300;
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse, after } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { Child, PacketContent } from "@/types";
import { generateBothImages } from "@/lib/generateMascotImage";
import { MODEL } from "@/lib/config";

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

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `<role>
You are a curriculum writer creating printable homeschool learning packets for children K-8. Every packet must feel warm, personal, and theme-connected — as though a beloved teacher designed it specifically for this child.
</role>

<critical_formatting_rules>
PLAIN TEXT ONLY in every field except mascot_emoji_cluster.
The PDF renderer uses Nunito, a font that cannot display emoji glyphs. Any emoji outside mascot_emoji_cluster will print as a blank rectangle and ruin the packet.

Banned from all fields except mascot_emoji_cluster:
- Emoji of any kind (faces, animals, objects, symbols, flags)
- Unicode symbols outside standard ASCII punctuation
- Math operators ÷ and × — write "x" for multiplication, write out "divided by" for division

Problem separator in Quick Calculations: use || (double pipe). NEVER use / as a separator between problems. Fractions like "3/4" are fine — the slash is part of the fraction, not a separator.

JSON output: single raw object, no markdown fences, no text before or after. Start with { end with }.
</critical_formatting_rules>

<grade_calibration>
Match complexity exactly to the child's grade. Never mix difficulty levels within one packet.

K-1: Counting 1-20, letters, phonics, addition/subtraction within 10. Very short sentences (5-8 words). Simple vocabulary.
Grade 2: Addition/subtraction within 1000, skip counting, intro to multiplication. Short paragraphs.
Grade 3: Multiplication tables 1-10, division intro, 3-digit arithmetic. Can write 2-3 sentences independently.
Grade 4-5: Multi-step multiplication/division, fractions, decimals, geometry. Paragraph writing. Compare/contrast reasoning.
Grade 6-8: Algebra (one-step through two-step equations), ratios, statistics, geometry (volume, surface area). Essay-level writing. Abstract reasoning and inference.

READING PASSAGE WORD COUNTS — match grade exactly:
K-2:  80-150 words. Simple sentences. Familiar vocabulary. One clear main idea.
3-5: 200-350 words. 2-4 paragraphs. Some new vocabulary (define in context).
6-8: 400-600 words. Full multi-paragraph structure. Inference required.

MATH DIFFICULTY — all problems in one packet must stay in the same grade band:
K-1:  Addition/subtraction within 10 only
Gr 2: Addition/subtraction within 100, intro multiplication (2x, 5x, 10x)
Gr 3: Multiplication 1-10, division intro, 3-digit addition/subtraction
Gr 4: Long multiplication (2-digit x 2-digit), long division, fraction intro
Gr 5: Fractions, decimals to hundredths, percentages, area/perimeter
Gr 6: Ratios, one-step equations, integers, percent problems
Gr 7-8: Two-step equations, linear functions, statistics, geometry volume
</grade_calibration>

<math_structure>
APPLIES ONLY TO math activities (content_type: "worksheet", subject: "Math").
The instructions array must contain exactly three strings:

1. "[MASCOT NAME]'S QUICK CALCULATIONS: [4-6 problems separated by ||]"
   - Pure grade-appropriate arithmetic — no theme required
   - Separate each problem with || (double pipe), not with /
   - Write "x" for multiplication. Write "___ divided by ___ = ___" for division.
   - Progress from easier to harder within the section
   - Example for Grade 3: "MAX'S QUICK CALCULATIONS: 47 + 38 = ___ || 91 - 54 = ___ || 6 x 7 = ___ || 56 divided by 8 = ___"

2. "WORD PROBLEMS: [3-4 story problems separated by ||]"
   - Narrative problems starring the mascot and today's theme
   - Each problem self-contained and solvable with grade-level arithmetic
   - Separate with ||

3. "DRAW & SOLVE: [one visual problem]"
   - The child draws to find the answer (groups, number line, shape, etc.)
   - Include the answer format: "___ x ___ = ___" or "My answer: ___"

Section labels in ALL CAPS at start of string. No emoji. This structure applies ONLY to math.
</math_structure>

<reading_writing_rules>
READING ACTIVITY (content_type: "reading_passage"):
- "passage" field: the full themed reading passage. Must meet the grade-band word count above.
  Theme and mascot should appear in the story.
- "instructions" array: comprehension questions ONLY — never include passage text here.
  Include at least: 1 recall question, 1 vocabulary/inference question, 1 personal connection.
- passage field must be a non-empty string for reading activities.

WRITING ACTIVITY (content_type: "writing_prompt"):
- "instructions" array: opening prompt sentence, then 2-3 scaffolding questions.
  Scaffold from concrete (describe what you see) to creative (what would you do next?).
  Invite the child to use the mascot or theme in their writing.
- "passage" field: null (not needed for writing).

SCIENCE/HISTORY WORKSHEET (content_type: "worksheet"):
- Each instruction step should be substantive — a question worth 3-5 lines of response.
  Not just "draw a picture" — ask for observation, explanation, comparison, or prediction.
</reading_writing_rules>

<output_schema>
{
  "packet_title": "[Name]'s [Theme] Adventure Day — plain text, no emoji",
  "greeting": "2-3 sentences. Warm and direct to the child. Plain text. No emoji.",
  "mascot_name": "Fun character name — no emoji",
  "mascot_description": "A cute cartoon [character] [action], [accessories], bright colors, simple clean lines, white background, kid-friendly illustration",
  "mascot_emoji_cluster": "5-6 emoji representing the theme — ONLY field that may contain emoji",
  "activities": [
    {
      "subject": "Math",
      "content_type": "worksheet",
      "title": "Activity title — no emoji",
      "description": "One sentence summary. Plain text. No emoji.",
      "encouragement": "Personalized hype line using the child's name. References this specific activity. No emoji. Never a generic phrase like 'You've got this!'",
      "passage": null,
      "instructions": ["step or question 1", "step or question 2"],
      "estimated_minutes": 25,
      "materials": ["pencil", "paper"],
      "answer_key": "Parent answers or null"
    }
  ],
  "coloring_page": {
    "title": "[Name] and [Mascot] [Action] — no emoji",
    "scene_description": "Detailed description of the coloring scene",
    "instructions": "Encouraging instructions for the child. Plain text. No emoji."
  },
  "daily_reflection": "Thoughtful age-appropriate question. Plain text. No emoji.",
  "parent_notes": "Context for the parent. Plain text. No emoji."
}

Valid content_type values: "reading_passage" | "worksheet" | "writing_prompt" | "movement_activity" | "coloring"
- reading_passage: put full passage in "passage" field, questions only in "instructions"
- all others: "passage" must be null
</output_schema>`;

// ─── Types ────────────────────────────────────────────────────────────────────

type ParsedPacketContent = PacketContent;

type SSEEvent =
  | { type: "progress"; message: string }
  | { type: "complete"; packet: Record<string, unknown> }
  | { type: "error"; message: string };

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
  const activityCount = packetLength === "half" ? 3 : 5;
  const subjectList =
    packetLength === "half"
      ? "math, reading, one creative or PE activity"
      : "math, reading, writing, science or history, one creative or PE activity";

  // Explicit reading word-count reminder keyed to grade
  const gradeNum = child.grade_level === "K" ? 0 : parseInt(child.grade_level, 10);
  const readingWordCount =
    gradeNum <= 2 ? "80-150 words" : gradeNum <= 5 ? "200-350 words" : "400-600 words";

  return `<child_profile>
Name: ${child.name}
Grade: ${gradeDisplay}
Learning style: ${child.learning_style}
Favorite subjects: ${child.favorite_subjects.length > 0 ? child.favorite_subjects.join(", ") : "varied"}${child.special_notes ? `\nAbout ${child.name}: ${child.special_notes}` : ""}${specialNotes ? `\nParent note for today: ${specialNotes}` : ""}
</child_profile>

<packet_request>
Type: ${packetLength === "half" ? "Half-day" : "Full-day"} — exactly ${activityCount} activities
Theme: "${theme}"${date ? `\nDate: ${date}` : ""}
Subjects to cover: ${subjectList}
</packet_request>

<grade_reminders>
Grade: ${gradeDisplay}
Reading passage for this grade: ${readingWordCount}
All math must stay within the ${gradeDisplay} difficulty band — do not go easier or harder.
Zero emoji outside mascot_emoji_cluster. Plain text everywhere else.
</grade_reminders>

Create the packet now. Return only the JSON object.`;
}

// ─── Claude call — streams tokens ─────────────────────────────────────────────

async function callClaude(
  userPrompt: string,
  packetLength: "half" | "full",
  onToken: (text: string) => void
): Promise<string> {
  const maxTokens = packetLength === "half" ? 4500 : 7000;

  const stream = getAnthropic().messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    temperature: 0.7,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  let fullText = "";

  for await (const chunk of stream) {
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta"
    ) {
      fullText += chunk.delta.text;
      onToken(chunk.delta.text);
    }
  }

  return fullText;
}

// ─── JSON extraction (balanced-brace, respects string literals) ──────────────

function extractFirstJSON(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }

    if (!inString) {
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

// ─── JSON parser ──────────────────────────────────────────────────────────────

function parsePacketJSON(text: string): ParsedPacketContent {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();
  const jsonString = extractFirstJSON(cleaned);
  if (!jsonString) throw new Error("No JSON object found in response");

  const parsed = JSON.parse(jsonString);

  const hasTitle =
    typeof parsed.packet_title === "string" ||
    typeof parsed.title === "string";

  if (!hasTitle || !Array.isArray(parsed.activities) || parsed.activities.length === 0) {
    throw new Error("Invalid packet structure — missing title or activities");
  }

  const result: ParsedPacketContent = {
    packet_title: parsed.packet_title,
    title: parsed.title,
    activities: parsed.activities,
  };

  if (parsed.greeting) result.greeting = parsed.greeting;
  if (parsed.mascot_name) result.mascot_name = parsed.mascot_name;
  if (parsed.mascot_description) result.mascot_description = parsed.mascot_description;
  if (parsed.mascot_emoji_cluster) result.mascot_emoji_cluster = parsed.mascot_emoji_cluster;
  if (parsed.coloring_page) result.coloring_page = parsed.coloring_page;
  if (parsed.daily_reflection) result.daily_reflection = parsed.daily_reflection;
  if (parsed.parent_notes) result.parent_notes = parsed.parent_notes;

  return result;
}

// ─── SSE helper ───────────────────────────────────────────────────────────────

function encodeSSE(event: SSEEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "You need to be logged in to generate a packet." },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { childId, theme, packetLength, specialNotes, date } = body as {
    childId?: string;
    theme?: string;
    packetLength?: string;
    specialNotes?: string;
    date?: string;
  };

  if (
    !childId ||
    typeof theme !== "string" ||
    !theme.trim() ||
    !["half", "full"].includes(packetLength ?? "")
  ) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400 }
    );
  }

  const typedPacketLength = packetLength as "half" | "full";

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

  const { data: child } = await supabase
    .from("children")
    .select("*")
    .eq("id", childId)
    .eq("user_id", user.id)
    .single();

  if (!child) {
    return NextResponse.json({ error: "Child not found." }, { status: 404 });
  }

  const userPrompt = buildUserPrompt(
    child as Child,
    theme.trim(),
    typedPacketLength,
    specialNotes?.trim(),
    date
  );

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: SSEEvent) {
        controller.enqueue(encodeSSE(event));
      }

      try {
        send({ type: "progress", message: `Creating ${child.name}'s packet...` });

        let generatedContent: ParsedPacketContent;
        let tokenCount = 0;

        const onToken = () => {
          tokenCount++;
          if (tokenCount % 200 === 0) {
            send({ type: "progress", message: "Crafting your activities..." });
          }
        };

        try {
          const responseText = await callClaude(userPrompt, typedPacketLength, onToken);
          generatedContent = parsePacketJSON(responseText);
        } catch (err) {
          console.error("[generate-packet] Generation failed:", {
            message: err instanceof Error ? err.message : String(err),
            childId,
            theme: theme.trim(),
            packetLength: typedPacketLength,
          });
          send({
            type: "error",
            message: "Something went wrong generating your packet. Please try again.",
          });
          controller.close();
          return;
        }

        const { data: savedPacket, error: insertError } = await supabase
          .from("packets")
          .insert({
            user_id: user.id,
            child_id: child.id,
            child_name: child.name,
            grade_level: child.grade_level,
            theme: theme.trim(),
            packet_length: typedPacketLength,
            special_notes: specialNotes?.trim() || null,
            generated_content: generatedContent,
          })
          .select()
          .single();

        if (insertError || !savedPacket) {
          console.error("[generate-packet] Failed to save packet to DB:", {
            message: insertError?.message,
            code: insertError?.code,
            details: insertError?.details,
          });
          send({
            type: "error",
            message: "Your packet was generated but couldn't be saved. Please try again.",
          });
          controller.close();
          return;
        }

        await supabase
          .from("profiles")
          .update({ packets_used_this_month: profile.packets_used_this_month + 1 })
          .eq("id", user.id);

        const packetId = savedPacket.id;
        const mascotDescription = generatedContent.mascot_description;

        // Guard before after() so a missing env var doesn't crash the background task
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (mascotDescription && supabaseUrl && serviceKey) {
          after(async () => {
            // Generate both images in parallel — eliminates the old sequential
            // pattern (mascot → 2 s sleep → coloring) that timed out on Hobby.
            const { mascotImageUrl, coloringImageUrl } = await generateBothImages(mascotDescription);

            const updates: Record<string, string> = {};
            if (mascotImageUrl) updates.mascot_image_url = mascotImageUrl;
            if (coloringImageUrl) updates.coloring_image_url = coloringImageUrl;
            if (Object.keys(updates).length === 0) return;

            const serviceClient = createServiceClient(supabaseUrl, serviceKey);
            const { error: updateError } = await serviceClient
              .from("packets")
              .update(updates)
              .eq("id", packetId);
            if (updateError) {
              console.error("[generate-packet] Failed to save image URLs:", updateError.message);
            }
          });
        } else if (!mascotDescription) {
          console.warn("[generate-packet] No mascot_description in generated content — skipping image generation");
        }

        send({
          type: "complete",
          packet: { ...savedPacket, mascot_image_url: null },
        });
        controller.close();
      } catch (err) {
        console.error("[generate-packet] Unhandled exception in stream:", {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
        try {
          controller.enqueue(
            encodeSSE({ type: "error", message: "Something went sideways. Let's try that again." })
          );
          controller.close();
        } catch {
          // controller may already be closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
