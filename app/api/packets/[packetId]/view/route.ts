import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ packetId: string }> }
) {
  const { packetId } = await params;
  const supabase = await createClient();

  // Use rpc to atomically increment — no auth required (RLS allows public read)
  await supabase.rpc("increment_packet_view", { packet_id: packetId });

  return NextResponse.json({ ok: true });
}
