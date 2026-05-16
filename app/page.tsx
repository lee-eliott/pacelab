"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function check() {
      const { createClient } = await import("@/lib/supabase");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.replace("/mescourses");
      } else {
        setChecking(false);
      }
    }
    check();
  }, [router]);

  if (checking) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0e0e0e" }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--coral)" }} />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0e0e0e", display: "flex", flexDirection: "column" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid #1a1a1a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--coral)" }} />
          <span style={{ fontFamily: "var(--font-dm-mono)", fontSize: 15, fontWeight: 500, color: "#fff", letterSpacing: "-0.02em" }}>Pacelab</span>
        </div>
        <Link href="/login" style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-geist)", textDecoration: "none", padding: "5px 12px", border: "0.5px solid #2a2a2a", borderRadius: 6 }}>
          Se connecter
        </Link>
      </div>

      {/* Hero */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", textAlign: "center", animation: "fadeUp 0.6s ease forwards" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(252,76,2,0.08)", border: "0.5px solid rgba(252,76,2,0.25)", borderRadius: 20, padding: "4px 14px", marginBottom: 32 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
          <span style={{ fontSize: 11, color: "#FC4C02", fontFamily: "var(--font-geist)", letterSpacing: "0.05em" }}>Intégration Strava</span>
        </div>

        <h1 style={{ fontSize: 48, fontWeight: 400, color: "#fff", margin: "0 0 16px", fontFamily: "var(--font-geist)", letterSpacing: "-0.02em", lineHeight: 1.15, maxWidth: 600 }}>
          Tes données de course,<br />
          <span style={{ color: "var(--coral)" }}>vraiment</span> analysées.
        </h1>

        <p style={{ fontSize: 16, color: "var(--text-dim)", margin: "0 0 48px", fontFamily: "var(--font-geist)", maxWidth: 460, lineHeight: 1.6 }}>
          Pacelab connecte tes activités Strava et les transforme en analyses personnelles — allure, progression, régularité, objectifs.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/login" style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--coral)", color: "#fff", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 600, textDecoration: "none", fontFamily: "var(--font-geist)" }}>
            Se connecter
          </Link>
          <Link href="/demo/mescourses" style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", color: "var(--text-muted)", border: "0.5px solid #2a2a2a", borderRadius: 8, padding: "12px 24px", fontSize: 14, textDecoration: "none", fontFamily: "var(--font-geist)" }}>
            Explorer sans compte →
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 80, maxWidth: 720, width: "100%" }}>
          {[
            { icon: "📈", title: "Évolution", desc: "Suis ta progression sur chaque parcours avec des graphiques clairs." },
            { icon: "🎯", title: "Objectifs", desc: "Définis des objectifs hebdo, mensuels ou annuels et suis-les en temps réel." },
            { icon: "🔥", title: "Régularité", desc: "Visualise tes semaines actives et maintiens ta streak de course." },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "20px", textAlign: "left" }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{icon}</div>
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", margin: "0 0 6px", fontFamily: "var(--font-geist)" }}>{title}</p>
              <p style={{ fontSize: 12, color: "var(--text-dim)", margin: 0, fontFamily: "var(--font-geist)", lineHeight: 1.5 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "20px 32px", borderTop: "0.5px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-geist)" }}>Fait avec ☕ par Eliott Lee</span>
      </div>
    </div>
  );
}