export const maxDuration = 300;
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { Child, PacketContent } from "@/types";
import { generateBothImages } from "@/lib/generateMascotImage";
import { MODEL } from "@/lib/config";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Lazy — only instantiated when the route is actually called
function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

// Service-role client — required because check_and_increment_packet_usage and
// decrement_packet_usage are granted to service_role only, not authenticated.
// Same pattern as app/api/webhooks/stripe/route.ts's getServiceClient().
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createSupabaseClient(url, key);
}

// ─── Quota config ─────────────────────────────────────────────────────────────

const PACKET_LIMITS: Record<string, number | null> = {
  free: 1,
  pro: null, // null = unlimited — RPC params are JSON, which has no Infinity
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

SCIENCE/HISTORY WORKSHEET (content_type: "worksheet", subject is NOT Math):
- The instructions array must contain a specific number of steps, by grade:
  K-2:  4-5 steps
  Gr 3-5: 5-6 steps
  Gr 6-8: 6-7 steps
- Each instruction step must be substantive — a question worth 3-5 lines of
  written response. Not just "draw a picture" — ask for observation,
  explanation, comparison, or prediction.
- Vary the question types across the steps. Do not ask five versions of the
  same question. Include at least one observation question, at least one
  explanation or "why" question, and at least one prediction or comparison.
- These counts are a floor for page fill. A short worksheet leaves the printed
  page half empty, which looks unfinished.
</reading_writing_rules>

<coloring_page_rules>
SINGLE SOURCE OF TRUTH: coloring_scene is the canonical description of the coloring image.
- coloring_scene must list: the child and mascot (by name), the setting, and exactly 3-5 specific named objects.
- coloring_page.title must reference ONLY characters and objects that appear in coloring_scene. No new elements.
- coloring_page.instructions must reference ONLY characters and objects that appear in coloring_scene. No new elements.
- coloring_scene is passed verbatim to the image generator — make it concrete and visual, not vague.
  BAD: "Aria and Bubbles having a fun ocean adventure"
  GOOD: "Aria and Bubbles the seahorse float in an underwater cave surrounded by a treasure chest, three starfish, a coral arch, and a school of tiny blue fish"
</coloring_page_rules>

<output_schema>
{
  "packet_title": "[Name]'s [Theme] Adventure Day — plain text, no emoji",
  "greeting": "2-3 sentences. Warm and direct to the child. Plain text. No emoji.",
  "packet_mission": "2-3 sentences. The mascot gives the child a themed quest ('Your mission today is to...'). Direct address. Mascot's voice. Plain text. No emoji.",
  "packet_celebration": "2-3 sentences. Mascot's victory message for the final page. References specific activities the child completed. Warm and celebratory. Plain text. No emoji.",
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
      "fun_fact": "One themed wow-fact or kid-appropriate joke related to this activity. One sentence. Surprising and specific. Plain text. No emoji.",
      "passage": null,
      "instructions": ["step or question 1", "step or question 2"],
      "estimated_minutes": 25,
      "materials": ["pencil", "paper"],
      "answer_key": "Parent answers or null"
    }
  ],
  "coloring_page": {
    "title": "[Name] and [Mascot] [Action] — no emoji",
    "coloring_scene": "Concrete visual description: who is in the scene, the setting, and exactly 3-5 specific objects present. Example: 'Lily and Spark the dragon stand on a pirate ship deck surrounded by a treasure chest, a ship's wheel, three cannons, and a jolly roger flag.' This text is passed verbatim to the image generator — it must be specific, visual, and match the title exactly.",
    "instructions": "Encouraging instructions for the child referencing ONLY characters and objects named in coloring_scene. Plain text. No emoji."
  },
  "daily_reflection": "Thoughtful age-appropriate question. Plain text. No emoji.",
  "parent_notes": "Context for the parent. Plain text. No emoji."
}

Valid content_type values: "reading_passage" | "worksheet" | "writing_prompt" | "movement_activity" | "coloring" | "puzzle_break"
- reading_passage: put full passage in "passage" field, questions only in "instructions"
- puzzle_break: instructions array must be a list of 6-10 themed WORDS (uppercase, letters only, 3-10 characters each). No sentences — just the words to find. passage must be null.
- all others: "passage" must be null
</output_schema>

<puzzle_break_rules>
For FULL-DAY packets (6 activities), include a puzzle_break as the 4th activity — after the 3rd subject activity.
The puzzle_break uses content_type "puzzle_break" and subject "Puzzle Break".
The instructions array must be EXACTLY a list of 6-10 themed words for the word search grid.
Each word: uppercase letters only, 3-10 characters, no spaces, no punctuation.
Example for an Ocean theme: ["OCEAN", "WAVE", "CORAL", "SHARK", "ANCHOR", "TIDE", "REEF", "KELP"]
The word search grid is generated automatically from this word list and printed on the page, fully solvable — never tell parents it needs to be hand-drawn or generated separately, and never say the word list is in the answer key.
The fun_fact for a puzzle_break should be an interesting fact about word searches or language.
Do NOT include a puzzle_break in half-day packets.
</puzzle_break_rules>

