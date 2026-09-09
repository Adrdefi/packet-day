import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import PacketPDF from "@/components/PacketPDF";
import type { PacketPDFProps, PDFActivity, PDFColoringPage } from "@/components/PacketPDF";
import type { PacketContent } from "@/types";

export const maxDuration = 90; // 30s image poll + ~10s render + upload headroom
// @react-pdf/renderer is Node-only — force Node runtime
export const runtime = "nodejs";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildFilename(childName: string, theme: string, date: string): string {
  const d = date ? date.slice(0, 10) : new Date().toISOString().slice(0, 10);
  return `${slugify(childName)}-${slugify(theme)}-${d}.pdf`;
}

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

  // ── Render to buffer ──────────────────────────────────────────────────────

  let pdfBuffer: Uint8Array;
  try {
    pdfBuffer = await renderToBuffer(
      createElement(PacketPDF, props) as React.ReactElement<PacketPDFProps>
    );
  } catch (err) {
    console.error("[generate-pdf] Render failed:", err);
    return NextResponse.json(
      { error: "Something went wrong generating the PDF. Please try again." },
      { status: 500 }
    );
  }

  // ── Optionally upload to Supabase Storage ─────────────────────────────────
  // Storage path uses the packet's own UUID, not the child's name — the name
  // would leak into the object key, and a name+theme+date path collides
  // across two packets generated for the same child/theme on the same day.
  const filename = buildFilename(
    packet.child_name,
    packet.theme,
    packet.created_at
  );
  const storagePath = `${packet.user_id}/${packet.id}.pdf`;

  try {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("packets")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError || !uploadData) {
      console.error("[generate-pdf] Storage upload failed:", {
        message: uploadError?.message,
        packetId,
        userId: packet.user_id,
        storagePath,
      });
    } else {
      // Save the storage path for future requests (fire-and-forget — does not
      // block the PDF response). The bucket is private, so there is no public
      // URL to store — a later chunk that reads this back will do so via the
      // service-role client.
      supabase
        .from("packets")
        .update({ pdf_url: uploadData.path })
        .eq("id", packetId)
        .then(({ error: pdfUrlUpdateError }) => {
          if (pdfUrlUpdateError) {
            console.error("[generate-pdf] Failed to save pdf_url after upload:", {
              message: pdfUrlUpdateError.message,
              packetId,
              storagePath,
            });
          }
        });
    }
  } catch (err) {
    console.error("[generate-pdf] Storage upload threw:", {
      message: err instanceof Error ? err.message : String(err),
      packetId,
      userId: packet.user_id,
      storagePath,
    });
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
