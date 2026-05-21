"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import { inputStyle, labelStyle } from "@/lib/styles";

interface Parcours {
  id: string;
  nom: string;
  distance_km: number | null;
  denivele_positif_m: number | null;
  description: string | null;
  actif: boolean;
}

interface Compagnon {
  id: string;
  nom: string;
  created_at: string;
}

interface Objectif {
  id: string;
  user_id: string;
  titre: string;
  type: "duree" | "distance" | "sorties";
  valeur: number;
  periode: "hebdo" | "mensuel" | "annuel" | null;
  annee: number | null;
  date_debut: string | null;
  date_fin: string | null;
  actif: boolean;
  created_at: string;
}

interface ParcoursForm {
  nom: string;
  distance_km: string;
  denivele_positif_m: string;
  description: string;
}

interface ObjectifForm {
  titre: string;
  type: "duree" | "distance" | "sorties";
  valeur: string;
  mode: "periode" | "libre";
  periode: "hebdo" | "mensuel" | "annuel";
  annee: string;
  date_debut: string;
  date_fin: string;
}

type CoursesSummary = { date_course: string; duree_secondes: number; parcours_distance_km: number | null };
type ObjAvecProg = Objectif & { prog: ReturnType<typeof calcProgression> };

const emptyParcoursForm: ParcoursForm = { nom: "", distance_km: "", denivele_positif_m: "", description: "" };
const emptyObjectifForm: ObjectifForm = {
  titre: "", type: "duree", valeur: "", mode: "periode",
  periode: "annuel", annee: new Date().getFullYear().toString(),
  date_debut: "", date_fin: "",
};

type Tab = "parcours" | "compagnons" | "objectifs" | "preferences";

const btnPrimary: React.CSSProperties = {
  background: "var(--accent)", color: "#fff", border: "none", borderRadius: 6,
  padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-geist)",
};
const btnSecondary: React.CSSProperties = {
  background: "transparent", color: "var(--text-dim)", border: "0.5px solid var(--border-2)",
  borderRadius: 6, padding: "8px 16px", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-geist)",
};
const btnGhost: React.CSSProperties = {
  background: "transparent", color: "var(--text-muted)", border: "0.5px solid var(--border-2)",
  borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-geist)",
};
const btnGhostDisabled: React.CSSProperties = {
  background: "transparent", color: "#333", border: "0.5px solid #222",
  borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "not-allowed", fontFamily: "var(--font-geist)", opacity: 0.4,
};
const btnPrimaryDisabled: React.CSSProperties = {
  background: "#2a2a2a", color: "#444", border: "none",
  borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "not-allowed", fontFamily: "var(--font-geist)",
};

function typeLabel(t: string) { return { duree: "Durée", distance: "Distance", sorties: "Sorties" }[t] ?? t; }
function typeUnite(t: string) { return { duree: "min", distance: "km", sorties: "sorties" }[t] ?? ""; }
function periodeLabel(p: string | null, annee: number | null) {
  if (!p) return null;
  return { hebdo: "Hebdomadaire", mensuel: "Mensuel", annuel: `Annuel ${annee ?? ""}` }[p] ?? p;
}

