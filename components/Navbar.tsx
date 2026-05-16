"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function Navbar({ isLoggedIn, isDemo = false }: { isLoggedIn: boolean; isDemo?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [demoToast, setDemoToast] = useState(false);

  async function handleLogout() {
    if (isDemo) {
      setDemoToast(true);
      setTimeout(() => setDemoToast(false), 3000);
      return;
    }
    // Invalide les tokens Strava mais conserve athlete_data et stats_data pour le rechargement
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("strava_tokens").update({
        access_token: "",
        refresh_token: "",
        expires_at: 0,
      }).eq("user_id", user.id);
    }
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const links = [
    { href: isDemo ? "/demo/mescourses" : "/mescourses", label: "Mes Courses" },
    { href: isDemo ? "/demo/analyse" : "/analyse", label: "Analyse" },
    { href: isDemo ? "/demo/recompenses" : "/recompenses", label: "Badges" },
    { href: isDemo ? "/demo/parametres" : "/parametres", label: "Paramètres" },
  ];

  return (
    <>
    {isDemo && (
      <div style={{ background: "rgba(252,76,2,0.08)", borderBottom: "0.5px solid rgba(252,76,2,0.2)", padding: "6px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: "#FC4C02", fontFamily: "var(--font-geist)", letterSpacing: ".04em" }}>
          👁 Mode démonstration — compte fictif d'Alex Martin
        </span>
        <a href="/login" style={{ fontSize: 11, color: "#FC4C02", fontFamily: "var(--font-geist)", textDecoration: "none", border: "0.5px solid rgba(252,76,2,0.4)", borderRadius: 5, padding: "2px 10px" }}>
          Créer mon compte →
        </a>
      </div>
    )}
    {demoToast && (
      <div style={{ position: "fixed", bottom: 24, right: 24, background: "#1a1a1a", border: "0.5px solid rgba(252,76,2,0.4)", borderRadius: 8, padding: "12px 18px", zIndex: 9999, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 16 }}>🔒</span>
        <span style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-geist)" }}>Déconnexion impossible en mode démonstration</span>
      </div>
    )}
    <nav style={{ background: "#111", borderBottom: "0.5px solid #222", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--coral)" }} />
        <span style={{ fontFamily: "var(--font-dm-mono)", fontSize: 15, fontWeight: 500, color: "#fff", letterSpacing: "-0.02em" }}>Pacelab</span>
      </Link>
      <div style={{ display: "flex", gap: 4 }}>
        {links.map((link) => (
          <Link key={link.href} href={link.href} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, color: pathname === link.href ? "var(--text-primary)" : "var(--text-dim)", background: pathname === link.href ? "var(--surface-2)" : "transparent", textDecoration: "none", transition: "all 0.15s" }}>
            {link.label}
          </Link>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {isLoggedIn ? (
          <button onClick={handleLogout} style={{ background: "transparent", border: "0.5px solid #2a2a2a", borderRadius: 6, color: "var(--text-dim)", fontSize: 12, padding: "5px 12px", cursor: "pointer", fontFamily: "var(--font-geist)" }}>
            Déconnexion
          </button>
        ) : (
          <Link href="/login" style={{ background: "var(--coral)", color: "#fff", borderRadius: 6, padding: "5px 14px", fontSize: 12, fontWeight: 500, textDecoration: "none", fontFamily: "var(--font-geist)" }}>
            Se connecter
          </Link>
        )}
      </div>
    </nav>
    </>
  );
}