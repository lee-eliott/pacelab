import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data } = await supabase
    .from("strava_compagnons")
    .select("strava_activity_id, compagnon_id, compagnon:compagnons(id, nom)")
    .eq("user_id", user.id);

  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { strava_activity_id, compagnon_id } = await request.json();

  const { error } = await supabase.from("strava_compagnons").insert({
    user_id: user.id,
    strava_activity_id,
    compagnon_id,
  });

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const strava_activity_id = searchParams.get("activity_id");
  const compagnon_id = searchParams.get("compagnon_id");

  if (!strava_activity_id || !compagnon_id) return NextResponse.json({ error: "Params manquants" }, { status: 400 });

  await supabase.from("strava_compagnons")
    .delete()
    .eq("user_id", user.id)
    .eq("strava_activity_id", strava_activity_id)
    .eq("compagnon_id", compagnon_id);

  return NextResponse.json({ ok: true });
}