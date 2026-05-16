interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  subColor?: "coral" | "green" | "muted";
  accent?: boolean;
}

export default function KpiCard({
  label,
  value,
  sub,
  subColor = "muted",
  accent = false,
}: KpiCardProps) {
  const subColors = {
    coral: "var(--coral)",
    green: "var(--green)",
    muted: "var(--text-dim)",
  };

  return (
    <div
      style={{
        background: accent ? "var(--coral-dim)" : "var(--surface)",
        border: `0.5px solid ${accent ? "var(--coral)" : "var(--border)"}`,
        borderRadius: 10,
        padding: "14px 16px",
      }}
    >
      <p
        style={{
          fontSize: 10,
          color: "var(--text-dim)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          margin: "0 0 6px",
          fontFamily: "var(--font-geist)",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 22,
          fontWeight: 500,
          color: accent ? "var(--coral)" : "var(--text-primary)",
          margin: 0,
          lineHeight: 1,
          fontFamily: "var(--font-dm-mono)",
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          style={{
            fontSize: 10,
            color: subColors[subColor],
            margin: "4px 0 0",
            fontFamily: "var(--font-geist)",
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}