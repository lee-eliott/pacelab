import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

async function getValidToken(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string) {
  const { data: t } = await supabase.from("strava_tokens").select("*").eq("user_id", userId).single();
  if (!t) return null;
  const now = Math.floor(Date.now() / 1000);
  if (t.expires_at > now) return t.access_token;
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: process.env.STRAVA_CLIENT_ID, client_secret: process.env.STRAVA_CLIENT_SECRET, refresh_token: t.refresh_token, grant_type: "refresh_token" }),
  });
  if (!res.ok) return null;
  const r = await res.json();
  await supabase.from("strava_tokens").update({ access_token: r.access_token, refresh_token: r.refresh_token, expires_at: r.expires_at, updated_at: new Date().toISOString() }).eq("user_id", userId);
  return r.access_token;
}

// Fetch toutes les activités depuis Strava (endpoint liste = léger)
async function fetchActivityList(accessToken: string): Promise<{id: number; updated_at: string; [key: string]: unknown}[]> {
  const all: {id: number; updated_at: string; [key: string]: unknown}[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=100`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) break;
    const batch = await res.json();
    if (!batch.length) break;
    all.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  return all;
}

// Fetch le détail d'une activité — log de tous les champs pour debug
async function fetchActivityDetail(accessToken: string, id: number): Promise<{
  description?: string | null;
  private_note?: string | null;
  athletes?: { firstname: string; lastname: string; id: number }[];
  segment_efforts?: unknown[];
} | null> {
  const res = await fetch(`https://www.strava.com/api/v3/activities/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const detail = await res.json();

  // Log des champs intéressants pour debug
  console.log(`Activity ${id} detail fields:`, {
    description: detail.description,
    private_note: detail.private_note,
    athlete_count: detail.athlete_count,
    athletes: detail.athletes,
    kudos_count: detail.kudos_count,
    comment_count: detail.comment_count,
    // Champs moins connus
    perceived_exertion: detail.perceived_exertion,
    hide_from_home: detail.hide_from_home,
  });

  return {
    description: detail.description ?? null,
    private_note: detail.private_note ?? null,
    athletes: detail.athletes ?? [],
  };
}

// GET — lit depuis le cache Supabase (0 appel Strava)
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data: tokenData } = await supabase.from("strava_tokens").select("athlete_id, athlete_data, stats_data").eq("user_id", user.id).single();
  if (!tokenData) return NextResponse.json({ error: "Strava non connecté" }, { status: 404 });

  const { data: cached } = await supabase
    .from("strava_activities_cache")
    .select("data, synced_at")
    .eq("user_id", user.id)
    .order("strava_id", { ascending: false });

  const activities = (cached || []).map((row) => row.data);
  // lastSync = date de la dernière sync la plus récente (max synced_at)
  const allSynced = (cached || []).map((r) => r.synced_at).filter(Boolean);
  const lastSync = allSynced.length > 0 ? allSynced.reduce((a, b) => a > b ? a : b) : null;

  return NextResponse.json({ activities, athlete: tokenData.athlete_data ?? null, stats: tokenData.stats_data ?? null, lastSync, fromCache: true });
}

// POST — sync intelligente : liste légère + détails uniquement pour les nouvelles/modifiées
export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data: tokenData } = await supabase.from("strava_tokens").select("athlete_id").eq("user_id", user.id).single();
  if (!tokenData) return NextResponse.json({ error: "Strava non connecté" }, { status: 404 });

  const accessToken = await getValidToken(supabase, user.id);
  if (!accessToken) return NextResponse.json({ error: "Token expiré" }, { status: 401 });

  // 1. Récupère la liste légère (1 requête par page de 100)
  const list = await fetchActivityList(accessToken);

  // 2. Récupère ce qui est déjà en cache
  const { data: cached } = await supabase
    .from("strava_activities_cache")
    .select("strava_id, data")
    .eq("user_id", user.id);

  const cacheMap = new Map<number, { updated_at?: string; description?: string; private_note?: string; athletes?: unknown[] }>(
    (cached || []).map((r: { strava_id: number; data: { updated_at?: string; description?: string; private_note?: string; athletes?: unknown[] } }) => [r.strava_id, r.data])
  );

  // 3. Identifie les activités nouvelles ou modifiées depuis la dernière sync
  const toEnrich: typeof list = [];
  for (const a of list) {
    const existing = cacheMap.get(a.id);
    if (!existing) {
      // Nouvelle activité
      toEnrich.push(a);
    } else {
      // Vérifier si modifiée (updated_at Strava > ce qu'on a en cache)
      const stravaUpdated = new Date(a.updated_at).getTime();
      const cachedUpdated = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
      const alreadyHasDetail = existing.description !== undefined;
      if (stravaUpdated > cachedUpdated || !alreadyHasDetail) {
        toEnrich.push(a);
      }
    }
  }

  console.log(`Sync: ${list.length} activités total, ${toEnrich.length} à enrichir avec détails`);

  // 4. Enrichit uniquement les activités nouvelles/modifiées (1 requête par activité)
  const enriched = new Map<number, { description?: string | null; private_note?: string | null; athletes?: unknown[] }>();
  // Limite à 30 requêtes simultanées max pour éviter le rate limiting
  const BATCH = 10;
  for (let i = 0; i < toEnrich.length; i += BATCH) {
    const batch = toEnrich.slice(i, i + BATCH);
    await Promise.all(batch.map(async (a) => {
      const detail = await fetchActivityDetail(accessToken, a.id);
      if (detail) enriched.set(a.id, detail);
    }));
  }

  // 5. Fusionne liste + détails et upsert en cache
  const now = new Date().toISOString();
  const rows = list.map((a) => {
    const existing = cacheMap.get(a.id);
    const detail = enriched.get(a.id);
    const merged = {
      ...a,
      // Priorité : nouveau détail > ancien cache > rien
      description: detail?.description ?? existing?.description ?? null,
      private_note: detail?.private_note ?? existing?.private_note ?? null,
      athletes: detail?.athletes ?? existing?.athletes ?? [],
    };
    return { user_id: user.id, strava_id: a.id, data: merged, synced_at: now };
  });

  for (let i = 0; i < rows.length; i += 50) {
    await supabase.from("strava_activities_cache").upsert(rows.slice(i, i + 50), { onConflict: "user_id,strava_id" });
  }

  // 6. Met à jour athlète et stats
  const [athleteRes, statsRes] = await Promise.all([
    fetch("https://www.strava.com/api/v3/athlete", { headers: { Authorization: `Bearer ${accessToken}` } }),
    fetch(`https://www.strava.com/api/v3/athletes/${tokenData.athlete_id}/stats`, { headers: { Authorization: `Bearer ${accessToken}` } }),
  ]);
  const athlete = athleteRes.ok ? await athleteRes.json() : null;
  const stats = statsRes.ok ? await statsRes.json() : null;
  await supabase.from("strava_tokens").update({ athlete_data: athlete, stats_data: stats }).eq("user_id", user.id);

  const activities = rows.map((r) => r.data);
  return NextResponse.json({ activities, athlete, stats, lastSync: now, fromCache: false, synced: list.length, enriched: toEnrich.length });
}