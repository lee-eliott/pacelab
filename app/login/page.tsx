"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <div className="w-2 h-2 rounded-full bg-[var(--coral)]" />
          <span
            className="text-lg font-medium tracking-tight"
            style={{ fontFamily: "var(--font-dm-mono)" }}
          >
            Pacelab
          </span>
        </div>

        <h1 className="text-2xl font-medium mb-1">Connexion</h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
          Accès réservé
        </p>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label
              className="block text-xs mb-2 uppercase tracking-widest"
              style={{ color: "var(--text-dim)" }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton@email.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label
              className="block text-xs mb-2 uppercase tracking-widest"
              style={{ color: "var(--text-dim)" }}
            >
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: "var(--coral)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary mt-2"
            disabled={loading}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}