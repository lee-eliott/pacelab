"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import { minSecToSecondes, secondesToDisplay, allureMinKm } from "@/lib/types";

interface Parcours {
  id: string;
  nom: string;
  distance_km: number | null;
}

interface Compagnon {
  id: string;
  nom: string;
}

// Sentinelle pour le mode "parcours personnalisé one-shot"
const CUSTOM_ID = "__custom__";

// ─── styles hors composant ────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
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

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  color: "var(--text-dim)",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  display: "block",
  marginBottom: 6,
  fontFamily: "var(--font-geist)",
};

const btnPrimary: React.CSSProperties = {
  background: "var(--accent)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 24px",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "var(--font-geist)",
};

const btnSecondary: React.CSSProperties = {
  background: "transparent",
  color: "var(--text-dim)",
  border: "0.5px solid var(--border-2)",
  borderRadius: 8,
  padding: "10px 20px",
  fontSize: 14,
  cursor: "pointer",
  fontFamily: "var(--font-geist)",
};

// ─── sous-composants définis hors parent ─────────────────────────────────────

function CompagnonToggle({
  compagnon,
  selected,
  onToggle,
}: {
  compagnon: Compagnon;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        borderRadius: 8,
        border: selected ? "0.5px solid #1a4a30" : "0.5px solid var(--border-2)",
        background: selected ? "#0f2a1e" : "var(--surface-2)",
        cursor: "pointer",
        transition: "all 0.15s",
        fontFamily: "var(--font-geist)",
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: selected ? "#1a4a30" : "#222",
        border: selected ? "0.5px solid #1d9e75" : "0.5px solid #333",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 500,
        color: selected ? "var(--green)" : "var(--text-dim)",
        flexShrink: 0, transition: "all 0.15s",
      }}>
        {compagnon.nom.charAt(0).toUpperCase()}
      </div>
      <span style={{ fontSize: 13, color: selected ? "var(--green)" : "var(--text-muted)" }}>
        {compagnon.nom}
      </span>
      {selected && <span style={{ fontSize: 10, color: "var(--green)", marginLeft: 2 }}>✓</span>}
    </button>
  );
}

function ParcoursCard({
  parcours,
  selected,
  onSelect,
  dureeSecondes,
}: {
  parcours: Parcours;
  selected: boolean;
  onSelect: () => void;
  dureeSecondes: number;
}) {
  const allure = parcours.distance_km && dureeSecondes > 0
    ? allureMinKm(dureeSecondes, parcours.distance_km)
    : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        display: "flex", flexDirection: "column", alignItems: "flex-start",
        gap: 4, padding: "12px 14px", borderRadius: 8,
        border: selected ? "0.5px solid rgba(245,166,35,0.5)" : "0.5px solid var(--border-2)",
        background: selected ? "var(--accent-dim)" : "var(--surface-2)",
        cursor: "pointer", transition: "all 0.15s",
        textAlign: "left", fontFamily: "var(--font-geist)", minWidth: 120,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 500, color: selected ? "var(--accent)" : "var(--text-primary)" }}>
        {parcours.nom}
      </span>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {parcours.distance_km && (
          <span style={{ fontSize: 10, color: selected ? "var(--accent)" : "var(--text-dim)" }}>
            {parcours.distance_km} km
          </span>
        )}
        {allure && (
          <span style={{ fontSize: 10, color: selected ? "var(--accent)" : "var(--text-dim)", fontFamily: "var(--font-dm-mono)" }}>
            → {allure}
          </span>
        )}
      </div>
    </button>
  );
}

// Carte spéciale "Parcours personnalisé"
function CustomParcoursCard({ selected, onSelect }: { selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        display: "flex", flexDirection: "column", alignItems: "flex-start",
        gap: 4, padding: "12px 14px", borderRadius: 8,
        border: selected ? "0.5px solid #4a3a1a" : "0.5px solid var(--border-2)",
        background: selected ? "#1e1608" : "var(--surface-2)",
        cursor: "pointer", transition: "all 0.15s",
        textAlign: "left", fontFamily: "var(--font-geist)",
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 500, color: selected ? "#c89a30" : "var(--text-muted)" }}>
        Parcours personnalisé
      </span>
      <span style={{ fontSize: 10, color: selected ? "#8a6a20" : "var(--text-dim)" }}>
        one-shot, distance optionnelle
      </span>
    </button>
  );
}

// ─── page principale ──────────────────────────────────────────────────────────

