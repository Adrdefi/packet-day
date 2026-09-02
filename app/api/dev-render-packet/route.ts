// Dev-only, read-only PDF render route for reviewing a real packet by id.
// Fetches with the service-role client (bypasses RLS — this is a local
// review tool, not a user-facing endpoint) and never writes to the DB or
// Storage. Gated to non-production so it can't leak packet content publicly.
//
// Usage: GET /api/dev-render-packet?packetId=<uuid>

import { NextRequest, NextResponse } from "next/server";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import PacketPDF from "@/components/PacketPDF";
import type { PacketPDFProps, PDFActivity, PDFColoringPage } from "@/components/PacketPDF";
import type { PacketContent } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createSupabaseClient(url, key);
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const packetId = searchParams.get("packetId");

  if (!packetId) {
    return NextResponse.json({ error: "Missing packetId." }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data: packet, error: packetError } = await supabase
    .from("packets")
    .select("*, children(avatar_emoji, special_notes)")
    .eq("id", packetId)
    .single();

  if (packetError || !packet) {
    return NextResponse.json({ error: "Packet not found." }, { status: 404 });
  }

  const content = packet.generated_content as PacketContent;

  const child = packet.children as
    | { avatar_emoji: string; special_notes: string | null }
    | null;

  const gradeDisplay =
    packet.grade_level === "K" ? "Kindergarten" : `Grade ${packet.grade_level}`;

  const props: PacketPDFProps = {
    childName: packet.child_name,
    childEmoji: child?.avatar_emoji ?? "🌟",
    childGrade: gradeDisplay,
    theme: packet.theme,
    title: content.packet_title ?? content.title ?? packet.theme,
    activities: content.activities as PDFActivity[],
    createdAt: packet.created_at,
    mascotImageUrl: packet.mascot_image_url ?? null,
    coloringImageUrl: packet.coloring_image_url ?? null,
    mascotName: content.mascot_name ?? null,
    coloringPage: content.coloring_page ? (content.coloring_page as PDFColoringPage) : null,
    greeting: content.greeting ?? null,
    parentNotes: content.parent_notes ?? null,
    dailyReflection: content.daily_reflection ?? null,
    packetMission: content.packet_mission ?? null,
    packetCelebration: content.packet_celebration ?? null,
  };

  let pdfBuffer: Uint8Array;
  try {
    pdfBuffer = await renderToBuffer(
      createElement(PacketPDF, props) as React.ReactElement<PacketPDFProps>
    );
  } catch (err) {
    console.error("[dev-render-packet] Render failed:", err);
    return NextResponse.json(
      { error: "Something went wrong generating the PDF." },
      { status: 500 }
    );
  }

  return new Response(pdfBuffer.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "no-store",
      "Content-Length": String(pdfBuffer.byteLength),
    },
  });
}
