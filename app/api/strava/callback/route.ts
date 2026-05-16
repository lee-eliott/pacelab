import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/mescourses?error=access_denied", request.url));
  }

  // Échange le code contre un token
  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/mescourses?error=token_failed", request.url));
  }

  const token = await tokenRes.json();

  // Sauvegarde en Supabase
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  await supabase.from("strava_tokens").upsert({
    user_id: user.id,
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_at: token.expires_at,
    athlete_id: token.athlete?.id ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  return NextResponse.redirect(new URL("/mescourses", request.url));
}