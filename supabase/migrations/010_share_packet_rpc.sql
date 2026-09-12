-- Public share links: replace the blanket "packets: public share read" policy
-- with a security-definer function that matches the token inside the function
-- body, where RLS can actually see the supplied value. Returns only the columns
-- a public visitor should see: child_name and special_notes are deliberately
-- excluded.

create or replace function public.get_packet_by_share_token(token text)
returns table (
  id uuid,
  theme text,
  grade_level text,
  packet_length text,
  share_token text,
  created_at timestamptz,
  generated_content jsonb,
  mascot_image_url text
)
language sql
security definer
stable
set search_path = public
as $$
  select p.id,
         p.theme,
         p.grade_level,
         p.packet_length,
         p.share_token,
         p.created_at,
         p.generated_content,
         p.mascot_image_url
  from public.packets p
  where p.share_token = token
  limit 1;
$$;

revoke execute on function public.get_packet_by_share_token(text) from public;
grant execute on function public.get_packet_by_share_token(text) to anon, authenticated;
