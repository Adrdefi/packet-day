export const maxDuration = 300;
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { Child, PacketContent } from "@/types";
import { generateBothImages, type ImageGenResult } from "@/lib/generateMascotImage";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/packetPrompt";
import { bandForGrade } from "@/lib/pdf-tokens";
import { attachPuzzleBreak } from "@/lib/puzzles/attach";
import { buildPuzzleBrief } from "@/lib/puzzles/brief";
import { normalizeJoke, type PuzzleJoke } from "@/lib/puzzles/jokes";
import { newPuzzleSeed } from "@/lib/puzzles/random";
import { pickPuzzleType } from "@/lib/puzzles/rotation";
import { MODEL, MODELS_WITH_TEMPERATURE, THINKING_MODEL_MAX_TOKENS } from "@/lib/config";
import { estimatePacketCostUsd, type ClaudeUsage } from "@/lib/aiCost";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { renderAndCachePacketPdf, buildFilename } from "@/lib/packetPdfRender";
import type { PacketPDFProps, PDFActivity, PDFColoringPage } from "@/components/PacketPDF";
import { sendPacketReadyEmail } from "@/lib/resend";
import { track } from "@vercel/analytics/server";
import sharp from "sharp";
import {
  buildClassicTitle,
  buildTitleBrief,
  childFirstName,
  isTitleStyle,
  normalizeTitleStyle,
  pickTitleStyle,
  titleRejectionReason,
  type TitleStyle,
} from "@/lib/titleStyles";

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
  cancelled: 1, // cancelling drops you back to the free tier, not below it
};

// ─── Types ────────────────────────────────────────────────────────────────────

type ParsedPacketContent = PacketContent;

type SSEEvent =
  | { type: "progress"; message: string }
  | { type: "complete"; packet: Record<string, unknown> }
  | { type: "error"; message: string };

// ─── Claude call — streams tokens ─────────────────────────────────────────────

interface ClaudeCallResult {
  text: string;
  /** Real usage from the final streamed message; null if it couldn't be read. */
  usage: ClaudeUsage | null;
  durationMs: number;
}

