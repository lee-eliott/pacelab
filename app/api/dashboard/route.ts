import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

const ELIOTT_USER_ID = "8e45b7b9-f98e-4210-8f06-c9dc4de57521";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const periode = searchParams.get("periode") || "tout";

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const targetUserId = user?.id ?? ELIOTT_USER_ID;

  let dateDebut: string | null = null;
  let dateFin: string | null = null;
  const now = new Date();

  if (periode === "7j") {
    const d = new Date(now); d.setDate(d.getDate() - 7);
    dateDebut = d.toISOString().split("T")[0];
  } else if (periode === "30j") {
    const d = new Date(now); d.setDate(d.getDate() - 30);
    dateDebut = d.toISOString().split("T")[0];
  } else if (periode.match(/^\d{4}$/)) {
    dateDebut = `${periode}-01-01`;
    dateFin = `${periode}-12-31`;
  }

  let query = supabase
    .from("courses_enrichies")
    .select("*")
    .eq("user_id", targetUserId)
    .order("date_course", { ascending: false });

  if (dateDebut) query = query.gte("date_course", dateDebut);
  if (dateFin) query = query.lte("date_course", dateFin);

  const { data: courses } = await query;

  const { data: parcours } = await supabase
    .from("parcours")
    .select("*")
    .eq("actif", true)
    .eq("user_id", targetUserId)
    .order("nom");

  // Tous les compagnons (actifs + archivés) — triés par nb de courses sur la période
  const { data: tousCompagnons } = await supabase
    .from("compagnons")
    .select("id, nom, actif")
    .eq("user_id", targetUserId)
    .order("nom");

  // Compte les courses par compagnon sur les courses de la période
  const coursesData = courses || [];
  const nbCoursesParCompagnon: Record<string, number> = {};
  (tousCompagnons || []).forEach((c) => { nbCoursesParCompagnon[c.nom] = 0; });
  coursesData.forEach((course) => {
    (course.compagnons || []).forEach((nom: string) => {
      if (nbCoursesParCompagnon[nom] !== undefined) nbCoursesParCompagnon[nom]++;
    });
  });

  // Tri : d'abord par nb de courses DESC (stabilise les couleurs pour les compagnons fréquents),
  // puis par nom pour égalité
  const compagnonsTries = [...(tousCompagnons || [])].sort((a, b) => {
    const diff = (nbCoursesParCompagnon[b.nom] ?? 0) - (nbCoursesParCompagnon[a.nom] ?? 0);
    return diff !== 0 ? diff : a.nom.localeCompare(b.nom);
  });

  // On garde seulement les compagnons qui ont au moins 1 course sur la période OU qui sont actifs
  const compagnonsAffiches = compagnonsTries.filter(
    (c) => c.actif || (nbCoursesParCompagnon[c.nom] ?? 0) > 0
  );

  const { data: objectifs } = await supabase
    .from("objectifs")
    .select("*")
    .eq("actif", true)
    .eq("user_id", targetUserId)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    courses: coursesData,
    objectifs: objectifs || [],
    parcours: parcours || [],
    compagnons: compagnonsAffiches,
    isOwner: user?.id === ELIOTT_USER_ID,
    targetUserId,
  });
}