function calcProgression(obj: Objectif, courses: CoursesSummary[]) {
  const now = new Date();
  let debut: Date;
  let fin: Date;
  if (obj.periode) {
    const annee = obj.annee ?? now.getFullYear();
    if (obj.periode === "annuel") {
      debut = new Date(`${annee}-01-01`); fin = new Date(`${annee}-12-31`);
    } else if (obj.periode === "mensuel") {
      debut = new Date(now.getFullYear(), now.getMonth(), 1);
      fin = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else {
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
      debut = monday; fin = new Date(monday); fin.setDate(fin.getDate() + 6);
    }
  } else {
    debut = new Date(obj.date_debut!); fin = new Date(obj.date_fin!);
  }
  const filtered = courses.filter((c) => { const d = new Date(c.date_course); return d >= debut && d <= fin; });
  let valeur = 0;
  if (obj.type === "duree") valeur = filtered.reduce((s, c) => s + Math.floor(c.duree_secondes / 60), 0);
  else if (obj.type === "distance") valeur = filtered.reduce((s, c) => s + (c.parcours_distance_km ?? 0), 0);
  else valeur = filtered.length;
  const pct = Math.min(Math.round((valeur / obj.valeur) * 100), 100);
  const termine = now > fin;
  const atteint = pct >= 100;
  const echoue = termine && !atteint;
  return { valeur: Math.round(valeur * 10) / 10, pct, atteint, echoue };
}

function FormCard({ title, children, error }: { title: string; children: React.ReactNode; error?: string }) {
  return (
    <div style={{ background: "var(--surface)", border: "0.5px solid rgba(245,166,35,0.4)", borderRadius: 10, padding: "20px", marginBottom: 16 }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--accent)", margin: "0 0 16px", fontFamily: "var(--font-geist)" }}>{title}</p>
      {children}
      {error && <p style={{ fontSize: 12, color: "var(--coral)", margin: "12px 0 0", fontFamily: "var(--font-geist)" }}>{error}</p>}
    </div>
  );
}

function ObjectifFormContent({ form, setForm }: { form: ObjectifForm; setForm: (f: ObjectifForm) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label style={labelStyle}>Titre *</label>
        <input style={inputStyle} value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder="Ex: 500 km cette année" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={labelStyle}>Type *</label>
          <select style={inputStyle} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ObjectifForm["type"] })}>
            <option value="duree">Durée (minutes)</option>
            <option value="distance">Distance (km)</option>
            <option value="sorties">Nombre de sorties</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Valeur cible *</label>
          <input style={inputStyle} type="number" value={form.valeur} onChange={(e) => setForm({ ...form, valeur: e.target.value })} placeholder={form.type === "duree" ? "500" : form.type === "distance" ? "200" : "50"} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Mode</label>
        <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", border: "0.5px solid var(--border-2)", borderRadius: 6, padding: 3, width: "fit-content" }}>
          {(["periode", "libre"] as const).map((m) => (
            <button key={m} onClick={() => setForm({ ...form, mode: m })} style={{ padding: "4px 12px", borderRadius: 4, fontSize: 12, border: "none", cursor: "pointer", fontFamily: "var(--font-geist)", background: form.mode === m ? "var(--accent)" : "transparent", color: form.mode === m ? "#fff" : "var(--text-dim)" }}>
              {m === "periode" ? "Période fixe" : "Date libre"}
            </button>
          ))}
        </div>
      </div>
      {form.mode === "periode" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Période</label>
            <select style={inputStyle} value={form.periode} onChange={(e) => setForm({ ...form, periode: e.target.value as ObjectifForm["periode"] })}>
              <option value="hebdo">Hebdomadaire</option>
              <option value="mensuel">Mensuel</option>
              <option value="annuel">Annuel</option>
            </select>
          </div>
          {form.periode === "annuel" && (
            <div>
              <label style={labelStyle}>Année</label>
              <input style={inputStyle} type="number" value={form.annee} onChange={(e) => setForm({ ...form, annee: e.target.value })} />
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Date de début *</label>
            <input style={inputStyle} type="date" value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Date de fin *</label>
            <input style={inputStyle} type="date" value={form.date_fin} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} />
          </div>
        </div>
      )}
    </div>
  );
}

