import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Child } from "@/types";
import EditChildClient from "./EditChildClient";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("children")
    .select("name")
    .eq("id", id)
    .single();
  return { title: data ? `Edit ${data.name}` : "Edit Child" };
}

export default async function EditChildPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: child } = await supabase
    .from("children")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id) // enforce ownership via RLS + explicit check
    .single();

  if (!child) notFound();

  const { count: packetCount } = await supabase
    .from("packets")
    .select("*", { count: "exact", head: true })
    .eq("child_id", id);

  return <EditChildClient child={child as Child} packetCount={packetCount ?? 0} />;
}
