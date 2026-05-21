"use client";

import { useState, useEffect, useRef } from "react";

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

interface Props {
  objectifs: Objectif[];
  courses: { date_course: string; duree_secondes: number; parcours_distance_km: number | null }[];
  periode?: string;
}

function typeUnite(t: string) {
  return { duree: "min", distance: "km", sorties: "sorties" }[t] ?? "";
}

function periodeLabel(o: Objectif) {
  if (o.periode === "annuel") return `Annuel ${o.annee ?? ""}`;
  if (o.periode === "mensuel") return "Ce mois";
  if (o.periode === "hebdo") return "Cette semaine";
  if (o.date_debut && o.date_fin) {
    const debut = new Date(o.date_debut).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    const fin = new Date(o.date_fin).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    return `${debut} → ${fin}`;
  }
  return "";
}

function calcProgression(obj: Objectif, courses: Props["courses"]) {
  const now = new Date();
  let debut: Date;
  let fin: Date;

  if (obj.periode) {
    const annee = obj.annee ?? now.getFullYear();
    if (obj.periode === "annuel") {
      debut = new Date(`${annee}-01-01`);
      fin = new Date(`${annee}-12-31`);
    } else if (obj.periode === "mensuel") {
      debut = new Date(now.getFullYear(), now.getMonth(), 1);
      fin = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now);
      monday.setDate(diff);
      debut = monday;
      fin = new Date(monday);
      fin.setDate(fin.getDate() + 6);
    }
  } else {
    debut = new Date(obj.date_debut!);
    fin = new Date(obj.date_fin!);
  }

  const filtered = courses.filter((c) => {
    const d = new Date(c.date_course);
    return d >= debut && d <= fin;
  });

  let valeur = 0;
  if (obj.type === "duree") {
    valeur = filtered.reduce((s, c) => s + c.duree_secondes / 60, 0);
  } else if (obj.type === "distance") {
    valeur = filtered.reduce((s, c) => s + (c.parcours_distance_km ?? 0), 0);
  } else {
    valeur = filtered.length;
  }

  const pct = Math.min(Math.round((valeur / obj.valeur) * 100), 100);
  const atteint = pct >= 100;
  const termine = now > fin;
  const echoue = termine && !atteint;

  let diffLissee: number | null = null;
  if (!atteint && !echoue && now >= debut && now <= fin) {
    const totalMs = fin.getTime() - debut.getTime();
    const ecoulesMs = now.getTime() - debut.getTime();
    const ratioEcoule = ecoulesMs / totalMs;
    const objectifLisse = ratioEcoule * obj.valeur;
    const diff = valeur - objectifLisse;
    if (obj.type === "duree") diffLissee = Math.round(diff);
    else if (obj.type === "distance") diffLissee = Math.round(diff * 10) / 10;
    else diffLissee = Math.round(diff);
  }

  return {
    valeur: obj.type === "distance" ? Math.round(valeur * 10) / 10 : Math.round(valeur),
    pct,
    atteint,
    echoue,
    diffLissee,
  };
}

function filtrerObjectifs(objectifs: Objectif[], periode: string | undefined): Objectif[] {
  if (!periode || periode === "tout") return objectifs;
  if (periode === "7j" || periode === "30j") {
    return objectifs.filter((o) => o.periode === "hebdo" || o.periode === "mensuel");
  }
  if (periode.match(/^\d{4}$/)) {
    const annee = parseInt(periode);
    return objectifs.filter((o) => {
      if (o.periode === "annuel") return o.annee === annee;
      if (o.periode === "mensuel" || o.periode === "hebdo") return annee === new Date().getFullYear();
      if (!o.periode && o.date_debut && o.date_fin) {
        const debut = new Date(o.date_debut);
        const fin = new Date(o.date_fin);
        return debut.getFullYear() === annee || fin.getFullYear() === annee;
      }
      return false;
    });
  }
  return objectifs;
}

function formatDiff(diff: number, type: string) {
  const abs = Math.abs(diff);
  if (type === "distance") return `${abs.toFixed(1)} km`;
  if (type === "duree") {
    if (abs >= 60) {
      const h = Math.floor(abs / 60);
      const m = abs % 60;
      return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
    }
    return `${abs} min`;
  }
  return `${abs} sortie${abs > 1 ? "s" : ""}`;
}

const CIRCUMFERENCE = 2 * Math.PI * 44; // r=44

