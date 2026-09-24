import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PacketResultView, { type SavedPacket } from "@/components/packet/PacketResultView";

export const metadata = { title: "Your packet" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Reopens one of the parent's own packets on the same result screen they saw
 * right after generating it (components/packet/PacketResultView.tsx), from a
 * tap on a Recent Packets row.
 *
 * Owner only, three ways: proxy.ts sends logged-out visitors to /login, the
 * query below runs on the session-bound client (RLS only returns the user's
 * own rows), and it also filters on user_id explicitly. Anyone else's packet
 * id, or a malformed one, is a plain 404, never a hint that it exists.
 * Public sharing stays on /packets/[shareToken].
 */
export default async function DashboardPacketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/dashboard/packets/${id}`)}`);

  // Only the columns the result screen reads. coloring_image_url is left out
  // on purpose: it can be a large base64 blob and this page never shows it.
  const { data: packet } = await supabase
    .from("packets")
    .select(
      "id, child_id, child_name, grade_level, theme, packet_length, share_token, pdf_url, mascot_image_url, created_at, generated_content"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!packet || !packet.generated_content) notFound();

  let childEmoji = "🌟";
  if (packet.child_id) {
    const { data: child } = await supabase
      .from("children")
      .select("avatar_emoji")
      .eq("id", packet.child_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (child?.avatar_emoji) childEmoji = child.avatar_emoji;
  }

  // The dashboard layout already provides the top bar and page padding;
  // -mx/-my undo that padding so the result screen sits edge to edge like
  // it does on /generate.
  return (
    <div className="-mx-4 md:-mx-8 -my-8">
      <PacketResultView
        packet={packet as SavedPacket}
        childEmoji={childEmoji}
        celebrate={false}
      />
    </div>
  );
}
