import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { generatePacket } from "@/lib/anthropic";
import type { Child } from "@/types";

// Allow up to 90 seconds — Claude generation can take ~60s
export const maxDuration = 90;

const PACKET_LIMITS: Record<string, number> = {
  free: 3,
  pro: Infinity,
  cancelled: 0,
};

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

    // ── Parse body ────────────────────────────────────────────────────────────
    const body = await req.json();
    const { child_id, theme, packet_length, today_note } = body;

    if (
      !child_id ||
      typeof theme !== "string" ||
      !theme.trim() ||
      !packet_length
    ) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    if (!["half", "full"].includes(packet_length)) {
      return NextResponse.json(
        { error: "Invalid packet length." },
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
          error:
            "You've used all your free packets this month. Upgrade to keep generating!",
          code: "quota_exceeded",
        },
        { status: 402 }
      );
    }

    // ── Fetch child (RLS enforces ownership) ─────────────────────────────────
    const { data: child } = await supabase
      .from("children")
      .select("*")
      .eq("id", child_id)
      .eq("user_id", user.id)
      .single();

    if (!child) {
      return NextResponse.json(
        { error: "Child not found." },
        { status: 404 }
      );
    }

    // ── Generate via Claude ───────────────────────────────────────────────────
    const generatedContent = await generatePacket({
      child: child as Child,
      theme: theme.trim(),
      packetLength: packet_length,
      todayNote: today_note?.trim() || undefined,
    });

    // ── Save packet ───────────────────────────────────────────────────────────
    const { data: savedPacket, error: insertError } = await supabase
      .from("packets")
      .insert({
        user_id: user.id,
        child_id: child.id,
        child_name: child.name,
        grade_level: child.grade_level,
        theme: theme.trim(),
        packet_length,
        special_notes: today_note?.trim() || null,
        generated_content: generatedContent,
      })
      .select()
      .single();

    if (insertError || !savedPacket) {
      console.error("[generate] Failed to save packet:", insertError);
      return NextResponse.json(
        {
          error:
            "Your packet was generated but couldn't be saved. Please try again.",
        },
        { status: 500 }
      );
    }

    // ── Increment usage ───────────────────────────────────────────────────────
    await supabase
      .from("profiles")
      .update({
        packets_used_this_month: profile.packets_used_this_month + 1,
      })
      .eq("id", user.id);

    return NextResponse.json({ packet: savedPacket });
  } catch (err) {
    console.error("[generate] Error:", err);
    const message =
      err instanceof Error
        ? err.message
        : "Something went sideways generating your packet.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
