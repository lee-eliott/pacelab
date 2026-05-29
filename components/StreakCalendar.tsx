"use client";

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
    if (!currentWeekHasCourse) w = addDays(w, -7);

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
    <div className="card bento-hover" style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ ...labelStyle, margin: "0 0 4px" }}>Régularité</p>
          <p style={{ fontSize: 11, color: "var(--text-dim)", margin: 0, fontFamily: "var(--font-geist)" }}>
            20 dernières semaines · lun → dim
          </p>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          <div style={{ textAlign: "right" }}>
            <p style={{ ...labelStyle, margin: "0 0 2px" }}>Streak actuelle</p>
            <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end", height: 28, overflow: "visible" }}>
              {streakActuelle >= 4 && (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="var(--coral)" stroke="none" aria-label="streak active" style={{ flexShrink: 0, marginTop: 8, animation: "flame-flicker 1.2s ease-in-out infinite", filter: "drop-shadow(0 0 10px rgba(252,76,2,0.9))" }}>
                  <path d="M12 2C9.5 5.5 8 8 8 11a4 4 0 0 0 8 0c0-1.5-.5-3-2-5 0 2-1 3.5-2 4.5C11 9.5 12 7 12 2z" />
                </svg>
              )}
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: 28, fontWeight: 500, color: streakActuelle > 0 ? "var(--coral)" : "var(--text-dim)", fontFamily: "var(--font-dm-mono)", lineHeight: 1 }}>{streakActuelle}</span>
                <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-geist)" }}>sem.</span>
              </div>
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

          let bg = "var(--surface-2)";
          let border = "0.5px solid var(--border)";
          let textColor = "var(--text-dim)";

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
                  <span style={{ fontSize: 8, color: "var(--text-dim)", fontFamily: "var(--font-dm-mono)", whiteSpace: "nowrap", letterSpacing: 0 }}>
                    {s.year}
                  </span>
                  <div style={{ width: "100%", height: 1, background: "linear-gradient(to bottom, var(--border), transparent)", marginTop: 1 }} />
                </div>
              )}
              {/* Espace réservé pour aligner les cases sans marqueur */}
              {!s.isNewYear && i > 0 && (
                <div style={{ height: 16, width: "100%" }} />
              )}

              <div
                title={tooltip}
                aria-label={tooltip}
                role="img"
                className="week-cell"
                style={{
                  width: "100%",
                  height: 36,
                  borderRadius: 5,
                  background: bg,
                  border,
                  outline,
                  outlineOffset: "2px",
                  opacity: s.isFuture ? 0.2 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  animation: shouldPulse ? "streak-pulse 1.8s ease-in-out infinite" : "none",
                  flexShrink: 0,
                  position: "relative",
                }}
              >
                <span style={{ fontSize: 9, fontWeight: 500, color: textColor, fontFamily: "var(--font-dm-mono)", lineHeight: 1 }}>
                  S{s.weekNum}
                </span>
                {s.isCurrentWeek && (
                  <span style={{ position: "absolute", top: 3, right: 3, width: 5, height: 5, borderRadius: "50%", background: "var(--coral)", animation: "ping 1.5s ease-out infinite" }} />
                )}
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
          <div style={{ width: 12, height: 12, borderRadius: 3, background: "var(--surface-2)", border: "0.5px solid var(--border)" }} />
          <span style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-geist)" }}>Sans course</span>
        </div>
      </div>
    </div>
  );
}