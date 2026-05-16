import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

async function getValidToken(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string) {
  const { data: tokenData } = await supabase
    .from("strava_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!tokenData) return null;

  const now = Math.floor(Date.now() / 1000);
  if (tokenData.expires_at < now) {
    const res = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: tokenData.refresh_token,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) return null;
    const refreshed = await res.json();
    await supabase.from("strava_tokens").update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: refreshed.expires_at,
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);
    return refreshed.access_token;
  }

  return tokenData.access_token;
}

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data: tokenData } = await supabase
    .from("strava_tokens")
    .select("athlete_id")
    .eq("user_id", user.id)
    .single();

  const accessToken = await getValidToken(supabase, user.id);
  if (!accessToken) return NextResponse.json({ error: "Token invalide" }, { status: 401 });

  // Récupère les segments étoilés
  const starredRes = await fetch(
    "https://www.strava.com/api/v3/segments/starred?per_page=50",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const starred = starredRes.ok ? await starredRes.json() : [];

  // Pour chaque segment étoilé, récupère les efforts personnels
  const segmentsWithEfforts = await Promise.all(
    starred.slice(0, 20).map(async (seg: { id: number; name: string; distance: number; activity_type: string }) => {
      const effortRes = await fetch(
        `https://www.strava.com/api/v3/segments/${seg.id}/all_efforts?athlete_id=${tokenData?.athlete_id}&per_page=100`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const efforts = effortRes.ok ? await effortRes.json() : [];

      if (!efforts.length) return null;

      // Trie par elapsed_time pour trouver le PR
      const sorted = [...efforts].sort((a: { elapsed_time: number }, b: { elapsed_time: number }) => a.elapsed_time - b.elapsed_time);
      const pr = sorted[0];

      return {
        segment_id: seg.id,
        name: seg.name,
        distance: seg.distance,
        activity_type: seg.activity_type,
        effort_count: efforts.length,
        pr_elapsed_time: pr.elapsed_time,
        pr_date: pr.start_date_local,
        pr_activity_id: pr.activity.id,
        average_speed: pr.distance / pr.elapsed_time,
        efforts: sorted.map((e: {
          id: number;
          elapsed_time: number;
          start_date_local: string;
          activity: { id: number };
        }) => ({
          id: e.id,
          elapsed_time: e.elapsed_time,
          date: e.start_date_local,
          activity_id: e.activity.id,
        })),
      };
    })
  );

  const result = segmentsWithEfforts.filter(Boolean);
  return NextResponse.json(result);
}