export default function ObjectifCarousel({ objectifs, courses, periode }: Props) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const objectifsFiltres = filtrerObjectifs(objectifs, periode);
  const currentSafe = current >= objectifsFiltres.length ? 0 : current;

  function startTimer(len: number) {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (len <= 1) return;
    timerRef.current = setTimeout(() => setCurrent((prev) => (prev + 1) % len), 7000);
  }

  function goTo(index: number) {
    setCurrent(index);
    startTimer(objectifsFiltres.length);
  }

  function prev() { goTo((currentSafe - 1 + objectifsFiltres.length) % objectifsFiltres.length); }
  function next() { goTo((currentSafe + 1) % objectifsFiltres.length); }

  useEffect(() => { setCurrent(0); }, [periode]);
  useEffect(() => {
    startTimer(objectifsFiltres.length);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [currentSafe, objectifsFiltres.length]);

  const lbl: React.CSSProperties = {
    fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.08em",
    textTransform: "uppercase", margin: 0, fontFamily: "var(--font-geist)", fontWeight: 500,
  };

  // Empty state
  if (objectifsFiltres.length === 0) {
    return (
      <div className="bento-hover" style={{
        background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 14,
        padding: "22px", display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 10, flexGrow: 1, minHeight: 160,
      }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 4px", fontFamily: "var(--font-geist)" }}>Crée ton premier objectif</p>
          <p style={{ fontSize: 11, color: "var(--text-dim)", margin: 0, fontFamily: "var(--font-geist)", opacity: 0.6 }}>Paramètres → Objectifs</p>
        </div>
      </div>
    );
  }

  const obj = objectifsFiltres[currentSafe];
  const prog = calcProgression(obj, courses);
  const color = prog.atteint ? "var(--green)" : prog.echoue ? "#444" : "var(--accent)";
  const isEnAvance = prog.diffLissee !== null && prog.diffLissee >= 0;

  const dashOffset = CIRCUMFERENCE * (1 - prog.pct / 100);

  return (
    <div className="bento-hover" style={{
      background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 14,
      padding: "18px 14px", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "space-between", flexGrow: 1, minHeight: 160,
      position: "relative",
    }}>
      {/* Label */}
      <p style={{ ...lbl, alignSelf: "flex-start", marginBottom: 2 }}>
        Objectif · {periodeLabel(obj)}
      </p>

      {/* Cercle de progression + navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, justifyContent: "center", width: "100%" }}>
        {/* Flèche prev */}
        {objectifsFiltres.length > 1 && (
          <button onClick={prev} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--text-dim)", display: "flex", alignItems: "center", transition: "color 150ms ease", flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--accent)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-dim)")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
        )}

        {/* Cercle SVG */}
        <div style={{ position: "relative", width: 100, height: 100, flexShrink: 0 }}>
          <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
            {/* Track */}
            <circle cx="50" cy="50" r="44" fill="none" stroke="var(--border-2)" strokeWidth="5" />
            {/* Progress */}
            <circle
              cx="50" cy="50" r="44" fill="none"
              stroke={color} strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}
            />
          </svg>
          {/* % centré */}
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 28, fontWeight: 600, color, fontFamily: "var(--font-dm-mono)", letterSpacing: "-0.04em", lineHeight: 1 }}>
              {prog.pct}
            </span>
            <span style={{ fontSize: 9, color: "var(--text-dim)", fontFamily: "var(--font-geist)", marginTop: 1 }}>%</span>
          </div>
        </div>

        {/* Flèche next */}
        {objectifsFiltres.length > 1 && (
          <button onClick={next} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--text-dim)", display: "flex", alignItems: "center", transition: "color 150ms ease", flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--accent)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-dim)")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        )}
      </div>

      {/* Nom + sous-infos */}
      <div style={{ textAlign: "center", width: "100%" }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 3px", fontFamily: "var(--font-geist)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {obj.titre}
        </p>
        <p style={{ fontSize: 11, color: "var(--text-dim)", margin: 0, fontFamily: "var(--font-dm-mono)" }}>
          {prog.valeur} / {obj.valeur} {typeUnite(obj.type)}
        </p>

        {/* Indicateur lissé */}
        {prog.diffLissee !== null && (
          <p style={{ fontSize: 10, color: isEnAvance ? "var(--green)" : "#ef4444", margin: "4px 0 0", fontFamily: "var(--font-geist)" }}>
            {isEnAvance ? "↑" : "↓"} {formatDiff(prog.diffLissee!, obj.type)} {isEnAvance ? "d'avance" : "de retard"}
          </p>
        )}

        {/* Badges atteint / échoué */}
        {prog.atteint && (
          <span style={{ display: "inline-block", marginTop: 4, fontSize: 10, background: "#0f2a1e", border: "0.5px solid #1a4a30", borderRadius: 4, padding: "1px 7px", color: "var(--green)", fontFamily: "var(--font-geist)" }}>
            Atteint
          </span>
        )}
        {prog.echoue && (
          <span style={{ display: "inline-block", marginTop: 4, fontSize: 10, background: "#222", border: "0.5px solid #333", borderRadius: 4, padding: "1px 7px", color: "#555", fontFamily: "var(--font-geist)" }}>
            Échoué
          </span>
        )}
      </div>

      {/* Pastilles */}
      {objectifsFiltres.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 10 }}>
          {objectifsFiltres.map((_, i) => (
            <button key={i} onClick={() => goTo(i)} style={{
              width: i === currentSafe ? 16 : 6, height: 6, borderRadius: 3,
              background: i === currentSafe ? "var(--accent)" : "var(--border-2)",
              border: "none", cursor: "pointer", padding: 0, transition: "all 0.25s",
            }} />
          ))}
        </div>
      )}
    </div>
  );
}