export default function SaisirPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [parcoursList, setParcoursList] = useState<Parcours[]>([]);
  const [compagnonsList, setCompagnonsList] = useState<Compagnon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Champs du formulaire
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [minutes, setMinutes] = useState("");
  const [secondes, setSecondes] = useState("");
  const [parcoursId, setParcoursId] = useState<string | null>(CUSTOM_ID);
  const [compagnonIds, setCompagnonIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  // Champs parcours personnalisé
  const [customNom, setCustomNom] = useState("");
  const [customDistance, setCustomDistance] = useState("");
  const [customDenivele, setCustomDenivele] = useState("");

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setIsLoggedIn(true);

      const [{ data: parc }, { data: comp }] = await Promise.all([
        supabase.from("parcours").select("id, nom, distance_km").eq("actif", true).eq("user_id", user.id).order("nom"),
        supabase.from("compagnons").select("id, nom").eq("actif", true).eq("user_id", user.id).order("nom"),
      ]);

      setParcoursList(parc || []);
      setCompagnonsList(comp || []);
      setLoading(false);
    }
    init();
  }, []);

  function toggleCompagnon(id: string) {
    setCompagnonIds((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  }

  function selectParcours(id: string | null) {
    setParcoursId(id);
    // Reset champs custom si on quitte le mode custom
    if (id !== CUSTOM_ID) {
      setCustomNom("");
      setCustomDistance("");
      setCustomDenivele("");
    }
  }

  const dureeSecondes = minutes || secondes
    ? minSecToSecondes(parseInt(minutes || "0"), parseInt(secondes || "0"))
    : 0;

  const parcoursSelectionne = parcoursList.find((p) => p.id === parcoursId);

  // Allure preview : parcours existant ou custom avec distance renseignée
  const distancePreview = parcoursId === CUSTOM_ID
    ? (customDistance ? parseFloat(customDistance) : null)
    : (parcoursSelectionne?.distance_km ?? null);
  const allurePreview = distancePreview && dureeSecondes > 0
    ? allureMinKm(dureeSecondes, distancePreview)
    : null;

  const isCustom = parcoursId === CUSTOM_ID;

  async function handleSubmit() {
    setError("");

    if (!date) { setError("La date est obligatoire."); return; }
    if (!minutes && !secondes) { setError("La durée est obligatoire."); return; }
    if (dureeSecondes <= 0) { setError("La durée doit être supérieure à 0."); return; }
    const sec = parseInt(secondes || "0");
    if (sec < 0 || sec > 59) { setError("Les secondes doivent être entre 0 et 59."); return; }
    if (isCustom && !customNom.trim()) { setError("Le nom du parcours personnalisé est obligatoire."); return; }
    if (isCustom && !customDistance) { setError("La distance est obligatoire pour un parcours personnalisé."); return; }

    setSaving(true);

    let finalParcoursId: string | null = parcoursId === CUSTOM_ID ? null : (parcoursId || null);

    // Si parcours personnalisé : on le crée d'abord (actif: false = ne remonte pas dans les paramètres)
    if (isCustom) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Non authentifié."); setSaving(false); return; }

      const { data: newParcours, error: parcoursError } = await supabase
        .from("parcours")
        .insert({
          user_id: user.id,
          nom: customNom.trim(),
          distance_km: customDistance ? parseFloat(customDistance) : null,
          denivele_positif_m: customDenivele ? parseInt(customDenivele) : null,
          actif: false, // one-shot : invisible dans les paramètres
        })
        .select("id")
        .single();

      if (parcoursError || !newParcours) {
        setError("Erreur lors de la création du parcours.");
        setSaving(false);
        return;
      }
      finalParcoursId = newParcours.id;
    }

    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date_course: date,
        duree_secondes: dureeSecondes,
        parcours_id: finalParcoursId,
        compagnon_ids: compagnonIds,
        notes: notes.trim() || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data?.error?.message ?? "Une erreur est survenue.");
      setSaving(false);
      return;
    }

    router.push("/mescourses");
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <Navbar isLoggedIn={isLoggedIn} />
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-dim)", fontSize: 13 }}>
          Chargement...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <Navbar isLoggedIn={isLoggedIn} />

      <main style={{ padding: "32px 24px", maxWidth: 640, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: "0.04em", textTransform: "uppercase", margin: "0 0 4px" }}>
            Nouvelle sortie
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: "#fff", margin: 0 }}>
            Saisir une course
          </h1>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Date */}
          <div className="card">
            <label style={labelStyle}>Date *</label>
            <input style={inputStyle} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {/* Durée */}
          <div className="card">
            <label style={labelStyle}>Durée *</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <input
                  style={{ ...inputStyle, fontFamily: "var(--font-dm-mono)", fontSize: 20, textAlign: "center", padding: "12px" }}
                  type="number" min="0" placeholder="26"
                  value={minutes} onChange={(e) => setMinutes(e.target.value)}
                />
                <p style={{ fontSize: 10, color: "var(--text-dim)", textAlign: "center", margin: "4px 0 0", fontFamily: "var(--font-geist)" }}>minutes</p>
              </div>
              <span style={{ fontSize: 20, color: "var(--text-dim)", fontFamily: "var(--font-dm-mono)", paddingBottom: 18 }}>:</span>
              <div style={{ flex: 1 }}>
                <input
                  style={{ ...inputStyle, fontFamily: "var(--font-dm-mono)", fontSize: 20, textAlign: "center", padding: "12px" }}
                  type="number" min="0" max="59" placeholder="37"
                  value={secondes} onChange={(e) => setSecondes(e.target.value)}
                />
                <p style={{ fontSize: 10, color: "var(--text-dim)", textAlign: "center", margin: "4px 0 0", fontFamily: "var(--font-geist)" }}>secondes</p>
              </div>
            </div>
            {dureeSecondes > 0 && (
              <div style={{ marginTop: 12, padding: "8px 12px", background: "var(--surface-2)", borderRadius: 6, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", fontFamily: "var(--font-dm-mono)" }}>
                  {secondesToDisplay(dureeSecondes)}
                </span>
                {allurePreview && (
                  <>
                    <span style={{ fontSize: 11, color: "var(--text-dim)" }}>·</span>
                    <span style={{ fontSize: 13, color: "var(--accent)", fontFamily: "var(--font-dm-mono)" }}>{allurePreview}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Parcours */}
          <div className="card">
            <label style={labelStyle}>Parcours</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: isCustom ? 16 : 0 }}>
              {/* Parcours enregistrés */}
              {parcoursList.map((p) => (
                <ParcoursCard
                  key={p.id}
                  parcours={p}
                  selected={parcoursId === p.id}
                  onSelect={() => selectParcours(p.id)}
                  dureeSecondes={dureeSecondes}
                />
              ))}

              {/* Parcours personnalisé */}
              <CustomParcoursCard
                selected={isCustom}
                onSelect={() => selectParcours(CUSTOM_ID)}
              />
            </div>

            {/* Champs custom — affichés uniquement si sélectionné */}
            {isCustom && (
              <div style={{
                background: "#1a140a",
                border: "0.5px solid #3a2a10",
                borderRadius: 8,
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}>
                <div>
                  <label style={{ ...labelStyle, color: "#6a4a20" }}>Nom du parcours *</label>
                  <input
                    style={{ ...inputStyle, background: "#110e08", borderColor: "#3a2a10" }}
                    placeholder="Ex: Tour du lac, Sentier du moulin..."
                    value={customNom}
                    onChange={(e) => setCustomNom(e.target.value)}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ ...labelStyle, color: "#6a4a20" }}>Distance (km) *</label>
                    <input
                      style={{ ...inputStyle, background: "#110e08", borderColor: "#3a2a10", fontFamily: "var(--font-dm-mono)" }}
                      type="number" step="0.01" placeholder="5.2"
                      value={customDistance}
                      onChange={(e) => setCustomDistance(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, color: "#6a4a20" }}>Dénivelé + (m)</label>
                    <input
                      style={{ ...inputStyle, background: "#110e08", borderColor: "#3a2a10", fontFamily: "var(--font-dm-mono)" }}
                      type="number" placeholder="120"
                      value={customDenivele}
                      onChange={(e) => setCustomDenivele(e.target.value)}
                    />
                  </div>
                </div>
                <p style={{ fontSize: 11, color: "#4a3010", margin: 0, fontFamily: "var(--font-geist)" }}>
                  Ce parcours ne sera pas ajouté à ta liste — il est attaché uniquement à cette course.
                </p>
              </div>
            )}
          </div>

          {/* Compagnons */}
          {compagnonsList.length > 0 && (
            <div className="card">
              <label style={labelStyle}>Compagnons</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {compagnonsList.map((c) => (
                  <CompagnonToggle
                    key={c.id}
                    compagnon={c}
                    selected={compagnonIds.includes(c.id)}
                    onToggle={() => toggleCompagnon(c.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="card">
            <label style={labelStyle}>Notes</label>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
              placeholder="Conditions, ressenti, météo..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <p style={{ fontSize: 13, color: "var(--coral)", fontFamily: "var(--font-geist)", margin: 0 }}>
              {error}
            </p>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSubmit} disabled={saving} style={btnPrimary}>
              {saving ? "Enregistrement..." : "Enregistrer la course"}
            </button>
            <button onClick={() => router.push("/mescourses")} style={btnSecondary}>
              Annuler
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}