async function callClaude(
  userPrompt: string,
  packetLength: "half" | "full",
  onToken: (text: string) => void
): Promise<ClaudeCallResult> {
  const maxTokens = packetLength === "half" ? 5000 : 8500;
  const startMs = Date.now();

  const legacyModel = MODELS_WITH_TEMPERATURE.has(MODEL);
  const stream = getAnthropic().messages.stream({
    model: MODEL,
    max_tokens: legacyModel ? maxTokens : THINKING_MODEL_MAX_TOKENS,
    ...(legacyModel ? { temperature: 0.7 } : {}),
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

  // The stream has already ended, so this resolves immediately. Usage is
  // cost logging only — a failure here must never fail the packet.
  let usage: ClaudeUsage | null = null;
  try {
    const finalMessage = await stream.finalMessage();
    usage = {
      inputTokens: finalMessage.usage.input_tokens,
      outputTokens: finalMessage.usage.output_tokens,
      cacheReadTokens: finalMessage.usage.cache_read_input_tokens ?? 0,
      cacheWriteTokens: finalMessage.usage.cache_creation_input_tokens ?? 0,
    };
  } catch (err) {
    console.error("[generate-packet] Couldn't read Claude usage (non-fatal):", {
      message: err instanceof Error ? err.message : String(err),
    });
  }

  return { text: fullText, usage, durationMs: Date.now() - startMs };
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

function parsePacketJSON(text: string, requestedStyle: TitleStyle): ParsedPacketContent {
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
    // The model may switch styles if the requested one fits the theme badly;
    // anything missing or outside the six falls back to what we asked for.
    title_style: isTitleStyle(parsed.title_style) ? parsed.title_style : requestedStyle,
    requested_style: requestedStyle,
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

// ─── Mascot image upload ────────────────────────────────────────────────────

/**
 * Decodes and uploads the mascot image to the public "packet-mascots" bucket,
 * returning a short hosted URL to store in packets.mascot_image_url (instead
 * of the ~500KB base64 data URL) and to hand the packet-ready email as a
 * hosted <img src> (most email clients block data URLs outright, and one
 * would blow past Gmail's ~102KB HTML clipping threshold on its own).
 *
 * `mascotImageUrl` has three possible shapes coming out of generateMascotImage:
 * a "data:image/...;base64,..." URL (the normal case), a direct Replicate URL
 * (the fallback used when generateMascotImage's own base64 fetch fails —
 * expires in ~1hr, not worth re-hosting as a "permanent" asset), or null
 * (mascot generation failed or was skipped entirely). Only the first case
 * produces a hosted URL; the other two are treated as "no hosted image" and
 * return null — the caller falls back to writing the base64 (or nothing) to
 * the column, and the email falls back to sending without a hero image.
 *
 * Never throws — every failure path logs and returns null. A failed upload
 * must never leave the packet worse off than storing the base64 directly.
 */
async function uploadMascotImage(
  supabase: SupabaseClient,
  mascotImageUrl: string | null,
  userId: string,
  packetId: string
): Promise<string | null> {
  if (!mascotImageUrl) return null;

  if (!mascotImageUrl.startsWith("data:")) {
    console.warn(
      "[generate-packet] mascotImageUrl is not a data URL (likely the expiring-Replicate-URL fallback) — skipping mascot upload for email",
      { packetId }
    );
    return null;
  }

  const match = mascotImageUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) {
    console.error(
      "[generate-packet] mascotImageUrl data URL didn't match the expected format — skipping mascot upload",
      { packetId }
    );
    return null;
  }

  const [, contentType, base64Payload] = match;
  const storagePath = `${userId}/${packetId}.png`;

  try {
    const buffer = Buffer.from(base64Payload, "base64");
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("packet-mascots")
      .upload(storagePath, buffer, { contentType, upsert: true });

    if (uploadError || !uploadData) {
      console.error("[generate-packet] Mascot image upload failed:", {
        message: uploadError?.message,
        packetId,
        userId,
        storagePath,
      });
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("packet-mascots").getPublicUrl(uploadData.path);
    return publicUrl;
  } catch (err) {
    console.error("[generate-packet] Mascot image upload threw:", {
      message: err instanceof Error ? err.message : String(err),
      packetId,
      userId,
      storagePath,
    });
    return null;
  }
}

// ─── Coloring image upload ──────────────────────────────────────────────────

/**
 * Uploads the coloring page to the public "packet-coloring-pages" bucket and
 * returns its public URL, so packets.coloring_image_url holds a short URL
 * instead of a ~1MB base64 data URL. Same encoding as
 * scripts/backfill-image-storage.ts: one sharp decode into a palette PNG,
 * no WebP output and no lossy step (this is printed line art).
 *
 * Never throws — every failure path logs and returns null, and the caller
 * then writes the base64 exactly as before, so a packet never loses its
 * coloring page. The PDF pre-render keeps using the in-memory base64 either
 * way, so it never depends on this upload.
 */
async function uploadColoringImage(
  supabase: SupabaseClient,
  coloringImageUrl: string | null,
  userId: string,
  packetId: string
): Promise<string | null> {
  if (!coloringImageUrl) return null;

  const match = coloringImageUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    console.error(
      "[generate-packet] coloringImageUrl is not a base64 data URL — skipping coloring upload",
      { packetId }
    );
    return null;
  }

  const storagePath = `${userId}/${packetId}.png`;

  try {
    const original = Buffer.from(match[2], "base64");
    const compressed = await sharp(original).png({ palette: true }).toBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("packet-coloring-pages")
      .upload(storagePath, compressed, { contentType: "image/png", upsert: true });

    if (uploadError || !uploadData) {
      console.error("[generate-packet] Coloring image upload failed:", {
        message: uploadError?.message,
        packetId,
        userId,
        storagePath,
      });
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("packet-coloring-pages").getPublicUrl(uploadData.path);
    return publicUrl;
  } catch (err) {
    console.error("[generate-packet] Coloring image upload threw:", {
      message: err instanceof Error ? err.message : String(err),
      packetId,
      userId,
      storagePath,
    });
    return null;
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

// Images must finish this long after the request starts, leaving the rest
// of maxDuration (300 s) for the mascot upload, the PDF pre-render, and the
// packet-ready email. lib/generateMascotImage.ts caps every attempt, retry,
// and fallback to this deadline.
const IMAGE_DEADLINE_AFTER_START_MS = 240_000;

export async function POST(req: NextRequest) {
  const requestStartMs = Date.now();
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

  const { childId, theme, packetLength, specialNotes, date, clientRequestId } = body as {
    childId?: string;
    theme?: string;
    packetLength?: string;
    specialNotes?: string;
    date?: string;
    clientRequestId?: string;
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
    try {
      await track("limit_reached");
    } catch (err) {
      console.error("[generate-packet] Failed to record limit_reached event:", err);
    }
    try {
      const { error: capUpdateError } = await serviceClient
        .from("profiles")
        .update({ last_cap_hit_at: new Date().toISOString() })
        .eq("id", user.id);
      if (capUpdateError) {
        console.error("[generate-packet] Failed to record last_cap_hit_at:", capUpdateError.message);
      }
    } catch (err) {
      console.error(
        "[generate-packet] Failed to record last_cap_hit_at:",
        err instanceof Error ? err.message : String(err)
      );
    }
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

  // Title history for this child, read with the user's own session so RLS
  // applies. Never fatal: a failed read just means no history (style picked
  // as if the last one were classic, and no packet number).
  let packetNumber: number | null = null;
  let recentTitles: string[] = [];
  let previousStyle: TitleStyle = "classic";
  // Puzzle history: the child's last 10 FULL DAY packets (half day packets
  // have no puzzle break). A missing type counts as word search.
  let previousPuzzleType: unknown = null;
  let recentJokes: PuzzleJoke[] = [];
  try {
    const [countResult, recentResult, puzzleResult] = await Promise.all([
      supabase
        .from("packets")
        .select("id", { count: "exact", head: true })
        .eq("child_id", child.id),
      supabase
        .from("packets")
        .select("generated_content->packet_title, generated_content->title, generated_content->title_style")
        .eq("child_id", child.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("packets")
        .select("generated_content->puzzle_type, generated_content->joke")
        .eq("child_id", child.id)
        .eq("packet_length", "full")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    if (countResult.error) {
      console.error("[generate-packet] Packet count query failed:", countResult.error.message);
    } else if (typeof countResult.count === "number") {
      packetNumber = countResult.count + 1;
    }
    if (recentResult.error) {
      console.error("[generate-packet] Recent titles query failed:", recentResult.error.message);
    } else if (recentResult.data) {
      const rows = recentResult.data as { packet_title: unknown; title: unknown; title_style: unknown }[];
      recentTitles = rows
        .map((r) => r.packet_title ?? r.title)
        .filter((t): t is string => typeof t === "string" && t.trim().length > 0);
      if (rows.length > 0) previousStyle = normalizeTitleStyle(rows[0].title_style);
    }
    if (puzzleResult.error) {
      console.error("[generate-packet] Puzzle history query failed:", puzzleResult.error.message);
    } else if (puzzleResult.data) {
      const rows = puzzleResult.data as { puzzle_type: unknown; joke: unknown }[];
      if (rows.length > 0) previousPuzzleType = rows[0].puzzle_type;
      recentJokes = rows.map((r) => normalizeJoke(r.joke)).filter((j): j is PuzzleJoke => j !== null);
    }
  } catch (err) {
    console.error(
      "[generate-packet] Title history lookup threw:",
      err instanceof Error ? err.message : String(err)
    );
  }

  // Episode needs a real number; without one, re-pick until it isn't episode.
  let requestedStyle = pickTitleStyle(previousStyle);
  while (requestedStyle === "episode" && packetNumber === null) {
    requestedStyle = pickTitleStyle(previousStyle);
  }

  // The server picks the puzzle type before the AI call, never the child's
  // previous one. Half day packets have no puzzle break.
  const requestedPuzzleType = typedPacketLength === "full" ? pickPuzzleType(previousPuzzleType) : null;

  const userPrompt = buildUserPrompt(
    child as Child,
    theme.trim(),
    typedPacketLength,
    specialNotes?.trim(),
    date,
    buildTitleBrief({
      childName: child.name,
      gradeLevel: child.grade_level,
      theme: theme.trim(),
      style: requestedStyle,
      packetNumber,
      recentTitles,
    }),
    requestedPuzzleType
      ? buildPuzzleBrief({
          type: requestedPuzzleType,
          band: bandForGrade(child.grade_level),
          childFirstName: childFirstName(child.name),
          theme: theme.trim(),
          recentJokes,
        })
      : null
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
        let claudeCall: ClaudeCallResult;
        let tokenCount = 0;

        const onToken = () => {
          tokenCount++;
          if (tokenCount % 200 === 0) {
            send({ type: "progress", message: "Crafting your activities..." });
          }
        };

        try {
          claudeCall = await callClaude(userPrompt, typedPacketLength, onToken);
          generatedContent = parsePacketJSON(claudeCall.text, requestedStyle);
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

        // Safety net: a title the cover can't use is replaced with the classic
        // title built in code. Logged after the insert, when there's an id.
        const rejectedTitle = generatedContent.packet_title ?? generatedContent.title;
        const titleProblem = titleRejectionReason(rejectedTitle, child.name);
        if (titleProblem) {
          generatedContent.packet_title = buildClassicTitle(child.name, theme.trim());
          generatedContent.title_style = "classic";
        }
        if (packetNumber !== null) generatedContent.packet_number = packetNumber;

        // Build the puzzle break from the model's words, seeded per packet.
        // attachPuzzleBreak never throws; a failed build falls back to the new
        // word search, then to no puzzle data (the old word search renders).
        if (requestedPuzzleType) {
          const puzzle = attachPuzzleBreak(generatedContent, {
            requestedType: requestedPuzzleType,
            gradeLevel: child.grade_level,
            childName: child.name,
            theme: theme.trim(),
            seed: newPuzzleSeed(),
          });
          if (!puzzle.found || puzzle.fellBack) {
            console.warn("[generate-packet] Puzzle break fell back:", {
              childId,
              found: puzzle.found,
              requestedType: puzzle.requestedType,
              builtType: puzzle.builtType,
              candidateCount: puzzle.candidateCount,
            });
          }
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
            // Nullable column (migration 013) — older/cached clients that
            // don't send this must still insert successfully.
            client_request_id: clientRequestId ?? null,
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
        if (titleProblem) {
          console.warn("[generate-packet] Replaced packet title with the classic fallback:", {
            packetId,
            reason: titleProblem,
            rejectedTitle: rejectedTitle ?? null,
            fallbackTitle: generatedContent.packet_title,
          });
        }
        const mascotDescription = generatedContent.mascot_description;
        const coloringScene = generatedContent.coloring_page?.coloring_scene ?? null;

        // "First packet ever" for the packet_rendered event below — a count
        // of this user's rows now that the insert above landed; the just-
        // inserted row makes 1 mean "first ever." An error is treated as
        // "unknown" (null), not "false" — the event is skipped rather than
        // guessing in either direction.
        let isFirstPacket: boolean | null = null;
        try {
          const { count, error: countError } = await supabase
            .from("packets")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id);
          if (countError) {
            console.error("[generate-packet] First-packet count query failed:", countError.message);
          } else {
            isFirstPacket = count === 1;
          }
        } catch (err) {
          console.error(
            "[generate-packet] First-packet count query threw:",
            err instanceof Error ? err.message : String(err)
          );
        }

        // Generate images in the foreground while the SSE connection is still alive.
        // Replicate's internal polling loop hangs inside after() because Vercel's
        // connection pool degrades after the response is sent. Running here keeps
        // the connection active so the SDK's fetch calls complete normally.
        let mascotImageUrl: string | null = null;
        let coloringImageUrl: string | null = null;
        // Hosted packet-mascots URL for the in-memory base64 above, if the
        // upload succeeds — null means "no hosted copy," not "no mascot."
        // Kept separate from mascotImageUrl so the PDF render below always
        // uses the in-memory base64 and never depends on network access.
        let hostedMascotUrl: string | null = null;
        // Same idea for the coloring page: hosted packet-coloring-pages URL,
        // or null to fall back to writing the base64 as before.
        let hostedColoringUrl: string | null = null;
        // Attempt counts and timings for packet_ai_usage — stay "skipped"
        // (0 attempts, null model) when there's no mascot_description.
        const skippedImage: ImageGenResult = {
          image: null,
          model: null,
          attempts: 0,
          durationMs: null,
          usage: [],
          usedFallback: false,
        };
        let mascotGen = skippedImage;
        let coloringGen = skippedImage;

        if (mascotDescription) {
          send({ type: "progress", message: "Generating mascot and coloring page images..." });
          ({
            mascotImageUrl,
            coloringImageUrl,
            mascot: mascotGen,
            coloring: coloringGen,
          } = await generateBothImages(
            mascotDescription,
            coloringScene,
            child.name,
            {
              mascotName: generatedContent.mascot_name ?? null,
              deadlineMs: requestStartMs + IMAGE_DEADLINE_AFTER_START_MS,
              gradeLevel: child.grade_level,
            }
          ));

          if (mascotImageUrl) {
            hostedMascotUrl = await uploadMascotImage(supabase, mascotImageUrl, user.id, packetId);
          }
          if (coloringImageUrl) {
            hostedColoringUrl = await uploadColoringImage(supabase, coloringImageUrl, user.id, packetId);
          }

          const updates: Record<string, string> = {};
          // Prefer the hosted URL for the column; fall back to the base64
          // exactly as before if the upload didn't produce one — a failed
          // upload must leave the packet no worse off than today.
          if (mascotImageUrl) updates.mascot_image_url = hostedMascotUrl ?? mascotImageUrl;
          if (coloringImageUrl) updates.coloring_image_url = hostedColoringUrl ?? coloringImageUrl;
          if (Object.keys(updates).length > 0) {
            // Its own try/catch: the packet is already saved, so a thrown
            // error here must not fall through to the outer catch and turn
            // a good packet into an error screen with no PDF and no email.
            try {
              const { error: updateError } = await supabase
                .from("packets")
                .update(updates)
                .eq("id", packetId);
              if (updateError) {
                console.error("[generate-packet] Failed to save image URLs:", {
                  message: updateError.message,
                  packetId,
                });
              }
            } catch (err) {
              console.error("[generate-packet] Saving image URLs threw:", {
                message: err instanceof Error ? err.message : String(err),
                packetId,
              });
            }
          }
        } else {
          console.warn("[generate-packet] No mascot_description — skipping image generation");
        }

        // Record what this packet cost. Awaited on the live request, never
        // fatal — a failed insert is logged and the packet carries on.
        if (claudeCall.usage) {
          try {
            const { error: usageInsertError } = await serviceClient.from("packet_ai_usage").insert({
              packet_id: packetId,
              user_id: user.id,
              claude_model: MODEL,
              input_tokens: claudeCall.usage.inputTokens,
              output_tokens: claudeCall.usage.outputTokens,
              cache_read_tokens: claudeCall.usage.cacheReadTokens,
              cache_write_tokens: claudeCall.usage.cacheWriteTokens,
              claude_duration_ms: claudeCall.durationMs,
              mascot_model: mascotGen.model,
              mascot_attempts: mascotGen.attempts,
              mascot_duration_ms: mascotGen.durationMs,
              coloring_model: coloringGen.model,
              coloring_attempts: coloringGen.attempts,
              coloring_duration_ms: coloringGen.durationMs,
              // Per-model usage, so a fallback's attempts are priced at the fallback's rate.
              est_cost_usd: estimatePacketCostUsd(MODEL, claudeCall.usage, [...mascotGen.usage, ...coloringGen.usage]),
            });
            if (usageInsertError) {
              console.error("[generate-packet] Failed to record AI usage (non-fatal):", {
                message: usageInsertError.message,
                packetId,
              });
            }
          } catch (err) {
            console.error("[generate-packet] Recording AI usage threw (non-fatal):", {
              message: err instanceof Error ? err.message : String(err),
              packetId,
            });
          }
        } else {
          console.error("[generate-packet] No Claude usage available — skipping AI usage row", {
            packetId,
          });
        }

        // Pre-warm the PDF cache so a download (or, later, an email) never
        // has to wait on a first render. Best-effort and non-fatal: the
        // packet already exists and is valid at this point, so a failure
        // here must never surface as a generation failure — it just means
        // the first real download falls back to rendering on demand, same
        // as today's behavior.
        send({ type: "progress", message: `Getting ${child.name}'s packet ready to print...` });
        try {
          const gradeDisplay =
            child.grade_level === "K" ? "Kindergarten" : `Grade ${child.grade_level}`;
          const pdfProps: PacketPDFProps = {
            childName: child.name,
            childEmoji: child.avatar_emoji ?? "🌟",
            childGrade: gradeDisplay,
            theme: savedPacket.theme,
            title: generatedContent.packet_title ?? generatedContent.title ?? savedPacket.theme,
            activities: generatedContent.activities as PDFActivity[],
            createdAt: savedPacket.created_at,
            mascotImageUrl: mascotImageUrl,
            coloringImageUrl: coloringImageUrl,
            mascotName: generatedContent.mascot_name ?? null,
            coloringPage: generatedContent.coloring_page
              ? (generatedContent.coloring_page as PDFColoringPage)
              : null,
            greeting: generatedContent.greeting ?? null,
            parentNotes: generatedContent.parent_notes ?? null,
            dailyReflection: generatedContent.daily_reflection ?? null,
            packetMission: generatedContent.packet_mission ?? null,
            packetCelebration: generatedContent.packet_celebration ?? null,
            packetNumber: generatedContent.packet_number ?? null,
            titleStyle: generatedContent.title_style ?? null,
          };
          const pdfBuffer = await renderAndCachePacketPdf({
            supabase,
            packetId,
            userId: user.id,
            props: pdfProps,
          });

          if (user.email) {
            try {
              const filename = buildFilename(child.name, savedPacket.theme, savedPacket.created_at);
              const subjects = generatedContent.activities.map((a) => a.subject);
              // Reuse the hosted URL from the upload above — never upload twice.
              await sendPacketReadyEmail({
                to: user.email,
                childName: child.name,
                theme: savedPacket.theme,
                mascotName: generatedContent.mascot_name ?? null,
                // Only rotating-title packets carry title_style; the email
                // keeps today's subject for anything without one.
                packetTitle: generatedContent.title_style ? generatedContent.packet_title ?? null : null,
                heroImageUrl: hostedMascotUrl,
                subjects,
                pdfBuffer,
                filename,
              });
            } catch (err) {
              console.error("[generate-packet] Packet-ready email failed (non-fatal):", {
                message: err instanceof Error ? err.message : String(err),
                packetId,
              });
            }
          } else {
            console.warn("[generate-packet] No user.email on session — skipping packet-ready email", {
              packetId,
            });
          }
        } catch (err) {
          console.error("[generate-packet] Inline PDF pre-render failed (non-fatal):", {
            message: err instanceof Error ? err.message : String(err),
            packetId,
          });
        }

        if (isFirstPacket !== null) {
          try {
            await track("packet_rendered", { first: isFirstPacket });
          } catch (err) {
            console.error("[generate-packet] Failed to record packet_rendered event:", err);
          }
        }

        send({
          type: "complete",
          packet: {
            ...savedPacket,
            // Match exactly what was written to the column above: hosted
            // URL when the upload succeeded, base64 fallback otherwise.
            mascot_image_url: hostedMascotUrl ?? mascotImageUrl,
            coloring_image_url: hostedColoringUrl ?? coloringImageUrl,
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
