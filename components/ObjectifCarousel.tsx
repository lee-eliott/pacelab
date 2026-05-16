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

  // Calcul de l'objectif lissé
  let diffLissee: number | null = null;
  if (!atteint && !echoue && now >= debut && now <= fin) {
    const totalMs = fin.getTime() - debut.getTime();
    const ecoulesMs = now.getTime() - debut.getTime();
    const ratioEcoule = ecoulesMs / totalMs;
    const objectifLisse = ratioEcoule * obj.valeur;
    const diff = valeur - objectifLisse;

    // Arrondi selon le type
    if (obj.type === "duree") {
      diffLissee = Math.round(diff); // en minutes
    } else if (obj.type === "distance") {
      diffLissee = Math.round(diff * 10) / 10; // en km avec 1 décimale
    } else {
      diffLissee = Math.round(diff); // en nombre de sorties
    }
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
      if (o.periode === "mensuel" || o.periode === "hebdo") {
        return annee === new Date().getFullYear();
      }
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

export default function ObjectifCarousel({ objectifs, courses, periode }: Props) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const objectifsFiltres = filtrerObjectifs(objectifs, periode);
  const currentSafe = current >= objectifsFiltres.length ? 0 : current;

  function startTimer(len: number) {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (len <= 1) return;
    timerRef.current = setTimeout(() => {
      setCurrent((prev) => (prev + 1) % len);
    }, 7000);
  }

  function goTo(index: number) {
    setCurrent(index);
    startTimer(objectifsFiltres.length);
  }

  useEffect(() => {
    setCurrent(0);
  }, [periode]);

  useEffect(() => {
    startTimer(objectifsFiltres.length);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [currentSafe, objectifsFiltres.length]);

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    color: "var(--text-dim)",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    margin: "0 0 6px",
    fontFamily: "var(--font-geist)",
  };

  if (objectifsFiltres.length === 0) {
    return (
      <div style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border)",
        borderRadius: 10,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        minHeight: 90,
      }}>
        <p style={labelStyle}>Objectifs</p>
        <p style={{ fontSize: 13, color: "var(--text-dim)", margin: 0, fontFamily: "var(--font-geist)" }}>
          Aucun objectif sur cette période
        </p>
        <p style={{ fontSize: 11, color: "var(--text-dim)", margin: "4px 0 0", fontFamily: "var(--font-geist)", opacity: 0.6 }}>
          Crée des objectifs dans Paramètres
        </p>
      </div>
    );
  }

  const obj = objectifsFiltres[currentSafe];
  const prog = calcProgression(obj, courses);
  const color = prog.atteint ? "var(--green)" : prog.echoue ? "#555" : "var(--coral)";

  const isEnAvance = prog.diffLissee !== null && prog.diffLissee >= 0;
  const isEnRetard = prog.diffLissee !== null && prog.diffLissee < 0;

  // Formate la valeur de l'écart selon le type
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

  return (
    <div style={{
      background: "var(--surface)",
      border: "0.5px solid var(--border)",
      borderRadius: 10,
      padding: "14px 16px",
      minHeight: 90,
      display: "flex",
      flexDirection: "column",
    }}>
      <p style={labelStyle}>Objectif · {periodeLabel(obj)}</p>

      <p style={{
        fontSize: 12,
        color: "var(--text-muted)",
        margin: "0 0 8px",
        fontFamily: "var(--font-geist)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>
        {obj.titre}
      </p>

      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 22, fontWeight: 500, color, fontFamily: "var(--font-dm-mono)", lineHeight: 1 }}>
          {prog.pct}%
        </span>
        <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-geist)" }}>
          {prog.valeur} / {obj.valeur} {typeUnite(obj.type)}
        </span>
        {prog.atteint && (
          <span style={{ fontSize: 10, background: "#0f2a1e", border: "0.5px solid #1a4a30", borderRadius: 4, padding: "1px 5px", color: "var(--green)", fontFamily: "var(--font-geist)", marginLeft: "auto" }}>
            ✓
          </span>
        )}
        {prog.echoue && (
          <span style={{ fontSize: 10, background: "#222", border: "0.5px solid #333", borderRadius: 4, padding: "1px 5px", color: "#555", fontFamily: "var(--font-geist)", marginLeft: "auto" }}>
            Échoué
          </span>
        )}
      </div>

      {/* Barre de progression */}
      <div style={{ height: 3, background: "#222", borderRadius: 2 }}>
        <div style={{
          height: 3,
          background: color,
          borderRadius: 2,
          width: `${prog.pct}%`,
          transition: "width 0.4s",
        }} />
      </div>

      {/* Indicateur lissé */}
      {prog.diffLissee !== null && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          marginTop: 8,
        }}>
          <span style={{
            fontSize: 13,
            color: isEnAvance ? "var(--green)" : "#ef4444",
            fontFamily: "var(--font-geist)",
          }}>
            {isEnAvance ? "↑" : "↓"}
          </span>
          <span style={{
            fontSize: 11,
            fontWeight: 500,
            color: isEnAvance ? "var(--green)" : "#ef4444",
            fontFamily: "var(--font-dm-mono)",
          }}>
            {formatDiff(prog.diffLissee!, obj.type)}
          </span>
          <span style={{
            fontSize: 10,
            color: "var(--text-dim)",
            fontFamily: "var(--font-geist)",
          }}>
            {isEnAvance ? "d'avance à date" : "de retard à date"}
          </span>
        </div>
      )}

      {/* Pastilles navigation */}
      {objectifsFiltres.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: "auto", paddingTop: 8 }}>
          {objectifsFiltres.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              style={{
                width: i === currentSafe ? 16 : 6,
                height: 6,
                borderRadius: 3,
                background: i === currentSafe ? "var(--coral)" : "#333",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.25s",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}