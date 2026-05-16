"use client";

const pulseStyle = `
  @keyframes streak-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }
`;

function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface Props {
  courses: { date_course: string }[];
}

export default function StreakCalendar({ courses }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const courseDates = new Set(courses.map((c) => c.date_course));

  function weekHasCourse(monday: Date): boolean {
    for (let i = 0; i < 7; i++) {
      if (courseDates.has(isoDate(addDays(monday, i)))) return true;
    }
    return false;
  }

  const currentMonday = getMondayOf(today);

  const allDates = courses
    .map((c) => new Date(c.date_course))
    .sort((a, b) => a.getTime() - b.getTime());

  let streakActuelle = 0;
  let bestStreak = 0;

  if (allDates.length > 0) {
    let w = new Date(currentMonday);
    const currentWeekHasCourse = weekHasCourse(w);
    const todayIsMonday = today.getDay() === 1;
    if (!currentWeekHasCourse && !todayIsMonday) w = addDays(w, -7);

    const firstMonday = getMondayOf(allDates[0]);
    while (w >= firstMonday) {
      if (weekHasCourse(w)) { streakActuelle++; w = addDays(w, -7); }
      else break;
    }

    let tempStreak = 0;
    let cursor = new Date(firstMonday);
    while (cursor <= currentMonday) {
      if (weekHasCourse(cursor)) { tempStreak++; bestStreak = Math.max(bestStreak, tempStreak); }
      else tempStreak = 0;
      cursor = addDays(cursor, 7);
    }
  }

  const NB_SEMAINES = 20;
  const semaines: {
    monday: Date;
    hasCourse: boolean;
    isCurrentWeek: boolean;
    isFuture: boolean;
    weekNum: number;
    year: number;
    isNewYear: boolean;
  }[] = [];

  // Année ISO = année à laquelle appartient la semaine ISO
  // (S1 peut commencer en décembre de l'année précédente, donc on utilise thursday)
  function getISOYear(date: Date): number {
    const d = new Date(date);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); // jeudi de la semaine
    return d.getFullYear();
  }

  let lastISOYear = -1;
  for (let i = NB_SEMAINES - 1; i >= 0; i--) {
    const monday = addDays(currentMonday, -i * 7);
    const wn = getISOWeek(monday);
    const isoYr = getISOYear(monday);
    const isNewYear = lastISOYear !== -1 && isoYr !== lastISOYear;
    lastISOYear = isoYr;
    semaines.push({
      monday,
      hasCourse: weekHasCourse(monday),
      isCurrentWeek: isoDate(monday) === isoDate(currentMonday),
      isFuture: monday > today,
      weekNum: wn,
      year: isoYr,
      isNewYear,
    });
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.05em",
    textTransform: "uppercase", fontFamily: "var(--font-geist)",
  };

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <style>{pulseStyle}</style>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ ...labelStyle, margin: "0 0 4px" }}>Régularité</p>
          <p style={{ fontSize: 11, color: "var(--text-dim)", margin: 0, fontFamily: "var(--font-geist)" }}>
            20 dernières semaines · lun → dim
          </p>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          <div style={{ textAlign: "right" }}>
            <p style={{ ...labelStyle, margin: "0 0 2px" }}>Streak actuelle</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, justifyContent: "flex-end" }}>
              <span style={{ fontSize: 28, fontWeight: 500, color: streakActuelle > 0 ? "var(--coral)" : "var(--text-dim)", fontFamily: "var(--font-dm-mono)", lineHeight: 1 }}>{streakActuelle}</span>
              <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-geist)" }}>sem.</span>
              {streakActuelle >= 4 && <span style={{ fontSize: 14 }}>🔥</span>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ ...labelStyle, margin: "0 0 2px" }}>Meilleure streak</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, justifyContent: "flex-end" }}>
              <span style={{ fontSize: 28, fontWeight: 500, color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)", lineHeight: 1 }}>{bestStreak}</span>
              <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-geist)" }}>sem.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grille en flex pour pouvoir insérer le marqueur d'année entre les cases */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
        {semaines.map((s, i) => {
          const isActive = s.hasCourse && !s.isFuture;
          const shouldPulse = s.isCurrentWeek && !isActive && !s.isFuture;

          let bg = "#1a1a1a";
          let border = "0.5px solid #222";
          let textColor = "#333";

          if (isActive) {
            bg = "var(--coral)";
            border = "0.5px solid #b04020";
            textColor = "rgba(255,255,255,0.75)";
          } else if (s.isCurrentWeek) {
            bg = "transparent";
            border = "0.5px solid var(--coral)";
            textColor = "var(--coral)";
          }

          const outline = s.isCurrentWeek ? "1.5px solid rgba(255,255,255,0.22)" : "none";
          const tooltip = `S${s.weekNum} ${s.year} · ${s.monday.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`;

          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
              {/* Marqueur de nouvelle année — affiché AVANT la case S1 */}
              {s.isNewYear && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 3, width: "100%" }}>
                  <span style={{ fontSize: 8, color: "#666", fontFamily: "var(--font-dm-mono)", whiteSpace: "nowrap", letterSpacing: 0 }}>
                    {s.year}
                  </span>
                  <div style={{ width: "100%", height: 1, background: "linear-gradient(to bottom, #444, transparent)", marginTop: 1 }} />
                </div>
              )}
              {/* Espace réservé pour aligner les cases sans marqueur */}
              {!s.isNewYear && i > 0 && (
                <div style={{ height: 16, width: "100%" }} />
              )}

              <div
                title={tooltip}
                style={{
                  width: "100%",
                  height: 36,
                  borderRadius: 5,
                  background: bg,
                  border,
                  outline,
                  outlineOffset: "2px",
                  opacity: s.isFuture ? 0.2 : 1,
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "default",
                  animation: shouldPulse ? "streak-pulse 1.8s ease-in-out infinite" : "none",
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 9, fontWeight: 500, color: textColor, fontFamily: "var(--font-dm-mono)", lineHeight: 1 }}>
                  S{s.weekNum}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Légende */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: "var(--coral)" }} />
          <span style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-geist)" }}>Semaine active</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: "transparent", border: "0.5px solid var(--coral)", outline: "1.5px solid rgba(255,255,255,0.22)", outlineOffset: "1px" }} />
          <span style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-geist)" }}>Semaine en cours</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: "#1a1a1a", border: "0.5px solid #222" }} />
          <span style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-geist)" }}>Sans course</span>
        </div>
      </div>
    </div>
  );
}