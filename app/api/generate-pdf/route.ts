import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { PacketPDFProps, PDFActivity, PDFColoringPage } from "@/components/PacketPDF";
import type { PacketContent } from "@/types";
import { renderAndCachePacketPdf, buildFilename } from "@/lib/packetPdfRender";

export const maxDuration = 90; // 30s image poll + ~10s render + upload headroom
// @react-pdf/renderer is Node-only — force Node runtime
export const runtime = "nodejs";

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const packetId = searchParams.get("packetId");

  if (!packetId) {
    return NextResponse.json({ error: "Missing packetId." }, { status: 400 });
  }

  const supabase = await createClient();

  // ── Auth (required — no anonymous access to packet PDFs) ──────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Fetch packet — always scoped to the authenticated owner ───────────────
  const { data: packet, error: packetError } = await supabase
    .from("packets")
    .select("*, children(avatar_emoji, special_notes)")
    .eq("id", packetId)
    .eq("user_id", user.id)
    .single();

  if (packetError || !packet) {
    return NextResponse.json({ error: "Packet not found." }, { status: 404 });
  }

  // ── Cache hit: serve the already-rendered PDF straight from Storage ───────
  // Skips the image-readiness poll and the render entirely — a cached PDF
  // was already rendered with final images, and packet content is immutable
  // after generation completes (see chunk 3 investigation).
  if (packet.pdf_url) {
    const { data: cached, error: downloadError } = await supabase.storage
      .from("packets")
      .download(packet.pdf_url);

    if (!downloadError && cached) {
      const buf = new Uint8Array(await cached.arrayBuffer());
      const filename = buildFilename(packet.child_name, packet.theme, packet.created_at);
      return new Response(buf.buffer as ArrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${filename}"`,
          "Content-Length": String(buf.byteLength),
        },
      });
    }

    console.error("[generate-pdf] Cached PDF download failed, falling back to fresh render:", {
      message: downloadError?.message,
      packetId,
      storagePath: packet.pdf_url,
    });
  }

  // ── Cache miss (or a failed cache read) — render fresh ────────────────────

  // ── Wait for images if they are still being generated ────────────────────
  // Image generation runs in after() and can take up to ~2 min after packet
  // creation (45s Claude + 120s Replicate × 2 attempts). Poll the two image
  // columns for up to 30s so the PDF is never rendered with a placeholder
  // when the real image is moments away.
  const IMAGES_MAX_AGE_MS = 4 * 60 * 1000; // 4 min — covers worst-case gen time
  const POLL_INTERVAL_MS = 2_000;
  const POLL_TIMEOUT_MS = 30_000;

  const packetAgeMs = Date.now() - new Date(packet.created_at).getTime();
  const typedPacket = packet as typeof packet & {
    mascot_image_url?: string | null;
    coloring_image_url?: string | null;
  };

  if (
    packetAgeMs < IMAGES_MAX_AGE_MS &&
    (!typedPacket.mascot_image_url || !typedPacket.coloring_image_url)
  ) {
    const pollStart = Date.now();
    while (Date.now() - pollStart < POLL_TIMEOUT_MS) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const { data: refreshed } = await supabase
        .from("packets")
        .select("mascot_image_url, coloring_image_url")
        .eq("id", packetId)
        .single();
      if (refreshed?.mascot_image_url) typedPacket.mascot_image_url = refreshed.mascot_image_url;
      if (refreshed?.coloring_image_url) typedPacket.coloring_image_url = refreshed.coloring_image_url;
      if (typedPacket.mascot_image_url && typedPacket.coloring_image_url) break;
    }
  }

  // ── Build PDF props ───────────────────────────────────────────────────────
  const content = packet.generated_content as PacketContent;

  const child = packet.children as
    | { avatar_emoji: string; special_notes: string | null }
    | null;

  const gradeDisplay =
    packet.grade_level === "K"
      ? "Kindergarten"
      : `Grade ${packet.grade_level}`;

  const props: PacketPDFProps = {
    childName: packet.child_name,
    childEmoji: child?.avatar_emoji ?? "🌟",
    childGrade: gradeDisplay,
    theme: packet.theme,
    title: content.packet_title ?? content.title ?? packet.theme,
    activities: content.activities as PDFActivity[],
    createdAt: packet.created_at,
    mascotImageUrl: typedPacket.mascot_image_url ?? null,
    coloringImageUrl: typedPacket.coloring_image_url ?? null,
    mascotName: content.mascot_name ?? null,
    coloringPage: content.coloring_page
      ? (content.coloring_page as PDFColoringPage)
      : null,
    greeting: content.greeting ?? null,
    parentNotes: content.parent_notes ?? null,
    dailyReflection: content.daily_reflection ?? null,
    packetMission: content.packet_mission ?? null,
    packetCelebration: content.packet_celebration ?? null,
  };

  // ── Render (and best-effort cache) ────────────────────────────────────────
  // Storage path (inside renderAndCachePacketPdf) uses the packet's own
  // UUID, not the child's name — the name would leak into the object key,
  // and a name+theme+date path collides across two packets generated for
  // the same child/theme on the same day.
  const filename = buildFilename(
    packet.child_name,
    packet.theme,
    packet.created_at
  );

  let pdfBuffer: Uint8Array;
  try {
    pdfBuffer = await renderAndCachePacketPdf({
      supabase,
      packetId,
      userId: packet.user_id,
      props,
    });
  } catch (err) {
    console.error("[generate-pdf] Render failed:", err);
    return NextResponse.json(
      { error: "Something went wrong generating the PDF. Please try again." },
      { status: 500 }
    );
  }

  // ── Return PDF ────────────────────────────────────────────────────────────
  return new Response(pdfBuffer.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.byteLength),
    },
  });
}
