"use client";
import { useCountUp } from "@/hooks/useCountUp";

interface KpiCardProps {
  label: string;
  value: string;
  rawValue?: number;
  format?: (n: number) => string;
  decimals?: number;
  sub?: string;
  subColor?: "coral" | "green" | "muted";
  accent?: boolean;
  runningMetric?: boolean;
}

export default function KpiCard({
  label,
  value,
  rawValue,
  format,
  decimals = 0,
  sub,
  subColor = "muted",
  accent = false,
  runningMetric = false,
}: KpiCardProps) {
  const animated = useCountUp(rawValue ?? 0, { decimals });
  const displayValue = rawValue !== undefined && format ? format(animated) : value;

  const subColors = {
    coral: "var(--coral)",
    green: "var(--green)",
    muted: "var(--text-dim)",
  };

  const labelColor = runningMetric ? "rgba(245,166,35,0.65)" : "var(--text-dim)";

  return (
    <div
      className="bento-hover"
      style={{
        background: accent ? "var(--coral-dim)" : "var(--surface)",
        border: `0.5px solid ${accent ? "var(--coral)" : "var(--border)"}`,
        borderRadius: 14,
        padding: "22px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative orb */}
      <div style={{
        position: "absolute", bottom: -20, right: -20,
        width: 100, height: 100, borderRadius: "50%",
        background: accent ? "rgba(252,76,2,0.04)" : "rgba(245,166,35,0.03)",
        border: `0.5px solid ${accent ? "rgba(252,76,2,0.06)" : "rgba(245,166,35,0.05)"}`,
        pointerEvents: "none",
      }} />

      <p style={{
        fontSize: 9,
        color: labelColor,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        margin: "0 0 8px",
        fontFamily: "var(--font-geist)",
        fontWeight: 500,
      }}>
        {label}
      </p>
      <p style={{
        fontSize: 36,
        fontWeight: 600,
        color: accent ? "var(--coral)" : runningMetric ? "var(--accent)" : "var(--text-primary)",
        margin: 0,
        lineHeight: 1,
        fontFamily: "var(--font-dm-mono)",
        letterSpacing: "-0.03em",
      }}>
        {displayValue}
      </p>
      {sub && (
        <p style={{
          fontSize: 10,
          color: subColors[subColor],
          margin: "6px 0 0",
          fontFamily: "var(--font-geist)",
        }}>
          {sub}
        </p>
      )}
    </div>
  );
}
