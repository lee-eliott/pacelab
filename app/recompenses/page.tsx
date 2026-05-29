"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import { lbl } from "@/lib/styles";

interface Activity {
  id: number; name: string; sport_type: string;
  moving_time: number; elapsed_time: number; distance: number;
  average_speed: number; total_elevation_gain: number;
  start_date_local: string; athlete_count?: number;
}
interface Parcours { id: string; nom: string; distance_km: number | null; denivele_positif_m: number | null; }
interface Association { strava_activity_id: number; parcours: Parcours | null; }

function isRun(a: Activity) { return ["Run","TrailRun","VirtualRun"].includes(a.sport_type); }

// ─── Calculs ──────────────────────────────────────────────────────────────────

function computeStats(runs: Activity[], associations: Map<number, Parcours | null>, timeField: "moving_time" | "elapsed_time") {
  const getTime = (a: Activity) => timeField === "elapsed_time" ? a.elapsed_time : a.moving_time;

  // Sorties totales
  const totalSorties = runs.length;

  // Km totaux
  const totalKm = runs.reduce((s, a) => { const p = associations.get(a.id); return s + (p?.distance_km ?? a.distance / 1000); }, 0);

  // D+ total
  const totalDenivele = runs.reduce((s, a) => s + a.total_elevation_gain, 0);

  // Sorties par mois
  const sortiesByMonth = new Map<string, number>();
  const kmByMonth = new Map<string, number>();
  const elevByMonth = new Map<string, number>();

  runs.forEach(a => {
    const m = a.start_date_local.substring(0, 7);
    const p = associations.get(a.id);
    const km = p?.distance_km ?? a.distance / 1000;
    sortiesByMonth.set(m, (sortiesByMonth.get(m) ?? 0) + 1);
    kmByMonth.set(m, (kmByMonth.get(m) ?? 0) + km);
    elevByMonth.set(m, (elevByMonth.get(m) ?? 0) + a.total_elevation_gain);
  });

  const maxSortiesMois = Math.max(0, ...sortiesByMonth.values());
  const maxKmMois = Math.max(0, ...kmByMonth.values());
  const maxElevMois = Math.max(0, ...elevByMonth.values());

  // Km par année
  const kmByYear = new Map<string, number>();
  const elevByYear = new Map<string, number>();
  runs.forEach(a => {
    const y = a.start_date_local.substring(0, 4);
    const p = associations.get(a.id);
    const km = p?.distance_km ?? a.distance / 1000;
    kmByYear.set(y, (kmByYear.get(y) ?? 0) + km);
    elevByYear.set(y, (elevByYear.get(y) ?? 0) + a.total_elevation_gain);
  });
  const maxKmAnnee = Math.max(0, ...kmByYear.values());
  const maxElevAnnee = Math.max(0, ...elevByYear.values());

  // Streak hebdo (meilleure)
  const dates = new Set(runs.map(a => a.start_date_local.split("T")[0]));
  function getMondayOf(d: Date) { const r = new Date(d); r.setDate(r.getDate() - ((r.getDay() + 6) % 7)); r.setHours(0,0,0,0); return r; }
  function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
  function isoDate(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  function weekHasCourse(mon: Date) { for(let i=0;i<7;i++) if(dates.has(isoDate(addDays(mon,i)))) return true; return false; }

  const today = new Date(); today.setHours(0,0,0,0);
  const curMon = getMondayOf(today);
  const allDates = runs.map(a => new Date(a.start_date_local)).sort((a,b) => a.getTime()-b.getTime());
  let bestStreak = 0;
  if(allDates.length > 0) {
    let temp = 0;
    let c = new Date(getMondayOf(allDates[0]));
    while(c <= curMon) {
      if(weekHasCourse(c)) { temp++; bestStreak = Math.max(bestStreak, temp); }
      else temp = 0;
      c = addDays(c, 7);
    }
  }

  // Streak actuelle
  let streakActuelle = 0;
  if(allDates.length > 0) {
    let w = new Date(curMon);
    if(!weekHasCourse(w) && today.getDay() !== 1) w = addDays(w, -7);
    const first = getMondayOf(allDates[0]);
    while(w >= first) { if(weekHasCourse(w)) { streakActuelle++; w = addDays(w,-7); } else break; }
  }

  // Sorties en groupe
  const sortiesGroupe = runs.filter(a => (a.athlete_count ?? 1) > 1).length;

  // Sorties avec PR (meilleure allure sur un parcours)
  const prByParcours = new Map<string, number>();
  runs.forEach(a => {
    const p = associations.get(a.id);
    if(!p) return;
    const speed = p.distance_km ? (p.distance_km * 1000) / getTime(a) : a.average_speed;
    if(!prByParcours.has(p.id) || speed > prByParcours.get(p.id)!) prByParcours.set(p.id, speed);
  });
  const nbParcours = prByParcours.size;

  // Km ce mois-ci
  const thisMonth = today.toISOString().substring(0, 7);
  const kmCeMois = kmByMonth.get(thisMonth) ?? 0;
  const sortiesCeMois = sortiesByMonth.get(thisMonth) ?? 0;
  const elevCeMois = elevByMonth.get(thisMonth) ?? 0;

  // Km cette année
  const thisYear = String(today.getFullYear());
  const kmCetteAnnee = kmByYear.get(thisYear) ?? 0;
  const elevCetteAnnee = elevByYear.get(thisYear) ?? 0;

  // ── Efforts spéciaux ──
  const hasDoubleJournee = (() => {
    const byDay = new Map<string, number>();
    runs.forEach(a => { const d = a.start_date_local.split("T")[0]; byDay.set(d, (byDay.get(d) ?? 0) + 1); });
    return [...byDay.values()].some(v => v >= 2);
  })();

  const hasBackToBack = (() => {
    const days = [...new Set(runs.map(a => a.start_date_local.split("T")[0]))].sort();
    for(let i = 0; i < days.length - 1; i++) {
      const a = new Date(days[i]), b = new Date(days[i+1]);
      if((b.getTime() - a.getTime()) / 86400000 === 1) return true;
    }
    return false;
  })();

  const hasTriple = (() => {
    const days = [...new Set(runs.map(a => a.start_date_local.split("T")[0]))].sort();
    for(let i = 0; i < days.length - 2; i++) {
      const a = new Date(days[i]), b = new Date(days[i+1]), c = new Date(days[i+2]);
      if((b.getTime()-a.getTime())/86400000 === 1 && (c.getTime()-b.getTime())/86400000 === 1) return true;
    }
    return false;
  })();

  const hasLongRun = runs.some(a => {
    const p = associations.get(a.id);
    return (p?.distance_km ?? a.distance/1000) >= 10;
  });

  const hasEarlyBird = runs.some(a => {
    const h = new Date(a.start_date_local).getHours();
    return h < 7;
  });

  const hasNoctambule = runs.some(a => {
    const h = new Date(a.start_date_local).getHours();
    return h >= 20;
  });

  const hasNoonRun = runs.some(a => {
    const h = new Date(a.start_date_local).getHours();
    return h >= 12 && h < 14;
  });

  // ── Défis calendrier ──
  const hasAnniversaryRun = false; // nécessite date de naissance

  const hasNewYearRun = runs.some(a => {
    const d = new Date(a.start_date_local);
    return d.getMonth() === 0 && d.getDate() === 1;
  });

  const hasFirstOfMonth = (() => {
    const months = new Set<string>();
    runs.filter(a => new Date(a.start_date_local).getDate() === 1)
        .forEach(a => months.add(a.start_date_local.substring(0,7)));
    return months.size;
  })();

  const hasLastDayOfYear = runs.some(a => {
    const d = new Date(a.start_date_local);
    return d.getMonth() === 11 && d.getDate() === 31;
  });

  // 4 saisons dans la même année calendaire
  const getSeason = (m: number) => m >= 2 && m <= 4 ? "printemps" : m >= 5 && m <= 7 ? "été" : m >= 8 && m <= 10 ? "automne" : "hiver";
  const seasonsByYear = new Map<string, Set<string>>();
  runs.forEach(a => {
    const d = new Date(a.start_date_local);
    const y = String(d.getFullYear());
    if (!seasonsByYear.has(y)) seasonsByYear.set(y, new Set());
    seasonsByYear.get(y)!.add(getSeason(d.getMonth()));
  });
  const nbSaisons = Math.max(0, ...[...seasonsByYear.values()].map(s => s.size));

  const hasWinterRun = runs.some(a => { const m = new Date(a.start_date_local).getMonth(); return m === 11 || m === 0 || m === 1; });
  const hasSummerRun = runs.some(a => { const m = new Date(a.start_date_local).getMonth(); return m >= 5 && m <= 7; });

  // ── Symboliques / fun ──
  const hasSaintValentin = runs.some(a => {
    const d = new Date(a.start_date_local);
    return d.getMonth() === 1 && d.getDate() === 14;
  });

  const hasVendredi13 = runs.some(a => {
    const d = new Date(a.start_date_local);
    return d.getDate() === 13 && d.getDay() === 5;
  });

  const hasSolstice = runs.some(a => {
    const d = new Date(a.start_date_local);
    return (d.getMonth() === 5 && d.getDate() === 21) || (d.getMonth() === 11 && d.getDate() === 21);
  });

  const hasMemeJourDeuxAns = (() => {
    const byMMDD = new Map<string, Set<number>>();
    runs.forEach(a => {
      const d = new Date(a.start_date_local);
      const key = `${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      if(!byMMDD.has(key)) byMMDD.set(key, new Set());
      byMMDD.get(key)!.add(d.getFullYear());
    });
    return [...byMMDD.values()].some(years => years.size >= 2);
  })();

  // Pleine lune : algorithme simple (cycle ~29.53j depuis ref connue)
  const hasJourneeOlympique = runs.some(a => {
    const d = new Date(a.start_date_local);
    return d.getMonth() === 6 && d.getDate() === 28;
  });

  const hasOuvertureJO2024 = runs.some(a => {
    const d = new Date(a.start_date_local);
    return d.getFullYear() === 2024 && d.getMonth() === 6 && d.getDate() === 26;
  });

  const hasPleineLune = (() => {
    const REF_FULL_MOON = new Date("2000-01-06T00:00:00Z").getTime();
    const CYCLE = 29.53 * 24 * 3600 * 1000;
    return runs.some(a => {
      const t = new Date(a.start_date_local).getTime();
      const phase = ((t - REF_FULL_MOON) % CYCLE + CYCLE) % CYCLE;
      const dayPhase = phase / (24 * 3600 * 1000);
      return dayPhase >= 13.5 && dayPhase <= 15.5;
    });
  })();

  // ── Défis allure ──
  // Défis allure : uniquement les courses associées à un parcours
  const hasSub5 = runs.some(a => {
    const p = associations.get(a.id);
    if (!p?.distance_km) return false;
    const speed = (p.distance_km * 1000) / getTime(a);
    return speed >= (1000/300);
  });

  const hasSub6 = runs.some(a => {
    const p = associations.get(a.id);
    if (!p?.distance_km) return false;
    const speed = (p.distance_km * 1000) / getTime(a);
    return speed >= (1000/360);
  });

  const progressionAllure = (() => {
    const withParcours = runs.filter(a => associations.get(a.id)?.distance_km);
    if(withParcours.length < 2) return 0;
    const first = withParcours[withParcours.length - 1];
    const last = withParcours[0];
    const pF = associations.get(first.id)!;
    const pL = associations.get(last.id)!;
    const paceFirst = 1000 / ((pF.distance_km! * 1000) / getTime(first));
    const paceLast = 1000 / ((pL.distance_km! * 1000) / getTime(last));
    return Math.round(paceFirst - paceLast); // positif = amélioration
  })();

  // ── Temps cumulés (en minutes) ──
  const totalMinutes = runs.reduce((s, a) => s + getTime(a) / 60, 0);

  // ── Saisons individuelles ──
  const hasSpringRun = runs.some(a => { const m = new Date(a.start_date_local).getMonth(); return m >= 2 && m <= 4; });
  const hasAutumnRun = runs.some(a => { const m = new Date(a.start_date_local).getMonth(); return m >= 8 && m <= 10; });

  return {
    totalSorties, totalKm, totalDenivele,
    maxSortiesMois, maxKmMois, maxElevMois,
    maxKmAnnee, maxElevAnnee,
    bestStreak, streakActuelle,
    sortiesGroupe, nbParcours,
    kmCeMois, sortiesCeMois, elevCeMois,
    kmCetteAnnee, elevCetteAnnee,
    hasDoubleJournee, hasBackToBack, hasTriple, hasLongRun,
    hasEarlyBird, hasNoctambule, hasNoonRun,
    hasNewYearRun, hasFirstOfMonth, hasLastDayOfYear,
    nbSaisons, hasWinterRun, hasSummerRun, hasSpringRun, hasAutumnRun,
    hasSaintValentin, hasVendredi13, hasSolstice, hasMemeJourDeuxAns, hasPleineLune,
    hasJourneeOlympique, hasOuvertureJO2024,
    hasSub5, hasSub6, progressionAllure,
    totalMinutes,
  };
}

// ─── Définition des badges ────────────────────────────────────────────────────

function getBadges(s: ReturnType<typeof computeStats>) {
  const v = (val: number, target: number) => Math.min(1, val / target);

  return [
    {
      category: "Sorties totales",
      icon: "ti-run",
      description: "Chaque course compte",
      items: [
        { name: "Premier pas", desc: "1ère sortie", emoji: "🏃", target: 1, val: s.totalSorties },
        { name: "Lancé", desc: "5 sorties", emoji: "🔥", target: 5, val: s.totalSorties },
        { name: "Habitué", desc: "10 sorties", emoji: "⚡", target: 10, val: s.totalSorties },
        { name: "Régulier", desc: "25 sorties", emoji: "🎯", target: 25, val: s.totalSorties },
        { name: "Cinquantième", desc: "50 sorties", emoji: "🏅", target: 50, val: s.totalSorties },
        { name: "Centenaire", desc: "100 sorties", emoji: "💯", target: 100, val: s.totalSorties },
        { name: "Marathonien du quotidien", desc: "250 sorties", emoji: "🦅", target: 250, val: s.totalSorties },
        { name: "Légende", desc: "500 sorties", emoji: "👑", target: 500, val: s.totalSorties },
      ],
    },
    {
      category: "Régularité",
      icon: "ti-flame",
      description: "Semaines consécutives avec au moins une sortie",
      items: [
        { name: "Démarrage", desc: "2 sem. de suite", emoji: "✨", target: 2, val: s.bestStreak },
        { name: "Rythme", desc: "4 sem. de suite", emoji: "🔁", target: 4, val: s.bestStreak },
        { name: "Discipline", desc: "8 sem. de suite", emoji: "🏋", target: 8, val: s.bestStreak },
        { name: "Fer forgé", desc: "16 sem. de suite", emoji: "⚙️", target: 16, val: s.bestStreak },
        { name: "Invincible", desc: "26 sem. de suite", emoji: "🛡️", target: 26, val: s.bestStreak },
        { name: "Machine", desc: "52 sem. de suite", emoji: "🤖", target: 52, val: s.bestStreak },
      ],
    },
    {
      category: "Km mensuels",
      icon: "ti-map-pin",
      description: "Record sur un même mois calendaire",
      items: [
        { name: "Échauffement", desc: "5 km en un mois", emoji: "🌱", target: 5, val: s.maxKmMois },
        { name: "En route", desc: "10 km en un mois", emoji: "🗺", target: 10, val: s.maxKmMois },
        { name: "Explorateur", desc: "25 km en un mois", emoji: "🧭", target: 25, val: s.maxKmMois },
        { name: "Marcheur de lune", desc: "50 km en un mois", emoji: "🌕", target: 50, val: s.maxKmMois },
        { name: "Ultra mensuel", desc: "100 km en un mois", emoji: "🌊", target: 100, val: s.maxKmMois },
        { name: "150 club", desc: "150 km en un mois", emoji: "🚀", target: 150, val: s.maxKmMois },
      ],
    },
    {
      category: "Km annuels",
      icon: "ti-world",
      description: "Sur une même année calendaire",
      items: [
        { name: "Débutant", desc: "25 km en un an", emoji: "🌿", target: 25, val: s.maxKmAnnee },
        { name: "Confirmé", desc: "75 km en un an", emoji: "🌳", target: 75, val: s.maxKmAnnee },
        { name: "Endurant", desc: "150 km en un an", emoji: "🏔", target: 150, val: s.maxKmAnnee },
        { name: "Sérieux", desc: "300 km en un an", emoji: "🦁", target: 300, val: s.maxKmAnnee },
        { name: "Élite", desc: "500 km en un an", emoji: "🌟", target: 500, val: s.maxKmAnnee },
        { name: "Transcendant", desc: "1000 km en un an", emoji: "🏆", target: 1000, val: s.maxKmAnnee },
      ],
    },
    {
      category: "Dénivelé annuel",
      icon: "ti-mountain",
      description: "D+ cumulé sur une même année calendaire",
      items: [
        { name: "Premiers mètres", desc: "500m D+ en un an", emoji: "🌄", target: 500, val: s.maxElevAnnee },
        { name: "Premier km vertical", desc: "1000m D+ en un an", emoji: "⛰", target: 1000, val: s.maxElevAnnee },
        { name: "Mont Fuji", desc: "3776m D+ en un an", emoji: "🗻", target: 3776, val: s.maxElevAnnee },
        { name: "Mont Blanc", desc: "4808m D+ en un an", emoji: "🏔️", target: 4808, val: s.maxElevAnnee },
        { name: "Kilimandjaro", desc: "5895m D+ en un an", emoji: "🌋", target: 5895, val: s.maxElevAnnee },
        { name: "Denali", desc: "6190m D+ en un an", emoji: "❄️", target: 6190, val: s.maxElevAnnee },
        { name: "Aconcagua", desc: "6961m D+ en un an", emoji: "⛰️", target: 6961, val: s.maxElevAnnee },
        { name: "K2", desc: "8611m D+ en un an", emoji: "🌨️", target: 8611, val: s.maxElevAnnee },
        { name: "Everest", desc: "8849m D+ en un an", emoji: "👑", target: 8849, val: s.maxElevAnnee },
      ],
    },
    {
      category: "Dénivelé all time",
      icon: "ti-stairs-up",
      description: "D+ cumulé sur toutes tes courses",
      items: [
        { name: "Mont Fuji", desc: "3776m D+ all time", emoji: "🗻", target: 3776, val: s.totalDenivele },
        { name: "Mont Blanc", desc: "4808m D+ all time", emoji: "🏔️", target: 4808, val: s.totalDenivele },
        { name: "Kilimandjaro", desc: "5895m D+ all time", emoji: "🌋", target: 5895, val: s.totalDenivele },
        { name: "Denali", desc: "6190m D+ all time", emoji: "❄️", target: 6190, val: s.totalDenivele },
        { name: "Aconcagua", desc: "6961m D+ all time", emoji: "⛰️", target: 6961, val: s.totalDenivele },
        { name: "K2", desc: "8611m D+ all time", emoji: "🌨️", target: 8611, val: s.totalDenivele },
        { name: "Everest", desc: "8849m D+ all time", emoji: "🗻", target: 8849, val: s.totalDenivele },
        { name: "7 sommets", desc: "45090m · toutes les montagnes", emoji: "🌍", target: 45090, val: s.totalDenivele },
        { name: "Everest ×2", desc: "17698m D+ all time", emoji: "🏔️", target: 17698, val: s.totalDenivele },
        { name: "Everest ×3", desc: "26547m D+ all time", emoji: "🌌", target: 26547, val: s.totalDenivele },
        { name: "Everest ×5", desc: "44245m D+ all time", emoji: "✨", target: 44245, val: s.totalDenivele },
        { name: "Everest ×10", desc: "88490m D+ all time", emoji: "👑", target: 88490, val: s.totalDenivele },
      ],
    },
    {
      category: "Social",
      icon: "ti-users",
      description: "Courir avec d'autres",
      items: [
        { name: "Duo", desc: "1 sortie en groupe", emoji: "👥", target: 1, val: s.sortiesGroupe },
        { name: "Équipier", desc: "5 sorties en groupe", emoji: "🤝", target: 5, val: s.sortiesGroupe },
        { name: "Leader", desc: "15 sorties en groupe", emoji: "🎽", target: 15, val: s.sortiesGroupe },
        { name: "Coach", desc: "30 sorties en groupe", emoji: "📣", target: 30, val: s.sortiesGroupe },
      ],
    },
    {
      category: "Exploration",
      icon: "ti-route",
      description: "Découvrir de nouveaux parcours",
      items: [
        { name: "Premier tracé", desc: "1 parcours associé", emoji: "📌", target: 1, val: s.nbParcours },
        { name: "Biparcourier", desc: "2 parcours", emoji: "🗺", target: 2, val: s.nbParcours },
        { name: "Polyvalent", desc: "5 parcours", emoji: "🧭", target: 5, val: s.nbParcours },
        { name: "Aventurier", desc: "10 parcours", emoji: "🌍", target: 10, val: s.nbParcours },
      ],
    },
    {
      category: "Efforts spéciaux",
      icon: "ti-bolt",
      description: "Des sorties qui sortent de l'ordinaire",
      items: [
        { name: "Lève-tôt", desc: "Courir avant 7h du matin", emoji: "🌅", target: 1, val: s.hasEarlyBird ? 1 : 0 },
        { name: "Noctambule", desc: "Courir après 20h", emoji: "🌙", target: 1, val: s.hasNoctambule ? 1 : 0 },
        { name: "Pause déj", desc: "Courir entre 12h et 14h", emoji: "☀️", target: 1, val: s.hasNoonRun ? 1 : 0 },
        { name: "Double peine", desc: "2 sorties dans la même journée", emoji: "⚡", target: 1, val: s.hasDoubleJournee ? 1 : 0 },
        { name: "Back to back", desc: "Courir 2 jours de suite", emoji: "🔗", target: 1, val: s.hasBackToBack ? 1 : 0 },
        { name: "Trilogie", desc: "Courir 3 jours de suite", emoji: "🔥", target: 1, val: s.hasTriple ? 1 : 0 },
        { name: "Long run", desc: "Une sortie de plus de 10km", emoji: "🏃", target: 1, val: s.hasLongRun ? 1 : 0 },
      ],
    },
    {
      category: "Défis calendrier",
      icon: "ti-calendar",
      description: "Des sorties liées à des dates particulières",
      items: [
        { name: "Bonne année", desc: "Courir le 1er janvier", emoji: "🎉", target: 1, val: s.hasNewYearRun ? 1 : 0 },
        { name: "Dernier jour", desc: "Courir le 31 décembre", emoji: "🎊", target: 1, val: s.hasLastDayOfYear ? 1 : 0 },
        { name: "Premier du mois", desc: "Courir le 1er du mois 3 fois", emoji: "📅", target: 3, val: s.hasFirstOfMonth },
        { name: "Mensualiste", desc: "Courir le 1er du mois 6 fois", emoji: "🗓", target: 6, val: s.hasFirstOfMonth },
        { name: "Frileuse", desc: "Courir en hiver", emoji: "❄️", target: 1, val: s.hasWinterRun ? 1 : 0 },
        { name: "Printanier", desc: "Courir au printemps", emoji: "🌸", target: 1, val: s.hasSpringRun ? 1 : 0 },
        { name: "Estival", desc: "Courir en été", emoji: "☀️", target: 1, val: s.hasSummerRun ? 1 : 0 },
        { name: "Automnal", desc: "Courir en automne", emoji: "🍂", target: 1, val: s.hasAutumnRun ? 1 : 0 },
        { name: "Quatre saisons", desc: "Courir dans les 4 saisons la même année", emoji: "🌍", target: 4, val: s.nbSaisons },
      ],
    },
    {
      category: "Défis d'allure",
      icon: "ti-speedboat",
      description: "Franchir les murs psychologiques",
      items: [
        { name: "Mur des 6 min", desc: "Courir sous les 6'/km", emoji: "💨", target: 1, val: s.hasSub6 ? 1 : 0 },
        { name: "Mur des 5 min", desc: "Courir sous les 5'/km", emoji: "⚡", target: 1, val: s.hasSub5 ? 1 : 0 },
        { name: "Progression +30s", desc: "Améliorer son allure de 30s/km", emoji: "📈", target: 30, val: Math.max(0, s.progressionAllure) },
        { name: "Progression +1 min", desc: "Améliorer son allure de 1min/km", emoji: "🚀", target: 60, val: Math.max(0, s.progressionAllure) },
        { name: "Progression +2 min", desc: "Améliorer son allure de 2min/km", emoji: "🏆", target: 120, val: Math.max(0, s.progressionAllure) },
      ],
    },
    {
      category: "Temps cumulés",
      icon: "ti-clock",
      description: "Heures passées à courir",
      items: [
        { name: "1 heure", desc: "1h de course au total", emoji: "⏱️", target: 60, val: s.totalMinutes },
        { name: "5 heures", desc: "5h de course au total", emoji: "⏰", target: 300, val: s.totalMinutes },
        { name: "10 heures", desc: "10h de course au total", emoji: "🕰️", target: 600, val: s.totalMinutes },
        { name: "25 heures", desc: "25h de course au total", emoji: "📡", target: 1500, val: s.totalMinutes },
        { name: "50 heures", desc: "50h de course au total", emoji: "🔥", target: 3000, val: s.totalMinutes },
        { name: "100 heures", desc: "100h de course au total", emoji: "👑", target: 6000, val: s.totalMinutes },
      ],
    },
    {
      category: "Symboliques",
      icon: "ti-stars",
      description: "Des sorties qui ne s'oublient pas",
      items: [
        { name: "Saint-Valentin", desc: "Courir le 14 février", emoji: "❤️", target: 1, val: s.hasSaintValentin ? 1 : 0 },
        { name: "Vendredi 13", desc: "Courir un vendredi 13", emoji: "🖤", target: 1, val: s.hasVendredi13 ? 1 : 0 },
        { name: "Solstice", desc: "Courir le 21 juin ou 21 décembre", emoji: "🌞", target: 1, val: s.hasSolstice ? 1 : 0 },
        { name: "Fidélité", desc: "Courir le même jour deux années de suite", emoji: "🔄", target: 1, val: s.hasMemeJourDeuxAns ? 1 : 0 },
        { name: "Pleine lune", desc: "Courir un soir de pleine lune", emoji: "🌕", target: 1, val: s.hasPleineLune ? 1 : 0 },
        { name: "Journée olympique", desc: "Courir le 28 juillet", emoji: "🏅", target: 1, val: s.hasJourneeOlympique ? 1 : 0 },
      ],
    },
  ];
}

// ─── Composants ───────────────────────────────────────────────────────────────

const card: React.CSSProperties = { background:"var(--surface)",border:"0.5px solid var(--border)",borderRadius:12,padding:"18px 20px" };

function BadgeCard({ name, desc, emoji, target, val }: { name:string; desc:string; emoji:string; target:number; val:number }) {
  const unlocked = val >= target;
  const pct = Math.round(Math.min(1, val / target) * 100);

  return (
    <div className={`badge-card ${unlocked ? "badge-earned" : "badge-locked"}`} style={{
      background: unlocked ? "rgba(245,166,35,0.04)" : "var(--surface)",
      border: unlocked ? "0.5px solid rgba(245,166,35,0.35)" : "0.5px solid var(--border)",
      borderRadius: 10, padding: "14px 12px", textAlign: "center",
      position: "relative",
    }}>
      {unlocked && (
        <div style={{ position:"absolute", top:8, right:8, width:16, height:16, background:"#f5a623", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width="8" height="8" viewBox="0 0 10 10"><polyline points="1,5 4,8 9,2" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      )}
      <div className="badge-icon" style={{ width:44, height:44, borderRadius:"50%", background: unlocked ? "rgba(245,166,35,0.12)" : "var(--surface-2)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px", fontSize:20 }}>
        {unlocked ? emoji : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
      </div>
      <p style={{ fontSize:12, fontWeight:500, color:"var(--text-primary)", margin:"0 0 3px", fontFamily:"var(--font-geist)" }}>{name}</p>
      <p style={{ fontSize:11, color:"var(--text-dim)", margin:"0 0 8px", fontFamily:"var(--font-geist)", lineHeight:1.4 }}>{desc}</p>
      {!unlocked && (
        <>
          <div style={{ height:3, background:"var(--surface-3)", borderRadius:2, overflow:"hidden" }}>
            <div style={{ height:3, background:"#f5a623", borderRadius:2, width:`${pct}%`, transition:"width .4s" }} />
          </div>
          <p style={{ fontSize:10, color:"var(--text-dim)", margin:"4px 0 0", fontFamily:"var(--font-dm-mono)" }}>
            {val % 1 === 0 ? Math.floor(val) : val.toFixed(1)} / {target}
          </p>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface BadgeInfo { id: string; name: string; emoji: string; }

export default function RecompensesPage() {
  const pathname = usePathname();
  const isDemo = pathname?.startsWith("/demo") ?? false;
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReturnType<typeof computeStats> | null>(null);
  const [timeField, setTimeField] = useState<"moving_time"|"elapsed_time">("moving_time");
  const [newBadges, setNewBadges] = useState<BadgeInfo[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [nextBadgeId, setNextBadgeId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    async function init() {
      const { createClient } = await import("@/lib/supabase");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setIsLoggedIn(true);

      const apiUrl = isDemo ? "/api/demo" : "/api/strava/activities";
      const res = await fetch(apiUrl);
      if (!res.ok) { setLoading(false); return; }
      const json = await res.json();
      const runs = (json.activities ?? []).filter(isRun);

      let computedStats: ReturnType<typeof computeStats>;

      if (isDemo) {
        setIsLoggedIn(true);
        const assocData = json.associations || [];
        const assocMap = new Map<number, Parcours | null>();
        (assocData as Association[]).forEach(a => { assocMap.set(Number(a.strava_activity_id), a.parcours); });
        computedStats = computeStats(runs, assocMap, "moving_time");
      } else if (user) {
        const [{ data: parc }, assocRes, prefsRes] = await Promise.all([
          supabase.from("parcours").select("id,nom,distance_km,denivele_positif_m").eq("actif",true).eq("user_id",user.id),
          fetch("/api/strava/associations"),
          supabase.from("user_preferences").select("time_field").eq("user_id",user.id).single(),
        ]);
        const tf = (prefsRes.data as {time_field?:string} | null)?.time_field as "moving_time"|"elapsed_time" ?? "moving_time";
        setTimeField(tf);

        const parcoursBDD = parc || [];
        const assocData = assocRes.ok ? await assocRes.json() : [];
        const assocMap = new Map<number, Parcours | null>();
        (assocData as Association[]).forEach(a => { assocMap.set(Number(a.strava_activity_id), a.parcours); });
        runs.forEach((act: Activity) => {
          if (!assocMap.has(act.id)) {
            const match = parcoursBDD.find((p: Parcours) => p.nom.toLowerCase() === act.name.trim().toLowerCase());
            if (match) assocMap.set(act.id, match);
          }
        });
        computedStats = computeStats(runs, assocMap, tf);
      } else {
        computedStats = computeStats(runs, new Map(), "moving_time");
      }

      setStats(computedStats);

      // Badge notification logic
      const allBadges = getBadges(computedStats);
      const allItems = allBadges.flatMap(cat => cat.items.map(b => ({
        id: `${cat.category}__${b.name}`,
        name: b.name,
        emoji: b.emoji,
        val: b.val,
        target: b.target,
      })));

      const unlockedIds = allItems.filter(b => b.val >= b.target).map(b => b.id);

      // Find next badge (highest progress ratio, not yet unlocked)
      const notUnlocked = allItems.filter(b => b.val < b.target);
      if (notUnlocked.length > 0) {
        const next = notUnlocked.sort((a, b) => (b.val / b.target) - (a.val / a.target))[0];
        setNextBadgeId(next.id);
      }

      // Compare with seen badges & persist
      if (!isDemo) {
        try {
          // Lecture : localStorage d'abord (toujours fiable), puis merge avec Supabase
          let seen: string[] = [];
          try {
            const raw = localStorage.getItem("pacelab_seen_badges");
            seen = raw ? JSON.parse(raw) : [];
          } catch {}

          if (user) {
            const { data: badgeState, error: readErr } = await supabase
              .from("user_badge_state")
              .select("seen_ids")
              .eq("user_id", user.id)
              .maybeSingle();
            if (!readErr && badgeState?.seen_ids?.length) {
              // Union des deux sources — protège contre désync localStorage/Supabase
              seen = [...new Set([...seen, ...badgeState.seen_ids])];
            }
          }

          const freshBadges = unlockedIds.filter(id => !seen.includes(id));
          if (freshBadges.length > 0) {
            const freshInfo = freshBadges.map(id => allItems.find(b => b.id === id)!).filter(Boolean);
            setNewBadges(freshInfo);
            setShowToast(true);
          }

          // Écriture localStorage (toujours)
          localStorage.setItem("pacelab_seen_badges", JSON.stringify(unlockedIds));

          // Écriture Supabase si connecté
          if (user) {
            const { error: writeErr } = await supabase
              .from("user_badge_state")
              .upsert(
                { user_id: user.id, seen_ids: unlockedIds, updated_at: new Date().toISOString() },
                { onConflict: "user_id" }
              );
            if (writeErr) console.warn("[badges] upsert error:", writeErr.message);
          }
          localStorage.setItem("pacelab_badge_count", String(unlockedIds.length));
          const unlockedFull = allItems.filter(b => b.val >= b.target).map(({id, name, emoji}) => ({id, name, emoji}));
          localStorage.setItem("pacelab_unlocked_badges_full", JSON.stringify(unlockedFull));
        } catch {}
        localStorage.removeItem("pacelab_badge_dot");
        window.dispatchEvent(new Event("pacelab-badge-update"));
      }

      setLoading(false);
    }
    init();
  }, []);

  const badges = stats ? getBadges(stats) : [];
  const totalUnlocked = badges.reduce((s, cat) => s + cat.items.filter(b => b.val >= b.target).length, 0);
  const totalBadges = badges.reduce((s, cat) => s + cat.items.length, 0);

  return (
    <div style={{ minHeight:"100vh" }}>
      <Navbar isLoggedIn={isLoggedIn} isDemo={isDemo} />

      {/* Modal nouveaux badges — portal pour échapper au transform du Template */}
      {mounted && showToast && newBadges.length > 0 && createPortal(
        <div
          onClick={e => e.target === e.currentTarget && setShowToast(false)}
          style={{
            position:"fixed", inset:0, zIndex:9999,
            background:"rgba(0,0,0,0.82)",
            display:"flex", alignItems:"center", justifyContent:"center",
            padding:24,
            animation:"unlock-overlay-in 220ms ease both",
          }}
        >
          <div style={{
            background:"var(--surface)",
            border:"0.5px solid rgba(245,166,35,0.5)",
            borderRadius:20,
            padding:"36px 32px 28px",
            maxWidth:400,
            width:"100%",
            boxShadow:"0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(245,166,35,0.1), 0 0 80px rgba(245,166,35,0.07)",
            position:"relative",
            overflow:"hidden",
            animation:"unlock-modal-in 480ms cubic-bezier(0.16, 1, 0.3, 1) both",
          }}>
            {/* Glow orb */}
            <div style={{
              position:"absolute", top:-60, left:"50%", transform:"translateX(-50%)",
              width:280, height:200, borderRadius:"50%",
              background:"radial-gradient(ellipse, rgba(245,166,35,0.1) 0%, transparent 70%)",
              pointerEvents:"none",
            }} />

            {/* Close */}
            <button
              onClick={() => setShowToast(false)}
              style={{
                position:"absolute", top:14, right:14,
                background:"var(--surface-2)", border:"0.5px solid var(--border-2)",
                borderRadius:"50%", cursor:"pointer", color:"var(--text-muted)",
                width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:16, lineHeight:1,
              }}
            >×</button>

            {/* Header */}
            <div style={{ textAlign:"center", marginBottom:24, position:"relative" }}>
              <div style={{ position:"relative", display:"inline-block", marginBottom:18 }}>
                <div style={{
                  position:"absolute", inset:-10, borderRadius:"50%",
                  border:"1.5px solid rgba(245,166,35,0.4)",
                  animation:"unlock-ring 1.6s ease-out 200ms both",
                }} />
                <div style={{
                  position:"absolute", inset:-10, borderRadius:"50%",
                  border:"1px solid rgba(245,166,35,0.2)",
                  animation:"unlock-ring 1.6s ease-out 450ms both",
                }} />
                <span style={{
                  fontSize:48, display:"block", lineHeight:1,
                  animation:"unlock-emoji-pop 550ms cubic-bezier(0.16, 1, 0.3, 1) 80ms both",
                }}>
                  🏆
                </span>
              </div>
              <p style={{
                fontSize:11, color:"var(--accent)", fontFamily:"var(--font-geist)",
                letterSpacing:"0.08em", textTransform:"uppercase", fontWeight:700,
                margin:"0 0 6px",
              }}>
                {newBadges.length === 1 ? "Badge débloqué !" : `${newBadges.length} badges débloqués !`}
              </p>
              <p style={{ fontSize:13, color:"var(--text-muted)", fontFamily:"var(--font-geist)", margin:0 }}>
                Continue comme ça, tu es au top 🔥
              </p>
            </div>

            {/* Badge items */}
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:24 }}>
              {newBadges.map((b, i) => (
                <div
                  key={b.id}
                  style={{
                    display:"flex", alignItems:"center", gap:14,
                    background:"rgba(245,166,35,0.06)",
                    border:"0.5px solid rgba(245,166,35,0.25)",
                    borderRadius:12,
                    padding:"14px 16px",
                    animation:`unlock-badge-in 450ms cubic-bezier(0.16, 1, 0.3, 1) ${160 + i * 90}ms both`,
                  }}
                >
                  <span style={{ fontSize:28, flexShrink:0 }}>{b.emoji}</span>
                  <span style={{ fontSize:14, fontWeight:600, color:"var(--text-primary)", fontFamily:"var(--font-geist)" }}>{b.name}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowToast(false)}
              style={{
                width:"100%",
                background:"var(--accent)", color:"#111",
                border:"none", borderRadius:10,
                padding:"12px", fontSize:14, fontWeight:700,
                cursor:"pointer", fontFamily:"var(--font-geist)",
                animation:`unlock-badge-in 450ms cubic-bezier(0.16, 1, 0.3, 1) ${160 + newBadges.length * 90}ms both`,
              }}
            >
              Super, merci !
            </button>
          </div>
        </div>,
        document.body
      )}

      <main style={{ padding:"24px", maxWidth:1100, margin:"0 auto" }}>
        <div style={{ marginBottom:24 }}>
          <p style={{ fontSize:11, color:"var(--text-dim)", letterSpacing:"0.04em", textTransform:"uppercase", margin:"0 0 4px" }}>Progression</p>
          <h1 style={{ fontSize:22, fontWeight:500, color:"#fff", margin:0 }}>Mes badges</h1>
        </div>

        {loading ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:"var(--text-dim)", fontSize:13 }}>Chargement...</div>
        ) : !stats ? (
          <div style={{ textAlign:"center", padding:"60px 0" }}>
            <p style={{ fontSize:13, color:"var(--text-dim)", fontFamily:"var(--font-geist)", margin:"0 0 16px" }}>Synchronise tes données Strava pour voir tes badges.</p>
            <a href="/mescourses" style={{ fontSize:13, color:"#f5a623", fontFamily:"var(--font-geist)", textDecoration:"none" }}>Aller à Mes Courses →</a>
          </div>
        ) : (
          <>
            {/* Prochain badge à débloquer */}
            {nextBadgeId && (() => {
              const allBadges = getBadges(stats!);
              const allItems = allBadges.flatMap(cat => cat.items.map(b => ({ ...b, id: `${cat.category}__${b.name}`, category: cat.category })));
              const next = allItems.find(b => b.id === nextBadgeId);
              if (!next) return null;
              const pct = Math.round(Math.min(1, next.val / next.target) * 100);
              return (
                <div
                  onClick={() => document.getElementById(`cat-${next.category}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  style={{
                    background: "var(--surface)", border: "0.5px solid rgba(245,166,35,0.3)",
                    borderRadius: 12, padding: "16px 20px", marginBottom: 24, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 16, transition: "border-color .15s",
                    boxShadow: "0 0 0 1px rgba(245,166,35,0.06)",
                  }}
                >
                  <div style={{ width:48, height:48, borderRadius:"50%", background:"rgba(245,166,35,0.08)", border:"0.5px solid rgba(245,166,35,0.25)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                      <span style={{ fontSize:10, color:"var(--accent)", fontFamily:"var(--font-geist)", letterSpacing:"0.05em", textTransform:"uppercase", fontWeight:600 }}>Prochain badge</span>
                      <span style={{ fontSize:10, color:"var(--text-dim)", fontFamily:"var(--font-geist)" }}>{next.category}</span>
                    </div>
                    <p style={{ fontSize:14, fontWeight:500, color:"var(--text-primary)", margin:"0 0 2px", fontFamily:"var(--font-geist)" }}>{next.name}</p>
                    <p style={{ fontSize:12, color:"var(--text-dim)", margin:"0 0 8px", fontFamily:"var(--font-geist)" }}>{next.desc}</p>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ flex:1, height:4, background:"var(--surface-3)", borderRadius:2, overflow:"hidden" }}>
                        <div style={{ height:4, background:"var(--accent)", borderRadius:2, width:`${pct}%`, transition:"width .4s" }} />
                      </div>
                      <span style={{ fontSize:11, color:"var(--accent)", fontFamily:"var(--font-dm-mono)", flexShrink:0 }}>
                        {next.val % 1 === 0 ? Math.floor(next.val) : next.val.toFixed(1)} / {next.target} · {pct}%
                      </span>
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
                </div>
              );
            })()}

            {/* Stats globales */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:24 }}>
              {[
                { l:"Badges débloqués", v:`${totalUnlocked} / ${totalBadges}`, color:"#f5a623" },
                { l:"Sorties totales", v:stats.totalSorties },
                { l:"Km totaux", v:`${Math.round(stats.totalKm)} km` },
                { l:"D+ total", v:`${Math.round(stats.totalDenivele)}m` },
                { l:"Streak record", v:`${stats.bestStreak} sem.` },
              ].map(({ l, v, color }) => (
                <div key={l} style={card}>
                  <p style={{ ...lbl, margin:"0 0 6px" }}>{l}</p>
                  <p style={{ fontSize:18, fontWeight:500, color: color ?? "var(--text-primary)", margin:0, fontFamily:"var(--font-dm-mono)" }}>{v}</p>
                </div>
              ))}
            </div>

            {/* Catégories */}
            {badges.map(cat => {
              const unlockedCount = cat.items.filter(b => b.val >= b.target).length;
              return (
                <div key={cat.category} id={`cat-${cat.category}`} style={{ marginBottom:28 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                    <i className={`ti ${cat.icon}`} style={{ fontSize:18, color:"#f5a623" }} aria-hidden="true" />
                    <div>
                      <p style={{ fontSize:14, fontWeight:500, color:"var(--text-primary)", margin:0, fontFamily:"var(--font-geist)" }}>
                        {cat.category}
                        <span style={{ marginLeft:8, fontSize:11, color:"var(--text-dim)", fontWeight:400 }}>
                          {unlockedCount}/{cat.items.length}
                        </span>
                      </p>
                      <p style={{ fontSize:11, color:"var(--text-dim)", margin:"2px 0 0", fontFamily:"var(--font-geist)" }}>{cat.description}</p>
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:10 }}>
                    {cat.items.map(b => <BadgeCard key={b.name} {...b} />)}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </main>
    </div>
  );
}