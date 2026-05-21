"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { secondesToDisplay, secondesToHours, allureMinKm } from "@/lib/types";
import type { CourseEnrichie } from "@/lib/types";
import ObjectifCarousel from "@/components/ObjectifCarousel";
import StreakCalendar from "@/components/StreakCalendar";
import CountUp from "@/components/CountUp";

interface Parcours {
  id: string;
  nom: string;
  distance_km: number | null;
  denivele_positif_m: number | null;
  description: string | null;
}

interface Objectif {
  id: string;
  titre: string;
  type: "duree" | "distance" | "sorties";
  valeur: number;
  periode: "hebdo" | "mensuel" | "annuel" | null;
  annee: number | null;
  date_debut: string | null;
  date_fin: string | null;
}

interface DashboardData {
  courses: CourseEnrichie[];
  parcours: Parcours[];
  compagnons: { id: string; nom: string }[];
  objectifs: Objectif[];
}

const PERIODES = [
  { value: "tout", label: "Tout" },
  { value: "7j", label: "7 jours" },
  { value: "30j", label: "30 jours" },
  { value: "2026", label: "2026" },
  { value: "2025", label: "2025" },
];

// Palette étendue à 20 couleurs pour les compagnons
const COMPAGNON_COLORS = [
  { bg: "#0f2a1e", border: "#1a4a30", text: "#1d9e75" }, // vert
  { bg: "#0f1a2e", border: "#1a304a", text: "#3d8fe0" }, // bleu
  { bg: "#2a1a2e", border: "#4a2a50", text: "#b06de0" }, // violet
  { bg: "#2a1a0f", border: "#4a3010", text: "#e09030" }, // orange
  { bg: "#2a200f", border: "#4a3820", text: "#c0a030" }, // or
  { bg: "#1a0f2a", border: "#301a4a", text: "#8060e0" }, // indigo
  { bg: "#2a0f0f", border: "#4a2020", text: "#e05050" }, // rouge
  { bg: "#0f2a2a", border: "#1a4a4a", text: "#1db8b8" }, // cyan
  { bg: "#2a1520", border: "#4a2535", text: "#e060a0" }, // rose
  { bg: "#1a2a0f", border: "#304a1a", text: "#80c030" }, // vert lime
  { bg: "#2a2a0f", border: "#4a4a1a", text: "#d0d030" }, // jaune
  { bg: "#0f1a1a", border: "#1a3030", text: "#30b8a0" }, // teal
  { bg: "#1e0f2a", border: "#381a4a", text: "#a040d0" }, // pourpre
  { bg: "#2a1808", border: "#4a2c10", text: "#d07020" }, // brun-orangé
  { bg: "#082a1e", border: "#104a30", text: "#10c870" }, // vert émeraude
  { bg: "#0a1a2e", border: "#142a4a", text: "#2070d0" }, // bleu roi
  { bg: "#2a080f", border: "#4a1020", text: "#d02040" }, // rouge vif
  { bg: "#1a2a20", border: "#2a4a38", text: "#50c888" }, // vert menthe
  { bg: "#2a1a18", border: "#4a2e28", text: "#c06858" }, // terracotta
  { bg: "#181a2a", border: "#282c4a", text: "#6878d0" }, // bleu ardoise
];

// Le colorMap est basé sur l'ID du compagnon (stable même si archivé)
// On reçoit TOUS les compagnons (actifs + archivés ayant des courses)
function buildCompagnonColorMap(
  compagnons: { id: string; nom: string }[]
): Record<string, typeof COMPAGNON_COLORS[0]> {
  const map: Record<string, typeof COMPAGNON_COLORS[0]> = {};
  compagnons.forEach((c, i) => {
    map[c.nom] = COMPAGNON_COLORS[i % COMPAGNON_COLORS.length];
  });
  return map;
}