<movement_break_rules>
For FULL-DAY packets (6 activities), include a movement_break as the 5th activity — immediately after the puzzle_break, forming a combined brain-break block before the final subject activity.
The movement_break uses content_type "movement_activity" and subject "Movement Break".
This is a SHORT ENERGIZER (5–10 minutes), NOT a PE lesson. Keep it light and fun — a themed stretch, dance, or active game the child can do alone or with a sibling. Do not include curriculum content, vocabulary, or anything that requires reading or concentration.
The instructions array should contain 3–6 simple, physical steps the child can follow immediately (e.g., "Hop like a dolphin 10 times!", "Spin in a circle and roar like a shark!"). Write them in the child's voice, enthusiastic and themed to the packet.
No answer_key. No materials beyond what any child would have in their home.
The fun_fact should be a quick wow-fact about the body, movement, or exercise — themed to the packet if possible.
Do NOT include a movement_break in half-day packets.
</movement_break_rules>`;

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
  const activityCount = packetLength === "half" ? 3 : 6;
  const subjectList =
    packetLength === "half"
      ? "math, reading, one creative or PE activity"
      : "math, reading, writing, puzzle_break (activity 4), movement_break (activity 5), science or history or PE";

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
  const maxTokens = packetLength === "half" ? 5000 : 8500;

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
  if (parsed.packet_mission) result.packet_mission = parsed.packet_mission;
  if (parsed.packet_celebration) result.packet_celebration = parsed.packet_celebration;
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
    .select("subscription_status")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const limit =
    profile.subscription_status in PACKET_LIMITS
      ? PACKET_LIMITS[profile.subscription_status]
      : 0;

  const serviceClient = getServiceClient();
  const { data: usageRows, error: usageError } = await serviceClient.rpc(
    "check_and_increment_packet_usage",
    { p_user_id: user.id, p_limit: limit }
  );

  if (usageError) {
    console.error("[generate-packet] Quota check failed:", usageError.message);
    return NextResponse.json(
      { error: "Something went sideways checking your plan. Please try again." },
      { status: 500 }
    );
  }

  if (!usageRows || usageRows.length === 0) {
    return NextResponse.json(
      {
        error: "limit_reached",
        message: "You've used your free packet this month.",
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
    await serviceClient.rpc("decrement_packet_usage", { p_user_id: user.id });
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

      let packetSaved = false; // guards the outer catch below from double/wrongly refunding

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
          const { error: rollbackError } = await serviceClient.rpc("decrement_packet_usage", {
            p_user_id: user.id,
          });
          if (rollbackError) {
            console.error(
              "[generate-packet] Failed to roll back quota after generation failure:",
              rollbackError.message
            );
          }
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
          const { error: saveRollbackError } = await serviceClient.rpc("decrement_packet_usage", {
            p_user_id: user.id,
          });
          if (saveRollbackError) {
            console.error(
              "[generate-packet] Failed to roll back quota after save failure:",
              saveRollbackError.message
            );
          }
          send({
            type: "error",
            message: "Your packet was generated but couldn't be saved. Please try again.",
          });
          controller.close();
          return;
        }

        packetSaved = true;
        const packetId = savedPacket.id;
        const mascotDescription = generatedContent.mascot_description;
        const coloringScene = generatedContent.coloring_page?.coloring_scene ?? null;

        // Generate images in the foreground while the SSE connection is still alive.
        // Replicate's internal polling loop hangs inside after() because Vercel's
        // connection pool degrades after the response is sent. Running here keeps
        // the connection active so the SDK's fetch calls complete normally.
        let mascotImageUrl: string | null = null;
        let coloringImageUrl: string | null = null;

        if (mascotDescription) {
          send({ type: "progress", message: "Generating mascot and coloring page images..." });
          ({ mascotImageUrl, coloringImageUrl } = await generateBothImages(
            mascotDescription,
            coloringScene
          ));

          const updates: Record<string, string> = {};
          if (mascotImageUrl) updates.mascot_image_url = mascotImageUrl;
          if (coloringImageUrl) updates.coloring_image_url = coloringImageUrl;
          if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
              .from("packets")
              .update(updates)
              .eq("id", packetId);
            if (updateError) {
              console.error("[generate-packet] Failed to save image URLs:", updateError.message);
            }
          }
        } else {
          console.warn("[generate-packet] No mascot_description — skipping image generation");
        }

        send({
          type: "complete",
          packet: {
            ...savedPacket,
            mascot_image_url: mascotImageUrl,
            coloring_image_url: coloringImageUrl,
          },
        });
        controller.close();
      } catch (err) {
        console.error("[generate-packet] Unhandled exception in stream:", {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
        if (!packetSaved) {
          const { error: outerRollbackError } = await serviceClient.rpc("decrement_packet_usage", {
            p_user_id: user.id,
          });
          if (outerRollbackError) {
            console.error(
              "[generate-packet] Failed to roll back quota after unhandled exception:",
              outerRollbackError.message
            );
          }
        }
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