function ObjectifCard({
  o, isLoggedIn, isEditing, editForm, setEditForm, objectifError, objectifSaving,
  onStartEdit, onSave, onCancel, onDelete,
}: {
  o: ObjAvecProg;
  isLoggedIn: boolean;
  isEditing: boolean;
  editForm: ObjectifForm;
  setEditForm: (f: ObjectifForm) => void;
  objectifError: string;
  objectifSaving: boolean;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const { prog } = o;
  const color = prog.atteint ? "var(--green)" : prog.echoue ? "#555" : "var(--accent)";
  return (
    <div style={{ background: "var(--surface)", border: `0.5px solid ${prog.atteint ? "#1a4a30" : prog.echoue ? "#2a2a2a" : "var(--border)"}`, borderRadius: 10, padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: prog.echoue ? "var(--text-dim)" : "var(--text-primary)", margin: 0, fontFamily: "var(--font-geist)" }}>{o.titre}</p>
            {prog.atteint && <span style={{ fontSize: 10, background: "#0f2a1e", border: "0.5px solid #1a4a30", borderRadius: 4, padding: "2px 6px", color: "var(--green)", fontFamily: "var(--font-geist)" }}>Atteint ✓</span>}
            {prog.echoue && <span style={{ fontSize: 10, background: "#222", border: "0.5px solid #333", borderRadius: 4, padding: "2px 6px", color: "#666", fontFamily: "var(--font-geist)" }}>Échoué</span>}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-geist)" }}>{typeLabel(o.type)}</span>
            <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-geist)" }}>·</span>
            <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-geist)" }}>{periodeLabel(o.periode, o.annee) ?? `${o.date_debut} → ${o.date_fin}`}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 3, background: "#222", borderRadius: 2 }}>
              <div style={{ height: 3, background: color, borderRadius: 2, width: `${prog.pct}%`, transition: "width 0.4s" }} />
            </div>
            <span style={{ fontSize: 12, color, fontFamily: "var(--font-dm-mono)", flexShrink: 0 }}>
              {prog.valeur} / {o.valeur} {typeUnite(o.type)} · {prog.pct}%
            </span>
          </div>
        </div>
        {isLoggedIn && (
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button onClick={onStartEdit} style={btnGhost}>Modifier</button>
            <button onClick={onDelete} style={btnGhost}>Supprimer</button>
          </div>
        )}
      </div>
      {isEditing && (
        <div style={{ marginTop: 16, borderTop: "0.5px solid var(--border)", paddingTop: 16 }}>
          <ObjectifFormContent form={editForm} setForm={setEditForm} />
          {objectifError && <p style={{ fontSize: 12, color: "var(--coral)", margin: "12px 0 0", fontFamily: "var(--font-geist)" }}>{objectifError}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={onSave} disabled={objectifSaving} style={btnPrimary}>{objectifSaving ? "Enregistrement..." : "Enregistrer"}</button>
            <button onClick={onCancel} style={btnSecondary}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ParametresPage() {
  const [tab, setTab] = useState<Tab>("parcours");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [parcours, setParcours] = useState<Parcours[]>([]);
  const [parcoursLoading, setParcoursLoading] = useState(true);
  const [editingParcoursId, setEditingParcoursId] = useState<string | null>(null);
  const [showParcoursForm, setShowParcoursForm] = useState(false);
  const [parcoursForm, setParcoursForm] = useState<ParcoursForm>(emptyParcoursForm);
  const [parcoursSaving, setParcoursSaving] = useState(false);
  const [parcoursError, setParcoursError] = useState("");

  const [compagnons, setCompagnons] = useState<Compagnon[]>([]);
  const [compagnonsLoading, setCompagnonsLoading] = useState(true);
  const [editingCompagnonId, setEditingCompagnonId] = useState<string | null>(null);
  const [showCompagnonForm, setShowCompagnonForm] = useState(false);
  const [compagnonNom, setCompagnonNom] = useState("");
  const [compagnonSaving, setCompagnonSaving] = useState(false);
  const [compagnonError, setCompagnonError] = useState("");

  const [objectifs, setObjectifs] = useState<Objectif[]>([]);
  const [objectifsLoading, setObjectifsLoading] = useState(true);
  const [editingObjectifId, setEditingObjectifId] = useState<string | null>(null);
  const [showObjectifForm, setShowObjectifForm] = useState(false);
  const [objectifForm, setObjectifForm] = useState<ObjectifForm>(emptyObjectifForm);
  const [objectifSaving, setObjectifSaving] = useState(false);
  const [objectifError, setObjectifError] = useState("");
  const [coursesSummary, setCoursesSummary] = useState<CoursesSummary[]>([]);

  const [timeField, setTimeFieldState] = useState<"moving_time" | "elapsed_time">("moving_time");
  const [prefSaving, setPrefSaving] = useState(false);
  const [featuredBadge, setFeaturedBadgeState] = useState<{id:string;name:string;emoji:string}|null>(null);
  const [unlockedBadges, setUnlockedBadges] = useState<{id:string;name:string;emoji:string}[]>([]);

  const supabase = createClient();
  const ELIOTT_USER_ID = "8e45b7b9-f98e-4210-8f06-c9dc4de57521";

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) { setIsLoggedIn(true); setUserId(user.id); }
      const targetId = user?.id ?? ELIOTT_USER_ID;
      await Promise.all([loadParcours(targetId), loadCompagnons(targetId), loadObjectifs(targetId), loadCourses()]);
      // Charge les préférences
      if (user) {
        const { data: prefs } = await supabase.from("user_preferences").select("time_field").eq("user_id", user.id).single();
        if (prefs?.time_field) setTimeFieldState(prefs.time_field as "moving_time" | "elapsed_time");
      }
      // Badge mis en avant
      try {
        const ubRaw = localStorage.getItem("pacelab_unlocked_badges_full");
        const unlocked: {id:string;name:string;emoji:string}[] = ubRaw ? JSON.parse(ubRaw) : [];
        if (unlocked.length) setUnlockedBadges(unlocked);

        // Source de vérité principale : pacelab_featured_badge (écrit à chaque sélection)
        const cachedRaw = localStorage.getItem("pacelab_featured_badge");
        if (cachedRaw) {
          try { setFeaturedBadgeState(JSON.parse(cachedRaw)); } catch {}
        }

        // Sync Supabase : peut confirmer / mettre à jour, jamais effacer
        if (user) {
          const { data: badgeState } = await supabase
            .from("user_badge_state")
            .select("featured_id")
            .eq("user_id", user.id)
            .single();
          if (badgeState?.featured_id) {
            const found = unlocked.find(b => b.id === badgeState.featured_id);
            if (found) {
              setFeaturedBadgeState(found);
              localStorage.setItem("pacelab_featured_badge", JSON.stringify(found));
            }
          }
        }
      } catch {}
    }
    init();
  }, []);

  async function loadCourses() {
    const { data } = await supabase.from("courses_enrichies").select("date_course, duree_secondes, parcours_distance_km");
    setCoursesSummary(data || []);
  }

  async function loadParcours(targetUserId?: string) {
    setParcoursLoading(true);
    const { data } = await supabase.from("parcours").select("*").eq("actif", true).eq("user_id", targetUserId ?? userId ?? "").order("nom");
    setParcours(data || []);
    setParcoursLoading(false);
  }

  function startEditParcours(p: Parcours) {
    setEditingParcoursId(p.id); setShowParcoursForm(false);
    setParcoursForm({ nom: p.nom, distance_km: p.distance_km?.toString() ?? "", denivele_positif_m: p.denivele_positif_m?.toString() ?? "", description: p.description ?? "" });
    setParcoursError("");
  }
  function cancelParcours() { setEditingParcoursId(null); setShowParcoursForm(false); setParcoursForm(emptyParcoursForm); setParcoursError(""); }

  async function saveParcours() {
    if (!parcoursForm.nom.trim()) { setParcoursError("Le nom est obligatoire."); return; }
    setParcoursSaving(true);
    const body = { nom: parcoursForm.nom.trim(), distance_km: parcoursForm.distance_km ? parseFloat(parcoursForm.distance_km) : null, denivele_positif_m: parcoursForm.denivele_positif_m ? parseInt(parcoursForm.denivele_positif_m) : null, description: parcoursForm.description.trim() || null, ...(editingParcoursId ? { id: editingParcoursId } : {}) };
    const res = await fetch("/api/parcours", { method: editingParcoursId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) { setParcoursError("Une erreur est survenue."); setParcoursSaving(false); return; }
    await loadParcours(); cancelParcours(); setParcoursSaving(false);
  }

  async function archiveParcours(id: string) {
    if (!confirm("Archiver ce parcours ?")) return;
    await fetch(`/api/parcours?id=${id}`, { method: "DELETE" });
    await loadParcours();
  }

  async function loadCompagnons(targetUserId?: string) {
    setCompagnonsLoading(true);
    const { data } = await supabase.from("compagnons").select("*").eq("actif", true).eq("user_id", targetUserId ?? userId ?? "").order("nom");
    setCompagnons(data || []);
    setCompagnonsLoading(false);
  }

  function startEditCompagnon(c: Compagnon) { setEditingCompagnonId(c.id); setShowCompagnonForm(false); setCompagnonNom(c.nom); setCompagnonError(""); }
  function cancelCompagnon() { setEditingCompagnonId(null); setShowCompagnonForm(false); setCompagnonNom(""); setCompagnonError(""); }

  async function saveCompagnon() {
    if (!compagnonNom.trim()) { setCompagnonError("Le nom est obligatoire."); return; }
    setCompagnonSaving(true); setCompagnonError("");
    if (editingCompagnonId) {
      const { error } = await supabase.from("compagnons").update({ nom: compagnonNom.trim() }).eq("id", editingCompagnonId);
      if (error) { setCompagnonError("Une erreur est survenue."); setCompagnonSaving(false); return; }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setCompagnonSaving(false); return; }
      const { error } = await supabase.from("compagnons").insert({ nom: compagnonNom.trim(), user_id: user.id });
      if (error) { setCompagnonError("Une erreur est survenue."); setCompagnonSaving(false); return; }
    }
    await loadCompagnons(); cancelCompagnon(); setCompagnonSaving(false);
  }

  async function archiveCompagnon(id: string) {
    if (!confirm("Archiver ce compagnon ? Les courses existantes sont conservées.")) return;
    await supabase.from("compagnons").update({ actif: false }).eq("id", id);
    await loadCompagnons();
  }

  async function loadObjectifs(targetUserId?: string) {
    setObjectifsLoading(true);
    const { data } = await supabase.from("objectifs").select("*").eq("actif", true).eq("user_id", targetUserId ?? userId ?? "").order("created_at", { ascending: false });
    setObjectifs(data || []);
    setObjectifsLoading(false);
  }

  function startEditObjectif(o: Objectif) {
    setEditingObjectifId(o.id); setShowObjectifForm(false);
    setObjectifForm({ titre: o.titre, type: o.type, valeur: o.valeur.toString(), mode: o.periode ? "periode" : "libre", periode: o.periode ?? "annuel", annee: o.annee?.toString() ?? new Date().getFullYear().toString(), date_debut: o.date_debut ?? "", date_fin: o.date_fin ?? "" });
    setObjectifError("");
  }
  function cancelObjectif() { setEditingObjectifId(null); setShowObjectifForm(false); setObjectifForm(emptyObjectifForm); setObjectifError(""); }

  async function saveObjectif() {
    if (!objectifForm.titre.trim()) { setObjectifError("Le titre est obligatoire."); return; }
    if (!objectifForm.valeur) { setObjectifError("La valeur est obligatoire."); return; }
    if (objectifForm.mode === "libre" && (!objectifForm.date_debut || !objectifForm.date_fin)) { setObjectifError("Les dates sont obligatoires."); return; }
    if (!userId) return;
    setObjectifSaving(true);
    const body = { user_id: userId, titre: objectifForm.titre.trim(), type: objectifForm.type, valeur: parseFloat(objectifForm.valeur), periode: objectifForm.mode === "periode" ? objectifForm.periode : null, annee: objectifForm.mode === "periode" && objectifForm.periode === "annuel" ? parseInt(objectifForm.annee) : null, date_debut: objectifForm.mode === "libre" ? objectifForm.date_debut : null, date_fin: objectifForm.mode === "libre" ? objectifForm.date_fin : null };
    const { error } = editingObjectifId
      ? await supabase.from("objectifs").update(body).eq("id", editingObjectifId)
      : await supabase.from("objectifs").insert(body);
    if (error) { setObjectifError("Une erreur est survenue."); setObjectifSaving(false); return; }
    await loadObjectifs(); cancelObjectif(); setObjectifSaving(false);
  }

  async function deleteObjectif(id: string) {
    if (!confirm("Supprimer cet objectif ?")) return;
    await supabase.from("objectifs").update({ actif: false }).eq("id", id);
    await loadObjectifs();
  }

  async function selectFeaturedBadge(badge: {id:string;name:string;emoji:string} | null) {
    setFeaturedBadgeState(badge);
    // Supabase — upsert partiel (featured_id uniquement, seen_ids non touché)
    if (userId) {
      await supabase
        .from("user_badge_state")
        .upsert(
          { user_id: userId, featured_id: badge?.id ?? null, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
    }
    // Cache localStorage pour affichage dans mescourses (évite un fetch Supabase)
    if (badge) localStorage.setItem("pacelab_featured_badge", JSON.stringify(badge));
    else localStorage.removeItem("pacelab_featured_badge");
  }

  async function saveTimeField(field: "moving_time" | "elapsed_time") {
    if (!userId) return;
    setPrefSaving(true);
    setTimeFieldState(field);
    await supabase.from("user_preferences").upsert({ user_id: userId, time_field: field, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    setPrefSaving(false);
  }

  const tabs: [Tab, string][] = [["parcours", "Parcours"], ["compagnons", "Compagnons"], ["objectifs", "Objectifs"], ["preferences", "Préférences"]];
  const objAvecProgression = objectifs.map((o) => ({ ...o, prog: calcProgression(o, coursesSummary) }));
  const enCours = objAvecProgression.filter((o) => !o.prog.atteint && !o.prog.echoue);
  const atteints = objAvecProgression.filter((o) => o.prog.atteint);
  const echoues = objAvecProgression.filter((o) => o.prog.echoue);

  return (
    <div style={{ minHeight: "100vh" }}>
      <Navbar isLoggedIn={isLoggedIn} />
      <main style={{ padding: "24px", maxWidth: 760, margin: "0 auto" }}>

        {!isLoggedIn && (
          <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "10px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-geist)" }}>
              Vous consultez les paramètres publics d'<strong style={{ color: "var(--text-primary)" }}>Eliott LEE</strong> — Lecture seule
            </span>
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: "0.04em", textTransform: "uppercase", margin: "0 0 4px" }}>Paramètres</p>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: "#fff", margin: 0 }}>Gestion</h1>
        </div>

        <div style={{ display: "flex", gap: 4, background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 8, padding: 4, marginBottom: 20, width: "fit-content" }}>
          {tabs.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{ padding: "6px 16px", borderRadius: 6, fontSize: 13, border: "none", cursor: "pointer", fontFamily: "var(--font-geist)", background: tab === key ? "var(--accent)" : "transparent", color: tab === key ? "#fff" : "var(--text-dim)", transition: "all 0.15s" }}>
              {label}
            </button>
          ))}
        </div>

        {tab === "parcours" && (
          <div>
            {!showParcoursForm && !editingParcoursId && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <button onClick={isLoggedIn ? () => setShowParcoursForm(true) : undefined} style={isLoggedIn ? btnPrimary : btnPrimaryDisabled} title={isLoggedIn ? undefined : "Connexion requise"}>+ Nouveau parcours</button>
              </div>
            )}
            {showParcoursForm && isLoggedIn && (
              <FormCard title="Nouveau parcours" error={parcoursError}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Nom *</label><input style={inputStyle} value={parcoursForm.nom} onChange={(e) => setParcoursForm({ ...parcoursForm, nom: e.target.value })} placeholder="Ex: Classique V3" /></div>
                  <div><label style={labelStyle}>Distance (km)</label><input style={inputStyle} type="number" step="0.01" value={parcoursForm.distance_km} onChange={(e) => setParcoursForm({ ...parcoursForm, distance_km: e.target.value })} placeholder="4.33" /></div>
                  <div><label style={labelStyle}>Dénivelé positif (m)</label><input style={inputStyle} type="number" value={parcoursForm.denivele_positif_m} onChange={(e) => setParcoursForm({ ...parcoursForm, denivele_positif_m: e.target.value })} placeholder="54" /></div>
                  <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Description</label><input style={inputStyle} value={parcoursForm.description} onChange={(e) => setParcoursForm({ ...parcoursForm, description: e.target.value })} placeholder="Notes..." /></div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={saveParcours} disabled={parcoursSaving} style={btnPrimary}>{parcoursSaving ? "Enregistrement..." : "Créer"}</button>
                  <button onClick={cancelParcours} style={btnSecondary}>Annuler</button>
                </div>
              </FormCard>
            )}
            {parcoursLoading ? <p style={{ color: "var(--text-dim)", fontSize: 13 }}>Chargement...</p> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {parcours.map((p) => (
                  <div key={p.id}>
                    {editingParcoursId !== p.id ? (
                      <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)", margin: "0 0 8px", fontFamily: "var(--font-geist)" }}>{p.nom}</p>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {p.distance_km && <span style={{ fontSize: 11, background: "var(--surface-2)", border: "0.5px solid var(--border-2)", borderRadius: 4, padding: "2px 8px", color: "var(--text-muted)", fontFamily: "var(--font-geist)" }}>📍 {p.distance_km} km</span>}
                            {p.denivele_positif_m && <span style={{ fontSize: 11, background: "var(--surface-2)", border: "0.5px solid var(--border-2)", borderRadius: 4, padding: "2px 8px", color: "var(--text-muted)", fontFamily: "var(--font-geist)" }}>⛰ +{p.denivele_positif_m}m</span>}
                            {p.description && <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-geist)" }}>{p.description}</span>}
                            {!p.distance_km && !p.denivele_positif_m && !p.description && <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-geist)" }}>Aucune caractéristique</span>}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={isLoggedIn ? () => startEditParcours(p) : undefined} style={isLoggedIn ? btnGhost : btnGhostDisabled} title={isLoggedIn ? undefined : "Connexion requise"}>Modifier</button>
                            <button onClick={isLoggedIn ? () => archiveParcours(p.id) : undefined} style={isLoggedIn ? btnGhost : btnGhostDisabled} title={isLoggedIn ? undefined : "Connexion requise"}>Archiver</button>
                          </div>
                      </div>
                    ) : (
                      <div style={{ background: "var(--surface)", border: "0.5px solid rgba(245,166,35,0.4)", borderRadius: 10, padding: "20px" }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--accent)", margin: "0 0 16px", fontFamily: "var(--font-geist)" }}>Modifier — {p.nom}</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                          <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Nom *</label><input style={inputStyle} value={parcoursForm.nom} onChange={(e) => setParcoursForm({ ...parcoursForm, nom: e.target.value })} /></div>
                          <div><label style={labelStyle}>Distance (km)</label><input style={inputStyle} type="number" step="0.01" value={parcoursForm.distance_km} onChange={(e) => setParcoursForm({ ...parcoursForm, distance_km: e.target.value })} /></div>
                          <div><label style={labelStyle}>Dénivelé positif (m)</label><input style={inputStyle} type="number" value={parcoursForm.denivele_positif_m} onChange={(e) => setParcoursForm({ ...parcoursForm, denivele_positif_m: e.target.value })} /></div>
                          <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Description</label><input style={inputStyle} value={parcoursForm.description} onChange={(e) => setParcoursForm({ ...parcoursForm, description: e.target.value })} /></div>
                        </div>
                        {parcoursError && <p style={{ fontSize: 12, color: "var(--coral)", margin: "0 0 12px" }}>{parcoursError}</p>}
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={saveParcours} disabled={parcoursSaving} style={btnPrimary}>{parcoursSaving ? "Enregistrement..." : "Enregistrer"}</button>
                          <button onClick={cancelParcours} style={btnSecondary}>Annuler</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {parcours.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-dim)", fontSize: 13 }}>Aucun parcours enregistré.</div>}
              </div>
            )}
          </div>
        )}

        {tab === "compagnons" && (
          <div>
            {!showCompagnonForm && !editingCompagnonId && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <button onClick={isLoggedIn ? () => setShowCompagnonForm(true) : undefined} style={isLoggedIn ? btnPrimary : btnPrimaryDisabled} title={isLoggedIn ? undefined : "Connexion requise"}>+ Nouveau compagnon</button>
              </div>
            )}
            {showCompagnonForm && isLoggedIn && (
              <FormCard title="Nouveau compagnon" error={compagnonError}>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Prénom *</label>
                  <input style={inputStyle} value={compagnonNom} onChange={(e) => setCompagnonNom(e.target.value)} placeholder="Ex: Thomas" onKeyDown={(e) => e.key === "Enter" && saveCompagnon()} autoFocus />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={saveCompagnon} disabled={compagnonSaving} style={btnPrimary}>{compagnonSaving ? "Enregistrement..." : "Créer"}</button>
                  <button onClick={cancelCompagnon} style={btnSecondary}>Annuler</button>
                </div>
              </FormCard>
            )}
            {compagnonsLoading ? <p style={{ color: "var(--text-dim)", fontSize: 13 }}>Chargement...</p> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {compagnons.map((c) => (
                  <div key={c.id}>
                    {editingCompagnonId !== c.id ? (
                      <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#0f2a1e", border: "0.5px solid #1a4a30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 500, color: "var(--green)", fontFamily: "var(--font-geist)", flexShrink: 0 }}>
                            {c.nom.charAt(0).toUpperCase()}
                          </div>
                          <p style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-geist)" }}>{c.nom}</p>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={isLoggedIn ? () => startEditCompagnon(c) : undefined} style={isLoggedIn ? btnGhost : btnGhostDisabled} title={isLoggedIn ? undefined : "Connexion requise"}>Modifier</button>
                            <button onClick={isLoggedIn ? () => archiveCompagnon(c.id) : undefined} style={isLoggedIn ? btnGhost : btnGhostDisabled} title={isLoggedIn ? undefined : "Connexion requise"}>Archiver</button>
                          </div>
                      </div>
                    ) : (
                      <div style={{ background: "var(--surface)", border: "0.5px solid rgba(245,166,35,0.4)", borderRadius: 10, padding: "20px" }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--accent)", margin: "0 0 16px", fontFamily: "var(--font-geist)" }}>Modifier — {c.nom}</p>
                        <div style={{ marginBottom: 12 }}>
                          <label style={labelStyle}>Prénom *</label>
                          <input style={inputStyle} value={compagnonNom} onChange={(e) => setCompagnonNom(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveCompagnon()} autoFocus />
                        </div>
                        {compagnonError && <p style={{ fontSize: 12, color: "var(--coral)", margin: "0 0 12px" }}>{compagnonError}</p>}
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={saveCompagnon} disabled={compagnonSaving} style={btnPrimary}>{compagnonSaving ? "Enregistrement..." : "Enregistrer"}</button>
                          <button onClick={cancelCompagnon} style={btnSecondary}>Annuler</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {compagnons.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-dim)", fontSize: 13 }}>Aucun compagnon enregistré.</div>}
              </div>
            )}
          </div>
        )}

        {tab === "objectifs" && (
          <div>
            {!showObjectifForm && !editingObjectifId && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <button onClick={isLoggedIn ? () => setShowObjectifForm(true) : undefined} style={isLoggedIn ? btnPrimary : btnPrimaryDisabled} title={isLoggedIn ? undefined : "Connexion requise"}>+ Nouvel objectif</button>
              </div>
            )}
            {showObjectifForm && isLoggedIn && (
              <FormCard title="Nouvel objectif" error={objectifError}>
                <ObjectifFormContent form={objectifForm} setForm={setObjectifForm} />
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={saveObjectif} disabled={objectifSaving} style={btnPrimary}>{objectifSaving ? "Enregistrement..." : "Créer"}</button>
                  <button onClick={cancelObjectif} style={btnSecondary}>Annuler</button>
                </div>
              </FormCard>
            )}
            {objectifsLoading ? <p style={{ color: "var(--text-dim)", fontSize: 13 }}>Chargement...</p> : (
              <div>
                {enCours.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <p style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.05em", textTransform: "uppercase", margin: "0 0 10px", fontFamily: "var(--font-geist)" }}>En cours</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {enCours.map((o) => (
                        <ObjectifCard key={o.id} o={o} isLoggedIn={isLoggedIn}
                          isEditing={editingObjectifId === o.id} editForm={objectifForm} setEditForm={setObjectifForm}
                          objectifError={objectifError} objectifSaving={objectifSaving}
                          onStartEdit={() => startEditObjectif(o)} onSave={saveObjectif}
                          onCancel={cancelObjectif} onDelete={() => deleteObjectif(o.id)} />
                      ))}
                    </div>
                  </div>
                )}
                {atteints.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <p style={{ fontSize: 10, color: "var(--green)", letterSpacing: "0.05em", textTransform: "uppercase", margin: "0 0 10px", fontFamily: "var(--font-geist)" }}>Atteints ✓</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {atteints.map((o) => (
                        <ObjectifCard key={o.id} o={o} isLoggedIn={isLoggedIn}
                          isEditing={editingObjectifId === o.id} editForm={objectifForm} setEditForm={setObjectifForm}
                          objectifError={objectifError} objectifSaving={objectifSaving}
                          onStartEdit={() => startEditObjectif(o)} onSave={saveObjectif}
                          onCancel={cancelObjectif} onDelete={() => deleteObjectif(o.id)} />
                      ))}
                    </div>
                  </div>
                )}
                {echoues.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <p style={{ fontSize: 10, color: "#555", letterSpacing: "0.05em", textTransform: "uppercase", margin: "0 0 10px", fontFamily: "var(--font-geist)" }}>Échoués</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {echoues.map((o) => (
                        <ObjectifCard key={o.id} o={o} isLoggedIn={isLoggedIn}
                          isEditing={editingObjectifId === o.id} editForm={objectifForm} setEditForm={setObjectifForm}
                          objectifError={objectifError} objectifSaving={objectifSaving}
                          onStartEdit={() => startEditObjectif(o)} onSave={saveObjectif}
                          onCancel={cancelObjectif} onDelete={() => deleteObjectif(o.id)} />
                      ))}
                    </div>
                  </div>
                )}
                {objectifs.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-dim)", fontSize: 13, fontFamily: "var(--font-geist)" }}>
                    {isLoggedIn ? "Aucun objectif. Crée ton premier objectif !" : "Aucun objectif défini."}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {tab === "preferences" && (
          <div>
            <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "20px 24px" }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", margin: "0 0 6px", fontFamily: "var(--font-geist)" }}>Champ de temps affiché</p>
              <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "0 0 16px", fontFamily: "var(--font-geist)" }}>
                Choisit le champ utilisé pour la durée dans toute l'application Strava.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                {([
                  { value: "moving_time", label: "Durée de déplacement", desc: "Temps passé en mouvement, sans les pauses." },
                  { value: "elapsed_time", label: "Temps écoulé", desc: "Temps total depuis le départ jusqu'à l'arrivée, pauses incluses." },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={isLoggedIn ? () => saveTimeField(opt.value) : undefined}
                    disabled={!isLoggedIn || prefSaving}
                    style={{
                      flex: 1, padding: "14px 16px", borderRadius: 8, textAlign: "left", cursor: isLoggedIn ? "pointer" : "not-allowed",
                      border: timeField === opt.value ? "0.5px solid rgba(245,166,35,0.4)" : "0.5px solid var(--border-2)",
                      background: timeField === opt.value ? "var(--accent-dim)" : "var(--surface-2)",
                      transition: "all 0.15s",
                    }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 500, color: timeField === opt.value ? "var(--accent)" : "var(--text-primary)", margin: "0 0 4px", fontFamily: "var(--font-geist)" }}>
                      {opt.label}
                      {timeField === opt.value && <span style={{ marginLeft: 8, fontSize: 10, color: "var(--accent)" }}>✓ Actif</span>}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--text-dim)", margin: 0, fontFamily: "var(--font-geist)" }}>{opt.desc}</p>
                  </button>
                ))}
              </div>
              {!isLoggedIn && <p style={{ fontSize: 11, color: "var(--text-dim)", margin: "12px 0 0", fontFamily: "var(--font-geist)" }}>Connexion requise pour modifier les préférences.</p>}
            </div>

            {/* Badge mis en avant */}
            <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "20px 24px", marginTop: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", margin: "0 0 6px", fontFamily: "var(--font-geist)" }}>Badge mis en avant</p>
              <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "0 0 16px", fontFamily: "var(--font-geist)" }}>
                Affiché dans ton profil sur la page Mes Courses.
              </p>
              {unlockedBadges.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-geist)" }}>
                  Aucun badge débloqué. <a href="/recompenses" style={{ color: "var(--accent)", textDecoration: "none" }}>Voir les badges →</a>
                </p>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 8, marginBottom: 12 }}>
                    {unlockedBadges.map(b => {
                      const isSelected = featuredBadge?.id === b.id;
                      return (
                        <button
                          key={b.id}
                          onClick={() => selectFeaturedBadge(isSelected ? null : b)}
                          style={{
                            position: "relative",
                            background: isSelected ? "rgba(245,166,35,0.15)" : "var(--surface-2)",
                            border: isSelected ? "1.5px solid rgba(245,166,35,0.75)" : "0.5px solid var(--border-2)",
                            borderRadius: 10,
                            padding: "12px 8px 10px",
                            cursor: "pointer",
                            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                            transform: isSelected ? "scale(1.06)" : "scale(1)",
                            boxShadow: isSelected
                              ? "0 0 0 3px rgba(245,166,35,0.18), 0 6px 20px rgba(0,0,0,0.45)"
                              : "none",
                            transition: "all 0.18s cubic-bezier(0.16,1,0.3,1)",
                          }}
                        >
                          {isSelected && (
                            <span style={{
                              position: "absolute", top: 4, right: 4,
                              width: 16, height: 16, borderRadius: "50%",
                              background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                                <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="#111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </span>
                          )}
                          <span style={{ fontSize: 24 }}>{b.emoji}</span>
                          <span style={{ fontSize: 10, color: isSelected ? "var(--accent)" : "var(--text-dim)", fontWeight: isSelected ? 600 : 400, fontFamily: "var(--font-geist)", textAlign: "center", lineHeight: 1.3, wordBreak: "break-word" }}>{b.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  {featuredBadge && (
                    <button onClick={() => selectFeaturedBadge(null)} style={{ ...btnSecondary, fontSize: 12, padding: "5px 12px" }}>
                      Retirer le badge mis en avant
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}