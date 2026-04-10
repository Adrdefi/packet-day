-- Atomic view counter increment for public share pages.
-- Called via rpc('increment_packet_view', { packet_id }) from the API route.
-- Security definer so it can update even when called by an anon user.

create or replace function public.increment_packet_view(packet_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.packets
  set    view_count = view_count + 1
  where  id = packet_id
    and  share_token is not null;  -- only increment on share-enabled packets
end;
$$;

-- Allow anon and authenticated callers to execute this function
grant execute on function public.increment_packet_view(uuid) to anon, authenticated;
