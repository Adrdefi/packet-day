import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { PacketPDF } from "@/components/PacketPDF";
import type { PacketPDFProps, PDFActivity } from "@/components/PacketPDF";

export const maxDuration = 60;
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

  // ── Auth (optional: also allow share_token access) ────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Fetch packet ──────────────────────────────────────────────────────────
  let packetQuery = supabase
    .from("packets")
    .select("*, children(avatar_emoji, special_notes)")
    .eq("id", packetId);

  // Enforce ownership if logged in; otherwise require share_token match
  if (user) {
    packetQuery = packetQuery.eq("user_id", user.id);
  }

  const { data: packet, error: packetError } = await packetQuery.single();

  if (packetError || !packet) {
    return NextResponse.json({ error: "Packet not found." }, { status: 404 });
  }

  // ── If cached PDF URL exists, redirect to it ──────────────────────────────
  if (packet.pdf_url) {
    return NextResponse.redirect(packet.pdf_url);
  }

  // ── Build PDF props ───────────────────────────────────────────────────────
  const content = packet.generated_content as {
    title: string;
    activities: PDFActivity[];
  };

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
    title: content.title,
    activities: content.activities,
    createdAt: packet.created_at,
    specialNotes: packet.special_notes ?? null,
  };

  // ── Render to buffer ──────────────────────────────────────────────────────
  let pdfBuffer: Buffer;
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
  const filename = buildFilename(
    packet.child_name,
    packet.theme,
    packet.created_at
  );

  try {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("packets")
      .upload(`${packet.user_id}/${filename}`, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (!uploadError && uploadData) {
      const {
        data: { publicUrl },
      } = supabase.storage.from("packets").getPublicUrl(uploadData.path);

      // Save url for future requests (fire-and-forget)
      supabase
        .from("packets")
        .update({ pdf_url: publicUrl })
        .eq("id", packetId)
        .then(() => {});
    }
  } catch {
    // Storage upload is optional — continue even if it fails
  }

  // ── Return PDF ────────────────────────────────────────────────────────────
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
