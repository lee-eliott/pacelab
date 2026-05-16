// ─── Données de démonstration — Alex Martin ───────────────────────────────────

export const DEMO_ATHLETE = {
  firstname: "Alex",
  lastname: "Martin",
  city: "Lyon",
  country: "France",
  profile: "",
  follower_count: 63,
  friend_count: 41,
};

export const DEMO_PARCOURS = [
  { id: "demo-p1", nom: "Montée des Traboules", distance_km: 5.2, denivele_positif_m: 120 },
  { id: "demo-p2", nom: "Tour du Parc", distance_km: 3.8, denivele_positif_m: 45 },
  { id: "demo-p3", nom: "Boucle Riverside", distance_km: 8.1, denivele_positif_m: 65 },
];

export const DEMO_COMPAGNONS = [
  { id: "demo-c1", nom: "Sarah", actif: true },
  { id: "demo-c2", nom: "Thomas", actif: true },
];

export const DEMO_OBJECTIFS = [
  {
    id: "demo-o1",
    titre: "Courir 50h en 2026",
    type: "duree" as const,
    valeur: 3000,
    periode: "annuel" as const,
    annee: new Date().getFullYear(),
    date_debut: null,
    date_fin: null,
    actif: true,
  },
  {
    id: "demo-o2",
    titre: "300 km en 2026",
    type: "distance" as const,
    valeur: 300,
    periode: "annuel" as const,
    annee: new Date().getFullYear(),
    date_debut: null,
    date_fin: null,
    actif: true,
  },
];

function daysAgo(n: number, hour = 7): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function toISO(d: Date): string {
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00:00Z`;
}

const PARCOURS_LIST = [
  { id: "demo-p1", nom: "Montée des Traboules", distance_km: 5.2, denivele_positif_m: 120 },
  { id: "demo-p2", nom: "Tour du Parc", distance_km: 3.8, denivele_positif_m: 45 },
  { id: "demo-p3", nom: "Boucle Riverside", distance_km: 8.1, denivele_positif_m: 65 },
];
const P_CYCLE = ["demo-p1","demo-p2","demo-p3","demo-p1","demo-p2","demo-p1","demo-p3"];
const HOURS = [6,7,7,8,12,17,18];
const NOTES = ["","","","Bonne sortie, jambes légères.","","Dur au démarrage.","","Super rythme !","","Vent de face.",""];
const COMP_PATTERNS: string[][] = [[],[],[],["demo-c1"],[],["demo-c2"],[],["demo-c1","demo-c2"],[],[],["demo-c1"],[],["demo-c2"],[],[],[]];

function paceAt(weekBack: number, idx: number): number {
  // Progression de 405s (6'45") → 350s (5'50") sur 104 semaines + bruit
  const base = Math.round(405 - (1 - weekBack / 104) * 55);
  const noise = [-8,-5,-3,0,0,3,5,8,10,-6,-4,2][idx % 12];
  return Math.max(330, Math.min(430, base + noise));
}

function buildActiveWeeks(): number[] {
  const weeks: number[] = [];
  // Streak actuelle: semaines 1-13
  for (let w = 1; w <= 13; w++) weeks.push(w);
  // Trou 14-17
  // Semaines 18-32
  for (let w = 18; w <= 32; w++) { if ((w + 3) % 5 !== 0) weeks.push(w); }
  // Trou 33-36
  // Semaines 37-49
  for (let w = 37; w <= 49; w++) { if ((w + 1) % 4 !== 0) weeks.push(w); }
  // Meilleure streak: 50-68 (19 semaines consécutives)
  for (let w = 50; w <= 68; w++) weeks.push(w);
  // Semaines 69-104 sporadiques
  for (let w = 69; w <= 104; w++) { if ((w * 7 + 3) % 3 !== 0) weeks.push(w); }
  return weeks;
}

const ACTIVE_WEEKS = buildActiveWeeks();

function generateRawActs() {
  const acts: { id: number; weekBack: number; daysBack: number; hour: number; pace: number; pId: string; comps: string[]; note: string }[] = [];
  let id = 2000;
  let idx = 0;
  for (const weekBack of ACTIVE_WEEKS) {
    const nbS = (weekBack % 3 === 0) ? 2 : 1;
    for (let s = 0; s < nbS; s++) {
      // Pour la toute première sortie (weekBack=1, premier idx), forcer daysBack=7
      const isFirstEver = weekBack === 1 && idx === 0 && s === 0;
      const dayOff = isFirstEver ? 0 : s === 0 ? (weekBack * 3 + idx) % 5 : ((weekBack * 7 + idx) % 2) + 5;
      const daysBack = weekBack * 7 - dayOff;
      if (daysBack <= 0) continue;
      const pId = P_CYCLE[idx % P_CYCLE.length];
      acts.push({
        id: id++, weekBack, daysBack,
        hour: HOURS[idx % HOURS.length],
        pace: paceAt(weekBack, idx),
        pId,
        comps: COMP_PATTERNS[idx % COMP_PATTERNS.length],
        note: NOTES[idx % NOTES.length],
      });
      idx++;
    }
  }
  return acts.sort((a, b) => a.daysBack - b.daysBack);
}

const RAW_ACTS = generateRawActs();

export function getDemoActivities() {
  return RAW_ACTS.map(a => {
    const p = PARCOURS_LIST.find(p => p.id === a.pId)!;
    const distM = p.distance_km * 1000;
    const moving_time = Math.round(a.pace * p.distance_km);
    const date = daysAgo(a.daysBack, a.hour);
    return {
      id: a.id, name: p.nom, sport_type: "Run", type: "Run",
      distance: distM, moving_time,
      elapsed_time: moving_time + ((a.id * 7) % 90) + 20,
      total_elevation_gain: p.denivele_positif_m,
      start_date_local: toISO(date),
      average_speed: distM / moving_time,
      max_speed: (distM / moving_time) * 1.2,
      athlete_count: a.comps.length > 0 ? 2 : 1,
      kudos_count: (a.id * 3) % 9,
      average_heartrate: 152 + ((a.id * 11) % 20),
      max_heartrate: 170 + ((a.id * 7) % 15),
      private_note: a.note, description: "",
    };
  });
}

export function getDemoAssociations() {
  return RAW_ACTS.map(a => ({
    strava_activity_id: a.id,
    parcours_id: a.pId,
    parcours: PARCOURS_LIST.find(p => p.id === a.pId) ?? null,
  }));
}

export function getDemoStravaCompagnons() {
  return RAW_ACTS.flatMap(a =>
    a.comps.map(cId => ({
      strava_activity_id: a.id,
      compagnon_id: cId,
      compagnon: DEMO_COMPAGNONS.find(c => c.id === cId) ?? null,
    }))
  );
}

export function getDemoStats() {
  const acts = getDemoActivities();
  const yr = String(new Date().getFullYear());
  const ytd = acts.filter(a => a.start_date_local.startsWith(yr));
  return {
    ytd_run_totals: { count: ytd.length, distance: ytd.reduce((s,a)=>s+a.distance,0), moving_time: ytd.reduce((s,a)=>s+a.moving_time,0), elevation_gain: ytd.reduce((s,a)=>s+a.total_elevation_gain,0) },
    all_run_totals: { count: acts.length, distance: acts.reduce((s,a)=>s+a.distance,0), moving_time: acts.reduce((s,a)=>s+a.moving_time,0), elevation_gain: acts.reduce((s,a)=>s+a.total_elevation_gain,0) },
  };
}