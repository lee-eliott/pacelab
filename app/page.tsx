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
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 12px rgba(245,166,35,0.6)" }} />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotGlow {
          0%, 100% { box-shadow: 0 0 6px rgba(245,166,35,0.4); }
          50% { box-shadow: 0 0 18px rgba(245,166,35,0.8); }
        }
      `}</style>

      {/* Header */}
      <header style={{
        padding: "16px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "0.5px solid var(--border)",
        background: "rgba(7,11,20,0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--accent)",
            animation: "dotGlow 2.5s ease-in-out infinite",
          }} />
          <span style={{ fontFamily: "var(--font-dm-mono)", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Pacelab
          </span>
        </div>
        <Link href="/login" style={{
          fontSize: 12,
          color: "var(--text-dim)",
          fontFamily: "var(--font-geist)",
          textDecoration: "none",
          padding: "6px 14px",
          border: "0.5px solid var(--border-2)",
          borderRadius: 6,
        }}>
          Se connecter
        </Link>
      </header>

      {/* Hero */}
      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 24px",
        textAlign: "center",
        animation: "fadeUp 0.7s ease forwards",
      }}>

        {/* Badge Strava */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          background: "rgba(216,90,48,0.07)",
          border: "0.5px solid rgba(216,90,48,0.22)",
          borderRadius: 24,
          padding: "5px 14px",
          marginBottom: 40,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--coral)">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
          <span style={{ fontSize: 11, color: "var(--coral)", fontFamily: "var(--font-geist)", letterSpacing: "0.06em", fontWeight: 500 }}>
            Intégration Strava
          </span>
        </div>

        {/* Titre */}
        <h1 style={{
          fontSize: "clamp(36px, 6vw, 62px)",
          fontWeight: 400,
          color: "var(--text-primary)",
          margin: "0 0 22px",
          fontFamily: "var(--font-geist)",
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
          maxWidth: 740,
        }}>
          Tes données de course,<br />
          <span style={{ color: "var(--accent)" }}>vraiment</span> analysées.
        </h1>

        {/* Sous-titre */}
        <p style={{
          fontSize: 16,
          color: "var(--text-dim)",
          margin: "0 0 52px",
          fontFamily: "var(--font-geist)",
          maxWidth: 480,
          lineHeight: 1.7,
        }}>
          Pacelab connecte tes activités Strava et les transforme en analyses personnelles — allure, progression, régularité, objectifs.
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/login" style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--accent)",
            color: "#fff",
            borderRadius: 9,
            padding: "13px 30px",
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
            fontFamily: "var(--font-geist)",
            boxShadow: "0 4px 24px rgba(245,166,35,0.4)",
          }}>
            Se connecter
          </Link>
          <Link href="/demo/mescourses" style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--surface)",
            color: "var(--text-muted)",
            border: "0.5px solid var(--border-2)",
            borderRadius: 9,
            padding: "13px 30px",
            fontSize: 14,
            textDecoration: "none",
            fontFamily: "var(--font-geist)",
          }}>
            Explorer sans compte →
          </Link>
        </div>

        {/* Feature cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          marginTop: 80,
          maxWidth: 780,
          width: "100%",
        }}>
          {[
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              ),
              title: "Évolution",
              desc: "Suis ta progression sur chaque parcours avec des graphiques clairs.",
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              ),
              title: "Objectifs",
              desc: "Définis des objectifs hebdo, mensuels ou annuels et suis-les en temps réel.",
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              ),
              title: "Régularité",
              desc: "Visualise tes semaines actives et maintiens ta streak de course.",
            },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{
              background: "var(--surface)",
              border: "0.5px solid var(--border)",
              borderRadius: 12,
              padding: "22px",
              textAlign: "left",
            }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "rgba(245,166,35,0.09)",
                border: "0.5px solid rgba(245,166,35,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
                color: "var(--accent)",
              }}>
                {icon}
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 7px", fontFamily: "var(--font-geist)" }}>
                {title}
              </p>
              <p style={{ fontSize: 12, color: "var(--text-dim)", margin: 0, fontFamily: "var(--font-geist)", lineHeight: 1.6 }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        padding: "20px 40px",
        borderTop: "0.5px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-geist)" }}>
          Fait avec ☕ par Eliott Lee
        </span>
      </footer>
    </div>
  );
}
