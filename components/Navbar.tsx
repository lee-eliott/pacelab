"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

function IconActivity() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}

function IconAward() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  );
}

function IconSliders() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

export default function Navbar({ isLoggedIn, isDemo = false }: { isLoggedIn: boolean; isDemo?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [demoToast, setDemoToast] = useState(false);
  const [badgeDot, setBadgeDot] = useState(false);

  useEffect(() => {
    const check = () => setBadgeDot(localStorage.getItem("pacelab_badge_dot") === "true");
    check();
    window.addEventListener("storage", check);
    window.addEventListener("pacelab-badge-update", check);
    return () => {
      window.removeEventListener("storage", check);
      window.removeEventListener("pacelab-badge-update", check);
    };
  }, []);

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
    { href: isDemo ? "/demo/mescourses" : "/mescourses", label: "Mes Courses", Icon: IconActivity },
    { href: isDemo ? "/demo/analyse" : "/analyse", label: "Analyse", Icon: IconChart },
    { href: isDemo ? "/demo/recompenses" : "/recompenses", label: "Badges", Icon: IconAward },
    { href: isDemo ? "/demo/parametres" : "/parametres", label: "Paramètres", Icon: IconSliders },
  ];

  return (
    <>
      {isDemo && (
        <div style={{
          background: "rgba(216,90,48,0.06)",
          borderBottom: "0.5px solid rgba(216,90,48,0.18)",
          padding: "7px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 11, color: "var(--coral)", fontFamily: "var(--font-geist)", letterSpacing: ".04em" }}>
            Mode démonstration · compte fictif d&apos;Alex Martin
          </span>
          <a href="/login" style={{
            fontSize: 11,
            color: "var(--coral)",
            fontFamily: "var(--font-geist)",
            textDecoration: "none",
            border: "0.5px solid rgba(216,90,48,0.35)",
            borderRadius: 5,
            padding: "3px 10px",
          }}>
            Créer mon compte →
          </a>
        </div>
      )}

      {demoToast && (
        <div style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          background: "var(--surface)",
          border: "0.5px solid rgba(216,90,48,0.4)",
          borderRadius: 10,
          padding: "12px 18px",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          gap: 10,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--coral)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-geist)" }}>
            Déconnexion impossible en mode démonstration
          </span>
        </div>
      )}

      <nav style={{
        background: "rgba(7,11,20,0.96)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "0.5px solid var(--border)",
        padding: "0 28px",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "space-between",
        height: 52,
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>

        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", flexShrink: 0 }}>
          <div style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--accent)",
            boxShadow: "0 0 8px rgba(245,166,35,0.55)",
          }} />
          <span style={{
            fontFamily: "var(--font-dm-mono)",
            fontSize: 14,
            fontWeight: 500,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
          }}>
            Pacelab
          </span>
        </Link>

        {/* Navigation */}
        <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
          {links.map((link) => {
            const isActive = pathname === link.href || (pathname?.startsWith(link.href + "/") ?? false);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className="nav-link"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "0 16px",
                  textDecoration: "none",
                  position: "relative",
                  fontSize: 13,
                  color: isActive ? "var(--text-primary)" : "var(--text-dim)",
                  fontFamily: "var(--font-geist)",
                  transition: "color 0.15s, background 0.15s",
                  borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                  marginBottom: -1,
                }}
              >
                <span style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <link.Icon />
                  {link.label === "Badges" && badgeDot && (
                    <span style={{
                      position: "absolute",
                      top: -3,
                      right: -5,
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--coral)",
                      boxShadow: "0 0 4px rgba(224,90,43,0.8)",
                      border: "1px solid rgba(7,11,20,0.8)",
                    }} />
                  )}
                </span>
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Auth */}
        <div style={{ display: "flex", alignItems: "center" }}>
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="btn-logout"
              style={{
                background: "transparent",
                border: "0.5px solid var(--border-2)",
                borderRadius: 6,
                color: "var(--text-dim)",
                fontSize: 12,
                padding: "5px 14px",
                cursor: "pointer",
                fontFamily: "var(--font-geist)",
                transition: "border-color 0.15s, color 0.15s, background 0.15s",
              }}
            >
              Déconnexion
            </button>
          ) : (
            <Link
              href="/login"
              style={{
                background: "var(--accent)",
                color: "#fff",
                borderRadius: 6,
                padding: "6px 16px",
                fontSize: 12,
                fontWeight: 500,
                textDecoration: "none",
                fontFamily: "var(--font-geist)",
                boxShadow: "0 0 14px rgba(245,166,35,0.3)",
              }}
            >
              Se connecter
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
