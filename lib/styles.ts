import type { CSSProperties } from "react";

/** Label uppercase — utilisé dans mescourses, analyse, recompenses */
export const lbl: CSSProperties = {
  fontSize: 10,
  color: "var(--text-muted)",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  fontFamily: "var(--font-geist)",
  margin: "0 0 6px",
  display: "block",
};

/** Input dark — utilisé dans saisir, parametres */
export const inputStyle: CSSProperties = {
  background: "var(--surface-2)",
  border: "0.5px solid var(--border-2)",
  borderRadius: 6,
  color: "var(--text-primary)",
  padding: "8px 12px",
  fontSize: 13,
  outline: "none",
  width: "100%",
  fontFamily: "var(--font-geist)",
};

/** Label de champ de formulaire — utilisé dans saisir, parametres */
export const labelStyle: CSSProperties = {
  fontSize: 10,
  color: "var(--text-dim)",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  display: "block",
  marginBottom: 6,
  fontFamily: "var(--font-geist)",
};
