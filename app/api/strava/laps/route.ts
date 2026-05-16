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

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

  const accessToken = await getValidToken(supabase, user.id);
  if (!accessToken) return NextResponse.json({ error: "Token invalide" }, { status: 401 });

  const res = await fetch(`https://www.strava.com/api/v3/activities/${id}/laps`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return NextResponse.json([], { status: 200 });
  const laps = await res.json();
  return NextResponse.json(laps);
}