export default function DashboardClient({ isLoggedIn, prenom }: { isLoggedIn: boolean; prenom: string }) {
  const [periode, setPeriode] = useState(new Date().getFullYear().toString());
  const [data, setData] = useState<DashboardData>({ courses: [], parcours: [], compagnons: [], objectifs: [] });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (data.courses.length === 0) setLoading(true);
    const res = await fetch(`/api/dashboard?periode=${periode}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [periode]);

  useEffect(() => { loadData(); }, [loadData]);

  const courses = data.courses;
  const colorMap = buildCompagnonColorMap(data.compagnons);

  const totalSecondes = courses.reduce((s, c) => s + c.duree_secondes, 0);
  const nbCourses = courses.length;

  const totalKm = courses.reduce((s, c) => {
    const p = data.parcours.find((pp) => pp.nom === c.parcours_nom);
    return s + (p?.distance_km ?? 0);
  }, 0);

  const coursesAvecDistance = courses.filter((c) =>
    data.parcours.find((p) => p.nom === c.parcours_nom && p.distance_km)
  );
  const totalSecondesAvecDist = coursesAvecDistance.reduce((s, c) => s + c.duree_secondes, 0);
  const totalKmAvecDist = coursesAvecDistance.reduce((s, c) => {
    const p = data.parcours.find((pp) => pp.nom === c.parcours_nom);
    return s + (p?.distance_km ?? 0);
  }, 0);
  const allureMoyGlobale = totalKmAvecDist > 0 ? allureMinKm(totalSecondesAvecDist, totalKmAvecDist) : null;

  const prParParcours: Record<string, number> = {};
  courses.forEach((c) => {
    if (!c.parcours_nom) return;
    const curr = prParParcours[c.parcours_nom];
    if (!curr || c.duree_secondes < curr) prParParcours[c.parcours_nom] = c.duree_secondes;
  });

  const dernieres = courses.slice(0, 5);

  const parcoursTriesParSorties = [...data.parcours].sort((a, b) => {
    const nbA = courses.filter((c) => c.parcours_nom === a.nom).length;
    const nbB = courses.filter((c) => c.parcours_nom === b.nom).length;
    return nbB - nbA;
  });

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const labelStyle: React.CSSProperties = {
    fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.05em",
    textTransform: "uppercase", margin: "0 0 6px", fontFamily: "var(--font-geist)",
  };

  const coursesSummary = courses.map((c) => ({
    date_course: c.date_course,
    duree_secondes: c.duree_secondes,
    parcours_distance_km: c.parcours_distance_km,
  }));

  return (
    <main style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>

      {!isLoggedIn && (
        <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-geist)" }}>
              Vous consultez le profil public d'<strong style={{ color: "var(--text-primary)" }}>Eliott LEE</strong>
            </span>
          </div>
          <Link href="/login" style={{ background: "var(--accent)", color: "#fff", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 500, textDecoration: "none" }}>
            Se connecter
          </Link>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: "0.04em", textTransform: "uppercase", margin: "0 0 4px" }}>{today}</p>
          <h1 style={{ fontSize: 28, fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>
            {isLoggedIn ? `Bonjour, ${prenom}.` : "Profil d'Eliott"}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {PERIODES.map((p) => (
            <button key={p.value} onClick={() => setPeriode(p.value)} className="filter-pill" style={{
              padding: "5px 13px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-geist)",
              border: periode === p.value ? "0.5px solid rgba(245,166,35,0.5)" : "0.5px solid var(--border)",
              background: periode === p.value ? "var(--accent-dim)" : "transparent",
              color: periode === p.value ? "var(--accent)" : "var(--text-dim)",
            }}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* Corps principal : colonne large + sidebar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }}>

        {/* ── Colonne principale ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Streak — élément visuel fort en haut */}
          <StreakCalendar courses={courses} />

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="card skeleton-pulse" style={{ height: 88 }} />
              <div className="card skeleton-pulse" style={{ height: 220 }} />
              <div className="card skeleton-pulse" style={{ height: 160 }} />
            </div>
          ) : (
            <>
              {/* Dernières sorties */}
              <div className="card bento-hover">
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
                  <div style={{ width: 2, height: 11, background: "var(--accent)", borderRadius: 1, flexShrink: 0 }} />
                  <p style={{ ...labelStyle, margin: 0 }}>Dernières sorties</p>
                </div>
                {dernieres.length === 0 ? (
                  <div style={{ padding: "28px 0", textAlign: "center" }}>
                    <p style={{ fontSize: 13, color: "var(--text-dim)", fontFamily: "var(--font-geist)", margin: "0 0 6px" }}>
                      Aucune sortie sur cette période
                    </p>
                    <p style={{ fontSize: 11, color: "var(--text-dim)", opacity: 0.6, fontFamily: "var(--font-geist)", margin: 0 }}>
                      Change la période ou{" "}
                      <Link href="/saisir" style={{ color: "var(--accent)", textDecoration: "none" }}>ajoute une course</Link>
                    </p>
                  </div>
                ) : dernieres.map((c) => {
                  const p = data.parcours.find((pp) => pp.nom === c.parcours_nom);
                  const allure = p?.distance_km ? allureMinKm(c.duree_secondes, p.distance_km) : null;
                  return (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 0", borderBottom: "0.5px solid var(--border)", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, color: "var(--text-dim)", width: 70, flexShrink: 0, fontFamily: "var(--font-geist)" }}>
                        {new Date(c.date_course).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)", fontFamily: "var(--font-dm-mono)", width: 80, flexShrink: 0 }}>
                        {secondesToDisplay(c.duree_secondes)}
                      </span>
                      {allure && <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-dm-mono)", flex: 1 }}>{allure}</span>}
                      {prParParcours[c.parcours_nom ?? ""] === c.duree_secondes && (
                        <span style={{ fontSize: 10, background: "var(--coral-dim)", border: "0.5px solid var(--coral)", borderRadius: 4, padding: "2px 7px", color: "var(--coral)", fontFamily: "var(--font-geist)" }}>PR</span>
                      )}
                      {c.compagnons && c.compagnons.length > 0 && c.compagnons.map((nom: string) => {
                        const col = colorMap[nom] ?? COMPAGNON_COLORS[0];
                        return <span key={nom} style={{ fontSize: 10, background: col.bg, border: `0.5px solid ${col.border}`, borderRadius: 4, padding: "2px 7px", color: col.text, fontFamily: "var(--font-geist)" }}>{nom}</span>;
                      })}
                      {c.parcours_nom && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                          <span style={{ fontSize: 11, background: "var(--surface-2)", border: "0.5px solid var(--border-2)", borderRadius: 5, padding: "3px 8px", color: "var(--text-muted)", fontWeight: 500, fontFamily: "var(--font-geist)" }}>{c.parcours_nom}</span>
                          {p?.distance_km && <span style={{ fontSize: 10, background: "var(--surface-2)", border: "0.5px solid var(--border-2)", borderRadius: 5, padding: "3px 7px", color: "var(--text-dim)", fontFamily: "var(--font-dm-mono)" }}>{p.distance_km} km</span>}
                          {p?.denivele_positif_m && <span style={{ fontSize: 10, background: "var(--surface-2)", border: "0.5px solid var(--border-2)", borderRadius: 5, padding: "3px 7px", color: "var(--text-dim)", fontFamily: "var(--font-dm-mono)" }}>D+ {p.denivele_positif_m} m</span>}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Parcours */}
              {parcoursTriesParSorties.length > 0 && (
                <div className="card bento-hover">
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
                    <div style={{ width: 2, height: 11, background: "var(--accent)", borderRadius: 1, flexShrink: 0 }} />
                    <p style={{ ...labelStyle, margin: 0 }}>Parcours</p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                    {parcoursTriesParSorties.map((p) => {
                      const cp = courses.filter((c) => c.parcours_nom === p.nom);
                      const pr = cp.length > 0 ? Math.min(...cp.map((c) => c.duree_secondes)) : null;
                      const moy = cp.length > 0 ? Math.round(cp.reduce((s, c) => s + c.duree_secondes, 0) / cp.length) : null;
                      const allureMoy = p.distance_km && moy ? allureMinKm(moy, p.distance_km) : null;
                      const allurePR = p.distance_km && pr ? allureMinKm(pr, p.distance_km) : null;
                      return (
                        <div key={p.id} className="bento-hover" style={{ background: "var(--surface-2)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                            <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-geist)" }}>{p.nom}</p>
                            <span style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-dm-mono)" }}>{cp.length}×</span>
                          </div>
                          <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
                            {p.distance_km && <span style={{ fontSize: 10, background: "var(--surface-3)", border: "0.5px solid var(--border)", borderRadius: 4, padding: "2px 7px", color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>{p.distance_km} km</span>}
                            {p.denivele_positif_m && <span style={{ fontSize: 10, background: "var(--surface-3)", border: "0.5px solid var(--border)", borderRadius: 4, padding: "2px 7px", color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>D+ {p.denivele_positif_m} m</span>}
                          </div>
                          <div style={{ display: "flex", gap: 14 }}>
                            <div>
                              <div style={{ fontSize: 15, fontWeight: 500, color: "var(--coral)", fontFamily: "var(--font-dm-mono)" }}>{pr ? secondesToDisplay(pr) : "—"}</div>
                              {allurePR && <div style={{ fontSize: 10, color: "var(--coral)", opacity: 0.7, fontFamily: "var(--font-dm-mono)" }}>{allurePR}</div>}
                              <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-geist)" }}>PR</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)", fontFamily: "var(--font-dm-mono)" }}>{moy ? secondesToDisplay(moy) : "—"}</div>
                              {allureMoy && <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-dm-mono)" }}>{allureMoy}</div>}
                              <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-geist)" }}>moy.</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Sidebar droite ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Allure — héro metric */}
          <div className="bento-hover" style={{
            background: "var(--accent-dim)",
            border: "0.5px solid rgba(245,166,35,0.28)",
            borderRadius: 14,
            padding: "24px 22px",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{ position: "absolute", bottom: -18, right: -18, width: 100, height: 100, borderRadius: "50%", background: "rgba(245,166,35,0.05)", border: "0.5px solid rgba(245,166,35,0.08)", animation: "orb-float 6s ease-in-out infinite" }} />
            <p style={labelStyle}>Allure moyenne</p>
            <p style={{ fontSize: 52, fontWeight: 500, color: "var(--accent)", margin: "6px 0 2px", lineHeight: 1, fontFamily: "var(--font-dm-mono)", letterSpacing: "-0.03em" }}>{allureMoyGlobale ?? "—"}</p>
            <p style={{ fontSize: 11, color: "rgba(245,166,35,0.6)", margin: 0, fontFamily: "var(--font-geist)" }}>min/km</p>
          </div>

          {/* 3 mini-KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {([
              { l: "Temps", node: secondesToHours(totalSecondes) },
              { l: "Distance", node: <CountUp value={totalKm} decimals={0} suffix=" km" /> },
              { l: "Sorties", node: <CountUp value={nbCourses} /> },
            ] as { l: string; node: React.ReactNode }[]).map(({ l, node }) => (
              <div key={l} className="bento-hover" style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "14px 12px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", bottom: -12, right: -12, width: 60, height: 60, borderRadius: "50%", background: "rgba(245,166,35,0.03)", pointerEvents: "none" }} />
                <p style={{ fontSize: 9, color: "rgba(245,166,35,0.65)", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 6px", fontFamily: "var(--font-geist)", fontWeight: 500 }}>{l}</p>
                <p style={{ fontSize: 22, fontWeight: 600, color: "var(--accent)", margin: 0, lineHeight: 1, fontFamily: "var(--font-dm-mono)", letterSpacing: "-0.03em" }}>{node}</p>
              </div>
            ))}
          </div>

          {/* Objectifs */}
          <ObjectifCarousel objectifs={data.objectifs ?? []} courses={coursesSummary} periode={periode} />

          {/* Compagnons */}
          {!loading && data.compagnons.map((comp) => {
            const col = colorMap[comp.nom] ?? COMPAGNON_COLORS[0];
            const coursesWith = courses.filter((c) => c.compagnons?.includes(comp.nom));
            if (coursesWith.length === 0) return null;
            const detailParParcours = data.parcours
              .map((p) => {
                if (!p.distance_km) return null;
                const cp = coursesWith.filter((c) => c.parcours_nom === p.nom);
                if (cp.length === 0) return null;
                const moyP = Math.round(cp.reduce((s, c) => s + c.duree_secondes, 0) / cp.length);
                return { parcours: p.nom, allure: allureMinKm(moyP, p.distance_km), moySecondes: moyP, nb: cp.length };
              })
              .filter(Boolean);
            return (
              <div key={comp.id} className="bento-hover" style={{ background: col.bg, border: `0.5px solid ${col.border}`, borderRadius: 10, padding: "14px 16px" }}>
                <p style={{ ...labelStyle, color: col.border, margin: "0 0 8px" }}>Avec {comp.nom}</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: detailParParcours.length > 0 ? 10 : 0 }}>
                  <span style={{ fontSize: 28, fontWeight: 500, color: col.text, fontFamily: "var(--font-dm-mono)", lineHeight: 1 }}>{coursesWith.length}</span>
                  <span style={{ fontSize: 11, color: col.border, fontFamily: "var(--font-geist)" }}>sortie{coursesWith.length > 1 ? "s" : ""} ensemble</span>
                </div>
                {detailParParcours.map((a) => a && (
                  <div key={a.parcours} style={{ fontSize: 11, color: col.border, fontFamily: "var(--font-geist)", marginTop: 6, paddingTop: 6, borderTop: `0.5px solid ${col.border}22` }}>
                    <span style={{ color: col.text, fontWeight: 500 }}>{a.parcours}</span>
                    <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                      <span style={{ fontFamily: "var(--font-dm-mono)", color: col.text }}>{secondesToDisplay(a.moySecondes)}</span>
                      <span style={{ color: col.border }}>·</span>
                      <span style={{ fontFamily: "var(--font-dm-mono)", color: col.text, opacity: 0.8 }}>{a.allure}</span>
                      <span style={{ color: col.border }}>·</span>
                      <span>{a.nb}×</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}