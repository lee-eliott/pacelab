import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data } = await supabase
    .from("strava_associations")
    .select("strava_activity_id, parcours_id, parcours:parcours_id(id, nom, distance_km, denivele_positif_m)")
    .eq("user_id", user.id);

  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { strava_activity_id, parcours_id } = await request.json();

  const { error } = await supabase
    .from("strava_associations")
    .upsert({
      user_id: user.id,
      strava_activity_id,
      parcours_id,
    }, { onConflict: "user_id,strava_activity_id" });

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const strava_activity_id = searchParams.get("activity_id");
  if (!strava_activity_id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

  await supabase
    .from("strava_associations")
    .delete()
    .eq("user_id", user.id)
    .eq("strava_activity_id", strava_activity_id);

  return NextResponse.json({ ok: true });
}