"use client";
import Navbar from "@/components/Navbar";

export default function DemoParamsPage() {
  return (
    <div style={{ minHeight: "100vh" }}>
      <Navbar isLoggedIn={true} isDemo={true} />
      <main style={{ padding: "24px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: "0.04em", textTransform: "uppercase", margin: "0 0 4px" }}>Compte</p>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: "#fff", margin: 0 }}>Paramètres</h1>
        </div>
        <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "32px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🔒</div>
          <p style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)", margin: "0 0 10px", fontFamily: "var(--font-geist)" }}>
            Fonctionnalité réservée aux membres
          </p>
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 24px", fontFamily: "var(--font-geist)", lineHeight: 1.6, maxWidth: 380, marginLeft: "auto", marginRight: "auto" }}>
            Les paramètres te permettent de gérer tes parcours, compagnons de course et objectifs personnalisés.
          </p>
          <a href="/login" style={{ background: "var(--coral)", color: "#fff", borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 500, textDecoration: "none", fontFamily: "var(--font-geist)" }}>
            Créer mon compte
          </a>
        </div>
      </main>
    </div>
  );
}