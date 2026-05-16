// ============================================================
// PACELAB — Types TypeScript alignés sur le schéma Supabase
// ============================================================

export type ObjectifType = "duree" | "distance" | "sorties";
export type ObjectifPeriode = "annuel" | "mensuel" | "hebdo";

export interface Parcours {
  id: string;
  nom: string;
  distance_km: number | null;
  description: string | null;
  actif: boolean;
  created_at: string;
}

export interface Compagnon {
  id: string;
  nom: string;
  created_at: string;
}

export interface Course {
  id: string;
  user_id: string;
  date_course: string;
  duree_secondes: number;
  parcours_id: string | null;
  compagnon_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Vue enrichie (jointures déjà faites côté Supabase)
export interface CourseEnrichie {
  id: string;
  date_course: string;
  duree_secondes: number;
  notes: string | null;
  created_at: string;
  parcours_nom: string | null;
  parcours_distance_km: number | null;
  compagnons: string[] | null;
}

export interface Objectif {
  id: string;
  user_id: string;
  type: ObjectifType;
  periode: ObjectifPeriode;
  valeur: number;
  actif: boolean;
  created_at: string;
}

export interface StatsParcours {
  parcours_id: string;
  parcours_nom: string;
  distance_km: number | null;
  nb_courses: number;
  pr_secondes: number | null;
  moy_secondes: number | null;
  total_secondes: number | null;
}

export interface StatsCompagnon {
  compagnon_id: string;
  compagnon_nom: string;
  nb_courses: number;
  moy_secondes: number | null;
  meilleur_secondes: number | null;
}

// ============================================================
// HELPERS — Conversion secondes ↔ affichage
// ============================================================

// 1597 → "26:37"
export function secondesToDisplay(secondes: number): string {
  const m = Math.floor(secondes / 60);
  const s = secondes % 60;
  return `${m}min${s.toString().padStart(2, "0")}`;
}

// 1597 → { minutes: 26, secondes: 37 }
export function secondesToParts(secondes: number) {
  return {
    minutes: Math.floor(secondes / 60),
    secondes: secondes % 60,
  };
}

// "26:37" → 1597
export function displayToSecondes(input: string): number {
  const [m, s] = input.split(":").map(Number);
  return m * 60 + (s || 0);
}

// "26min37" → 1597
export function minSecToSecondes(minutes: number, secondes: number): number {
  return minutes * 60 + secondes;
}

// 503 secondes totales → "8h23"
export function secondesToHours(totalSecondes: number): string {
  const h = Math.floor(totalSecondes / 3600);
  const m = Math.floor((totalSecondes % 3600) / 60);
  return `${h}h${m.toString().padStart(2, "0")}`;
}

// Label lisible pour le type d'objectif
export function objectifTypeLabel(type: ObjectifType): string {
  return { duree: "Durée", distance: "Distance", sorties: "Sorties" }[type];
}

// Label lisible pour la période
export function objectifPeriodeLabel(periode: ObjectifPeriode): string {
  return { annuel: "Annuel", mensuel: "Mensuel", hebdo: "Hebdomadaire" }[
    periode
  ];
}

// Unité selon le type
export function objectifUnite(type: ObjectifType): string {
  return { duree: "min", distance: "km", sorties: "sorties" }[type];
}

// 1597 secondes sur 4.33 km → "6:09 /km"
export function allureMinKm(dureeSecondes: number, distanceKm: number): string {
  const minParKm = dureeSecondes / 60 / distanceKm;
  const minutes = Math.floor(minParKm);
  const secondes = Math.round((minParKm - minutes) * 60);
  return `${minutes}:${secondes.toString().padStart(2, "0")} /km`;
}