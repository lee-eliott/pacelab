"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { secondesToDisplay } from "@/lib/types";
import type { CourseEnrichie } from "@/lib/types";
import { useRef } from "react";

interface CompagnonColor {
  bg: string;
  border: string;
  text: string;
}

interface Props {
  courses: CourseEnrichie[];
  pr: number | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  selectedId: string | null;
  colorMap: Record<string, CompagnonColor>;
  compagnonColors: CompagnonColor[];
}

// Retourne la couleur du compagnon le plus présent sur cette course
// (parmi les compagnons de la course, celui qui a le plus de courses globalement)
function getDotColor(
  course: CourseEnrichie,
  colorMap: Record<string, CompagnonColor>,
  // compagnon dominant = celui dont le nom est en premier dans colorMap (ordre d'attribution)
): string {
  if (!course.compagnons || course.compagnons.length === 0) return "#404465";

  // On prend le premier compagnon trouvé dans le colorMap (ordre stable)
  // qui est présent dans cette course
  const keys = Object.keys(colorMap);
  for (const nom of keys) {
    if (course.compagnons.includes(nom)) {
      return colorMap[nom].text;
    }
  }
  return "#404465";
}

export default function EvolutionChart({
  courses,
  pr,
  hoveredId,
  onHover,
  onSelect,
  selectedId,
  colorMap,
  compagnonColors,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const data = [...courses]
    .reverse()
    .map((c) => ({
      id: c.id,
      date: new Date(c.date_course).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      duree: c.duree_secondes,
      isPR: c.duree_secondes === pr,
      compagnons: c.compagnons ?? [],
    }));

  if (data.length === 0) {
    return (
      <div style={{ height: 160, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <p style={{ fontSize: 13, color: "var(--text-dim)", fontFamily: "var(--font-geist)", margin: 0 }}>
          Pas encore de données sur ce parcours
        </p>
        <p style={{ fontSize: 11, color: "var(--text-dim)", opacity: 0.5, fontFamily: "var(--font-geist)", margin: 0 }}>
          Ajoute des sorties pour voir ton évolution
        </p>
      </div>
    );
  }

  const vals = data.map((d) => d.duree);
  const minVal = Math.min(...vals) - 30;
  const maxVal = Math.max(...vals) + 30;
  const activeId = hoveredId || selectedId;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const chartLeft = 28;
    const chartRight = rect.width - 8;
    const chartWidth = chartRight - chartLeft;
    const relX = x - chartLeft;
    if (relX < 0 || relX > chartWidth) { onHover(null); return; }
    const idx = Math.round((relX / chartWidth) * (data.length - 1));
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    onHover(data[clamped].id);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const chartLeft = 28;
    const chartRight = rect.width - 8;
    const chartWidth = chartRight - chartLeft;
    const relX = x - chartLeft;
    if (relX < 0 || relX > chartWidth) return;
    const idx = Math.round((relX / chartWidth) * (data.length - 1));
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    const id = data[clamped].id;
    onSelect(selectedId === id ? null : id);
  };

  const activePoint = data.find((d) => d.id === activeId);

  // Couleur du tooltip selon les compagnons du point actif
  const activePointColor = activePoint && activePoint.compagnons.length > 0
    ? getDotColor({ compagnons: activePoint.compagnons } as CourseEnrichie, colorMap, )
    : "var(--accent)";

  return (
    <div style={{ height: 160, marginBottom: 20, position: "relative" }}>
      {/* Tooltip */}
      {activePoint && (
        <div style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          background: "var(--surface-2)", border: "0.5px solid var(--border-2)", borderRadius: 6,
          padding: "5px 10px", pointerEvents: "none", zIndex: 10,
          display: "flex", gap: 8, alignItems: "baseline",
        }}>
          <span style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-geist)" }}>{activePoint.date}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", fontFamily: "var(--font-dm-mono)" }}>
            {secondesToDisplay(activePoint.duree)}
          </span>
          {activePoint.isPR && <span style={{ fontSize: 10, color: "var(--coral)", fontFamily: "var(--font-geist)" }}>PR</span>}
          {activePoint.compagnons.length > 0 && activePoint.compagnons.map((nom) => {
            const col = colorMap[nom];
            if (!col) return null;
            return <span key={nom} style={{ fontSize: 10, color: col.text, fontFamily: "var(--font-geist)" }}>{nom}</span>;
          })}
        </div>
      )}

      {/* Zone de capture hover */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => onHover(null)}
        onClick={handleClick}
        style={{ position: "absolute", inset: 0, zIndex: 5, cursor: "crosshair" }}
      />

      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#5a5e80", fontFamily: "var(--font-geist)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[minVal, maxVal]}
            tickFormatter={(v) => `${Math.floor(v / 60)}m`}
            tick={{ fontSize: 10, fill: "#5a5e80", fontFamily: "var(--font-geist)" }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          {pr && (
            <ReferenceLine
              y={pr}
              stroke="#e05a2b"
              strokeDasharray="4 3"
              strokeWidth={1}
              label={{ value: "PR", position: "insideTopLeft", fontSize: 10, fill: "#e05a2b", fontFamily: "var(--font-geist)" }}
            />
          )}
          <Line
            type="monotone"
            dataKey="duree"
            stroke="#f5a623"
            strokeWidth={1.5}
            dot={(props) => {
              const { cx, cy, payload } = props;
              const isActive = activeId === payload.id;
              const isPR = payload.isPR;
              const isSelected = selectedId === payload.id;

              // Couleur du point selon le compagnon dominant
              const course = courses.find((c) => c.id === payload.id);
              const hasCompagnon = course?.compagnons && course.compagnons.length > 0;
              const dotColor = hasCompagnon
                ? getDotColor(course!, colorMap)
                : isPR ? "#e05a2b" : "#404465";

              return (
                <circle
                  key={`dot-${payload.id}`}
                  cx={cx}
                  cy={cy}
                  r={isActive ? 6 : isPR ? 5 : hasCompagnon ? 4 : 3}
                  fill={isActive ? "#fff" : dotColor}
                  stroke={isActive || isSelected ? "#f5a623" : isPR ? "#0e0e0e" : "none"}
                  strokeWidth={isActive || isSelected ? 2 : isPR ? 2 : 0}
                />
              );
            }}
            activeDot={false}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}