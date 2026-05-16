"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import ObjectifCarousel from "@/components/ObjectifCarousel";

// ─── interfaces ───────────────────────────────────────────────────────────────

interface Athlete {
  firstname: string; lastname: string; city: string; country: string;
  profile: string; follower_count: number; friend_count: number;
}
interface Activity {
  id: number; name: string; type: string; sport_type: string;
  distance: number; moving_time: number; elapsed_time: number;
  total_elevation_gain: number; start_date_local: string;
  average_speed: number; max_speed: number;
  average_heartrate?: number; max_heartrate?: number;
  suffer_score?: number; kudos_count: number;
  athlete_count?: number; description?: string; private_note?: string; athletes?: { firstname: string; lastname: string; id: number }[];
  map?: { summary_polyline: string };
}
interface Parcours { id: string; nom: string; distance_km: number | null; denivele_positif_m: number | null; }
interface Association { strava_activity_id: number; parcours_id: string | null; parcours: Parcours | null; }
interface Lap { lap_index: number; distance: number; moving_time: number; average_speed: number; }
interface CompagnonPacelab { id: string; nom: string; actif?: boolean; }
interface StravaCompagnon { strava_activity_id: number; compagnon_id: string; compagnon: { id: string; nom: string } | null; }
interface Objectif {
  id: string; titre: string; type: "duree" | "distance" | "sorties";
  valeur: number; periode: "hebdo" | "mensuel" | "annuel" | null;
  annee: number | null; date_debut: string | null; date_fin: string | null;
}
interface Stats {
  all_run_totals: { count: number; distance: number; moving_time: number; elevation_gain: number };
  ytd_run_totals: { count: number; distance: number; moving_time: number; elevation_gain: number };
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmt = {
  dist: (m: number) => (m / 1000).toFixed(2) + " km",
  distShort: (m: number) => (m / 1000).toFixed(1) + " km",
  time: (s: number) => {
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h${String(m).padStart(2, "0")}`;
    return `${m}m${String(s % 60).padStart(2, "0")}s`;
  },
  pace: (speed: number) => {
    if (!speed || speed === 0) return "—";
    const sec = 1000 / speed; const m = Math.floor(sec / 60); const s = Math.round(sec % 60);
    return `${m}'${String(s).padStart(2, "0")}"`;
  },
  date: (d: string) => new Date(d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
  dateShort: (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "2-digit" }),
  paceToSec: (speed: number) => speed > 0 ? 1000 / speed : 9999,
  secToPace: (sec: number) => `${Math.floor(sec / 60)}'${String(Math.round(sec % 60)).padStart(2, "0")}"`,
};

function isRun(a: Activity) { return ["Run", "TrailRun", "VirtualRun"].includes(a.sport_type); }

// ─── styles ───────────────────────────────────────────────────────────────────

const lbl: React.CSSProperties = { fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "var(--font-geist)", margin: "0 0 6px", display: "block" };
const card: React.CSSProperties = { background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "14px 16px" };

// ─── StreakCalendar ───────────────────────────────────────────────────────────

const PULSE = `@keyframes s-pulse{0%,100%{opacity:1}50%{opacity:.35}}`;

function isoDate(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function getMondayOf(d: Date) { const r=new Date(d); const day=r.getDay(); r.setDate(r.getDate()+(day===0?-6:1-day)); r.setHours(0,0,0,0); return r; }
function addDays(d: Date, n: number) { const r=new Date(d); r.setDate(r.getDate()+n); return r; }
function getISOWeek(d: Date) { const r=new Date(d); r.setHours(0,0,0,0); r.setDate(r.getDate()+3-((r.getDay()+6)%7)); const w=new Date(r.getFullYear(),0,4); return 1+Math.round(((r.getTime()-w.getTime())/86400000-3+((w.getDay()+6)%7))/7); }
function getISOYear(d: Date) { const r=new Date(d); r.setDate(r.getDate()+3-((r.getDay()+6)%7)); return r.getFullYear(); }

function StreakCal({ activities }: { activities: Activity[] }) {
  const runs = activities.filter(isRun);
  const today = new Date(); today.setHours(0,0,0,0);
  const dates = new Set(runs.map(a => a.start_date_local.split("T")[0]));
  function hasC(mon: Date) { for(let i=0;i<7;i++) if(dates.has(isoDate(addDays(mon,i)))) return true; return false; }
  const curMon = getMondayOf(today);
  const allD = runs.map(a => new Date(a.start_date_local)).sort((a,b) => a.getTime()-b.getTime());
  let streak=0, best=0;
  if(allD.length>0){
    let w=new Date(curMon); if(!hasC(w)&&today.getDay()!==1) w=addDays(w,-7);
    const first=getMondayOf(allD[0]);
    while(w>=first){ if(hasC(w)){streak++;w=addDays(w,-7);}else break; }
    let t=0,c=new Date(first);
    while(c<=curMon){ if(hasC(c)){t++;best=Math.max(best,t);}else t=0; c=addDays(c,7); }
  }
  const NB=20; const sems=[];
  let lastY=-1;
  for(let i=NB-1;i>=0;i--){
    const mon=addDays(curMon,-i*7); const wn=getISOWeek(mon); const yr=getISOYear(mon);
    const isNew=lastY!==-1&&yr!==lastY; lastY=yr;
    sems.push({mon,has:hasC(mon),cur:isoDate(mon)===isoDate(curMon),fut:mon>today,wn,yr,isNew});
  }
  return (
    <div className="card" style={{marginBottom:12}}>
      <style>{PULSE}</style>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:10}}>
        <div><p style={{...lbl,margin:"0 0 4px"}}>Régularité Strava</p><p style={{fontSize:11,color:"var(--text-dim)",margin:0,fontFamily:"var(--font-geist)"}}>20 dernières semaines</p></div>
        <div style={{display:"flex",gap:16}}>
          <div style={{textAlign:"right"}}><p style={{...lbl,margin:"0 0 2px"}}>Streak actuelle</p><div style={{display:"flex",alignItems:"baseline",gap:4}}><span style={{fontSize:26,fontWeight:500,color:streak>0?"#FC4C02":"var(--text-dim)",fontFamily:"var(--font-dm-mono)",lineHeight:1}}>{streak}</span><span style={{fontSize:11,color:"var(--text-dim)",fontFamily:"var(--font-geist)"}}>sem.</span>{streak>=4&&<span style={{fontSize:14}}>🔥</span>}</div></div>
          <div style={{textAlign:"right"}}><p style={{...lbl,margin:"0 0 2px"}}>Meilleure</p><div style={{display:"flex",alignItems:"baseline",gap:4}}><span style={{fontSize:26,fontWeight:500,color:"var(--text-muted)",fontFamily:"var(--font-dm-mono)",lineHeight:1}}>{best}</span><span style={{fontSize:11,color:"var(--text-dim)",fontFamily:"var(--font-geist)"}}>sem.</span></div></div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"flex-end",gap:4}}>
        {sems.map((s,i)=>{
          const active=s.has&&!s.fut; const pulse=s.cur&&!active&&!s.fut;
          let bg="#1a1a1a",border="0.5px solid #222",tc="#333";
          if(active){bg="#FC4C02";border="0.5px solid #c03a00";tc="rgba(255,255,255,.75)";}
          else if(s.cur){bg="transparent";border="0.5px solid #FC4C02";tc="#FC4C02";}
          return(
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center"}}>
              {s.isNew?<div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:3,width:"100%"}}><span style={{fontSize:8,color:"#666",fontFamily:"var(--font-dm-mono)"}}>{s.yr}</span><div style={{width:"100%",height:1,background:"#444",marginTop:1}}/></div>:<div style={{height:14}}/>}
              <div title={`S${s.wn} · ${s.mon.toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}`} style={{width:"100%",height:30,borderRadius:4,background:bg,border,outline:s.cur?"1.5px solid rgba(255,255,255,.2)":"none",outlineOffset:"2px",opacity:s.fut?.2:1,display:"flex",alignItems:"center",justifyContent:"center",animation:pulse?"s-pulse 1.8s ease-in-out infinite":"none"}}>
                <span style={{fontSize:8,fontWeight:500,color:tc,fontFamily:"var(--font-dm-mono)"}}>{s.wn}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Graphique évolution ──────────────────────────────────────────────────────

function EvolutionChart({ activities, associations, hoveredId, selectedId, onHover, onSelect, timeField, stravaCompagnons, compagnonsPacelab }: {
  activities: Activity[]; associations: Map<number, Parcours | null>;
  hoveredId: number | null; selectedId: number | null;
  onHover: (id: number | null) => void; onSelect: (id: number | null) => void;
  timeField: "moving_time" | "elapsed_time";
  stravaCompagnons: Map<number, CompagnonPacelab[]>;
  compagnonsPacelab: CompagnonPacelab[];
}) {
  const [mode, setMode] = useState<"temps" | "allure">("temps");
  const containerRef = useRef<HTMLDivElement>(null);

  const runs = [...activities].filter(isRun).reverse(); // chronologique
  if (runs.length < 2) return <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{fontSize:13,color:"var(--text-dim)",fontFamily:"var(--font-geist)"}}>Pas assez de données.</p></div>;

  function effectiveSpeed(a: Activity) {
    const p = associations.get(a.id);
    return p?.distance_km ? (p.distance_km * 1000) / a.moving_time : a.average_speed;
  }

  // Valeur à afficher selon le mode
  // En temps : moving_time (secondes) — plus court = meilleur = plus bas sur le graphe
  // En allure : secondes par km — plus petit = meilleur = plus bas sur le graphe
  function getValue(a: Activity): number {
    if (mode === "temps") return a.moving_time;
    return fmt.paceToSec(effectiveSpeed(a));
  }

  const data = runs.map((a) => ({
    id: a.id,
    date: fmt.dateShort(a.start_date_local),
    val: getValue(a),
    withGroup: (a.athlete_count ?? 1) > 1,
    description: a.description,
    private_note: (a as Activity & { private_note?: string }).private_note,
    speed: effectiveSpeed(a),
    moving_time: a.moving_time,
  }));

  const vals = data.map((d) => d.val);
  const minV = Math.min(...vals); const maxV = Math.max(...vals);
  const range = maxV - minV || 1;

  const prVal = Math.min(...vals);
  const prIdx = data.findIndex((d) => d.val === prVal);

  const W = 1000; const H = 180;
  const padL = 52; const padR = 12; const padT = 20; const padB = 30;

  function xOf(i: number) { return padL + (i / Math.max(data.length - 1, 1)) * (W - padL - padR); }
  // En mode temps : plus long = en haut (pire en haut, meilleur en bas = croissant visuellement)
  // En mode allure : plus lent = en haut (pire en haut, meilleur en bas)
  // Dans les deux cas : maxV en haut (y=padT), minV en bas (y=H-padB)
  function yOf(v: number) { return padT + ((maxV - v) / range) * (H - padT - padB); }

  // Ticks axe Y (5 ticks)
  const NB_TICKS = 5;
  const tickVals = Array.from({ length: NB_TICKS }, (_, i) => minV + (i / (NB_TICKS - 1)) * range);

  function formatYTick(v: number) {
    if (mode === "temps") {
      const h = Math.floor(v / 3600); const m = Math.floor((v % 3600) / 60);
      return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m}m`;
    }
    return fmt.secToPace(v);
  }

  // Ticks axe X (max 8 labels)
  const xStep = Math.max(1, Math.floor(data.length / 8));
  const xTicks = data.filter((_, i) => i % xStep === 0 || i === data.length - 1);

  const pathD = data.map((d, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(d.val).toFixed(1)}`).join(" ");
  const activeId = hoveredId ?? selectedId;
  const activePoint = data.find((d) => d.id === activeId);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left - (padL / W * rect.width);
    const chartW = rect.width * (W - padL - padR) / W;
    const idx = Math.round((relX / chartW) * (data.length - 1));
    const id = data[Math.max(0, Math.min(data.length - 1, idx))]?.id;
    if (id) onHover(id);
  }

  return (
    <div>
      {/* Toggle mode */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <p style={{...lbl,margin:0}}>Évolution</p>
        </div>
        <div style={{display:"flex",gap:4,background:"var(--surface-2)",border:"0.5px solid var(--border-2)",borderRadius:6,padding:3}}>
          {(["temps","allure"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{padding:"3px 10px",borderRadius:4,fontSize:11,border:"none",cursor:"pointer",fontFamily:"var(--font-geist)",background:mode===m?"#FC4C02":"transparent",color:mode===m?"#fff":"var(--text-dim)"}}>
              {m === "temps" ? "Temps" : "Allure"}
            </button>
          ))}
        </div>
      </div>

      {/* Tooltip — espace constant pour éviter le tremblotement */}
      <div style={{height:32,marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{display:"flex",alignItems:"center",gap:8,padding:"0 12px",background:"rgba(40,40,40,0.85)",borderRadius:8,border:"0.5px solid #2a2a2a",height:28,width:"fit-content"}}>
        {activePoint ? (
          <>
            <span style={{fontSize:11,color:"#888",fontFamily:"var(--font-geist)"}}>{activePoint.date}</span>
            <span style={{fontSize:14,fontWeight:500,color:"#e8e8e8",fontFamily:"var(--font-dm-mono)"}}>
              {mode === "temps" ? fmt.time(activePoint.moving_time) : fmt.pace(activePoint.speed)}
            </span>
            {activePoint.val === prVal && <span style={{fontSize:10,background:"rgba(252,76,2,.15)",border:"0.5px solid #FC4C02",borderRadius:4,padding:"1px 5px",color:"#FC4C02",fontFamily:"var(--font-geist)"}}>PR</span>}

          </>
        ) : <span style={{fontSize:11,color:"#333",fontFamily:"var(--font-geist)"}}>Survoler un point pour afficher les détails</span>}
      </div></div>

      {/* SVG */}
      <div style={{position:"relative"}}>
        <div ref={containerRef} onMouseMove={handleMouseMove} onMouseLeave={()=>onHover(null)}
          onClick={(e)=>{
            if(!containerRef.current) return;
            const rect=containerRef.current.getBoundingClientRect();
            const relX=e.clientX-rect.left-(padL/W*rect.width);
            const chartW=rect.width*(W-padL-padR)/W;
            const idx=Math.round((relX/chartW)*(data.length-1));
            const id=data[Math.max(0,Math.min(data.length-1,idx))]?.id;
            if(id) onSelect(selectedId===id?null:id);
          }}
          style={{position:"absolute",inset:0,zIndex:5,cursor:"crosshair"}}/>
        <svg width="100%" viewBox={`0 0 ${W} ${H+padB}`} style={{display:"block"}}>
          {/* Grille Y */}
          {tickVals.map((v,i)=>(
            <g key={i}>
              <line x1={padL} y1={yOf(v)} x2={W-padR} y2={yOf(v)} stroke="#1e1e1e" strokeWidth={1}/>
              <text x={padL-6} y={yOf(v)+4} textAnchor="end" fontSize={9} fill="#555" fontFamily="var(--font-dm-mono)">{formatYTick(v)}</text>
            </g>
          ))}
          {/* Axe X labels */}
          {xTicks.map((d)=>{
            const i = data.findIndex(x => x.id === d.id);
            return <text key={d.id} x={xOf(i)} y={H+padB-4} textAnchor="middle" fontSize={9} fill="#555" fontFamily="var(--font-geist)">{d.date}</text>;
          })}
          {/* Ligne PR */}
          <line x1={padL} y1={yOf(prVal)} x2={W-padR} y2={yOf(prVal)} stroke="#FC4C02" strokeWidth={1} strokeDasharray="4 3"/>
          <text x={padL+4} y={yOf(prVal)-4} fontSize={9} fill="#FC4C02" fontFamily="var(--font-geist)">PR</text>
          {/* Courbe */}
          <path d={pathD} fill="none" stroke="#FC4C02" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
          {/* Points */}
          {data.map((d,i)=>{
            const isActive=d.id===activeId; const isPR=i===prIdx;
            // Couleur selon le compagnon dominant — même palette que les badges
            const comps=stravaCompagnons.get(d.id)??[];
            const COMP_COLORS=["#1d9e75","#3d8fe0","#b06de0","#e09030","#c0a030","#8060e0","#e05050","#1db8b8","#e060a0","#80c030","#d0d030","#30b8a0","#a040d0","#d07020","#10c870","#2070d0","#d02040","#50c888","#c06858","#6878d0"];
            // Trie les compagnons par nb d'activités pour avoir le même ordre que les badges
            const sortedComps=[...compagnonsPacelab].sort((a,b)=>{
              const na=runs.filter(r=>stravaCompagnons.get(r.id)?.some(c=>c.id===a.id)).length;
              const nb=runs.filter(r=>stravaCompagnons.get(r.id)?.some(c=>c.id===b.id)).length;
              return nb-na||a.nom.localeCompare(b.nom);
            });
            let ptColor="#555";
            if(comps.length>0){
              const dominated=comps.reduce((best,c)=>{
                const ia=sortedComps.findIndex(x=>x.id===c.id);
                const ib=sortedComps.findIndex(x=>x.id===best.id);
                return ia<ib?c:best;
              },comps[0]);
              const ci=sortedComps.findIndex(x=>x.id===dominated.id);
              ptColor=COMP_COLORS[ci%COMP_COLORS.length];
            } else if(isPR) ptColor="#FC4C02";
            const r=isActive?6:comps.length>0?4:isPR?5:3;
            return(
              <circle key={d.id} cx={xOf(i)} cy={yOf(d.val)} r={r}
                fill={isActive?"#fff":ptColor}
                stroke={isActive||d.id===selectedId?"#FC4C02":"none"}
                strokeWidth={isActive||d.id===selectedId?2:0}/>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── MultiPillFilter ──────────────────────────────────────────────────────────

function MultiPill({ options, values, onChange }: {
  options:{value:string;label:string}[]; values:string[]; onChange:(v:string[])=>void;
}) {
  function toggle(v: string) {
    if(v==="tout"){onChange(["tout"]);return;}
    const without=values.filter(x=>x!=="tout");
    if(without.includes(v)){const n=without.filter(x=>x!==v);onChange(n.length===0?["tout"]:n);}
    else onChange([...without,v]);
  }
  return(
    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
      {options.map(o=>{
        const active=values.includes(o.value)||(o.value==="tout"&&values.includes("tout"));
        return<button key={o.value} onClick={()=>toggle(o.value)} style={{padding:"5px 12px",borderRadius:20,fontSize:12,border:active?"0.5px solid #FC4C02":"0.5px solid var(--border-2)",background:active?"rgba(252,76,2,0.12)":"transparent",color:active?"#FC4C02":"var(--text-dim)",cursor:"pointer",fontFamily:"var(--font-geist)",transition:"all .15s",whiteSpace:"nowrap"}}>{o.label}</button>;
      })}
    </div>
  );
}

// ─── Modal association ────────────────────────────────────────────────────────

function AssocModal({ activity, parcoursList, current, onSave, onRemove, onClose }: {
  activity:Activity; parcoursList:Parcours[]; current:Parcours|null;
  onSave:(id:string)=>Promise<void>; onRemove:()=>Promise<void>; onClose:()=>void;
}) {
  const [sel,setSel]=useState(current?.id??""); const [saving,setSaving]=useState(false);
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,zIndex:100,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:"#161616",border:"0.5px solid var(--border)",borderRadius:12,padding:28,width:"100%",maxWidth:460}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div><p style={{...lbl,margin:"0 0 2px"}}>Association parcours</p><h2 style={{fontSize:15,fontWeight:500,color:"#fff",margin:0,fontFamily:"var(--font-geist)"}}>{activity.name}</h2></div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:"var(--text-dim)",fontSize:18,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:18}}>
          {parcoursList.map(p=>(
            <button key={p.id} onClick={()=>setSel(p.id)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 13px",borderRadius:7,cursor:"pointer",border:sel===p.id?"0.5px solid #FC4C02":"0.5px solid var(--border-2)",background:sel===p.id?"rgba(252,76,2,.08)":"var(--surface-2)",transition:"all .15s"}}>
              <span style={{fontSize:13,color:sel===p.id?"#FC4C02":"var(--text-primary)",fontFamily:"var(--font-geist)"}}>{p.nom}</span>
              <div style={{display:"flex",gap:8}}>
                {p.distance_km&&<span style={{fontSize:11,color:sel===p.id?"#FC4C02":"var(--text-dim)",fontFamily:"var(--font-dm-mono)"}}>📍 {p.distance_km} km</span>}
                {p.denivele_positif_m&&<span style={{fontSize:11,color:sel===p.id?"#FC4C02":"var(--text-dim)",fontFamily:"var(--font-dm-mono)"}}>⛰ +{p.denivele_positif_m}m</span>}
              </div>
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={async()=>{if(!sel)return;setSaving(true);await onSave(sel);setSaving(false);}} disabled={saving||!sel} style={{flex:1,background:sel?"#FC4C02":"#2a2a2a",color:sel?"#fff":"#555",border:"none",borderRadius:7,padding:"9px",fontSize:13,fontWeight:500,cursor:sel?"pointer":"not-allowed",fontFamily:"var(--font-geist)"}}>{saving?"...":"Associer"}</button>
          {current&&<button onClick={async()=>{setSaving(true);await onRemove();setSaving(false);}} disabled={saving} style={{background:"transparent",color:"#664040",border:"0.5px solid #3a2a2a",borderRadius:7,padding:"9px 14px",fontSize:13,cursor:"pointer",fontFamily:"var(--font-geist)"}}>Retirer</button>}
          <button onClick={onClose} style={{background:"transparent",color:"var(--text-dim)",border:"0.5px solid var(--border-2)",borderRadius:7,padding:"9px 14px",fontSize:13,cursor:"pointer",fontFamily:"var(--font-geist)"}}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

// ─── ActivityRow ──────────────────────────────────────────────────────────────

function ActivityRow({ a, p, isLoggedIn, isHov, isSel, onHov, onClick, onAssoc, timeField, compagnons, allCompagnons, onAddCompagnon, onRemoveCompagnon }: {
  a:Activity; p:Parcours|null; isLoggedIn:boolean; isHov:boolean; isSel:boolean;
  onHov:(id:number|null)=>void; onClick:()=>void; onAssoc:()=>void; timeField:"moving_time"|"elapsed_time";
  compagnons:CompagnonPacelab[]; allCompagnons:CompagnonPacelab[];
  onAddCompagnon:(c:CompagnonPacelab)=>void; onRemoveCompagnon:(id:string)=>void;
}) {
  const run=isRun(a); const isAct=isHov||isSel;
  const isGroupe = (a.athlete_count??1)>1 || compagnons.length>0;
  const distM=p?.distance_km?p.distance_km*1000:a.distance;
  const elev=p?.denivele_positif_m??a.total_elevation_gain;
  const speed=p?.distance_km?(p.distance_km*1000)/a.moving_time:a.average_speed;
  return(
    <>
      <tr onMouseEnter={()=>onHov(a.id)} onMouseLeave={()=>onHov(null)} onClick={onClick}
        style={{borderBottom:"0.5px solid #1a1a1a",background:isAct?"var(--surface-2)":"transparent",cursor:"pointer",transition:"background .1s"}}>
        <td style={{padding:"10px 12px",borderLeft:isAct?"2px solid #FC4C02":"2px solid transparent"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:13}}>{run?"🏃":"🎒"}</span>
            <div>
              <p style={{fontSize:13,fontWeight:500,color:"var(--text-primary)",margin:0,fontFamily:"var(--font-geist)"}}>{a.name}</p>
              <p style={{fontSize:11,color:"var(--text-dim)",margin:"2px 0 0",fontFamily:"var(--font-geist)"}}>{fmt.date(a.start_date_local)}</p>
            </div>
            {isGroupe&&<span style={{fontSize:11}}>👥</span>}
          </div>
        </td>
        <td style={{padding:"10px 12px",fontSize:13,color:"var(--text-primary)",fontFamily:"var(--font-dm-mono)"}}>{fmt.dist(distM)}{p?.distance_km&&<span style={{fontSize:9,color:"#FC4C02",marginLeft:3}}>★</span>}</td>
        <td style={{padding:"10px 12px",fontSize:13,color:"var(--text-primary)",fontFamily:"var(--font-dm-mono)"}}>{fmt.time(timeField==="elapsed_time"?a.elapsed_time:a.moving_time)}</td>
        <td style={{padding:"10px 12px",fontSize:13,color:"var(--text-dim)",fontFamily:"var(--font-dm-mono)"}}>{run?fmt.pace(speed):"—"}</td>
        <td style={{padding:"10px 12px",fontSize:13,color:"var(--text-dim)",fontFamily:"var(--font-dm-mono)"}}>{elev>0?`+${Math.round(elev)}m`:"—"}{p?.denivele_positif_m&&<span style={{fontSize:9,color:"#FC4C02",marginLeft:3}}>★</span>}</td>
        <td style={{padding:"10px 12px",fontSize:13,color:"var(--text-dim)",fontFamily:"var(--font-dm-mono)"}}>{a.average_heartrate?`${Math.round(a.average_heartrate)} bpm`:"—"}</td>
        <td style={{padding:"10px 12px"}}>
          {p?(
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:11,background:"rgba(252,76,2,.1)",border:"0.5px solid rgba(252,76,2,.3)",borderRadius:5,padding:"2px 8px",color:"#FC4C02",fontFamily:"var(--font-geist)",whiteSpace:"nowrap"}}>{p.nom}</span>
              {isLoggedIn&&<button onClick={e=>{e.stopPropagation();onAssoc();}} style={{background:"transparent",border:"none",color:"var(--text-dim)",cursor:"pointer",fontSize:11,padding:"2px 4px"}}>✎</button>}
            </div>
          ):isLoggedIn?(
            <button onClick={e=>{e.stopPropagation();onAssoc();}} style={{background:"transparent",border:"0.5px solid var(--border-2)",borderRadius:5,padding:"3px 8px",fontSize:11,color:"var(--text-dim)",cursor:"pointer",fontFamily:"var(--font-geist)",whiteSpace:"nowrap"}}>+ Parcours</button>
          ):<span style={{fontSize:11,color:"#2a2a2a"}}>—</span>}
        </td>
        <td style={{padding:"10px 12px"}} onClick={e=>e.stopPropagation()}>
          {compagnons.length > 0 ? (
            <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
              {compagnons.map(c=><span key={c.id} style={{fontSize:11,background:"#0f2a1e",border:"0.5px solid #1a4a30",borderRadius:5,padding:"2px 7px",color:"#1d9e75",fontFamily:"var(--font-geist)"}}>{c.nom}</span>)}
              {isLoggedIn&&<button onClick={e=>{e.stopPropagation();onClick();}} title="Modifier les compagnons" style={{background:"transparent",border:"none",color:"var(--text-dim)",cursor:"pointer",fontSize:12,padding:"1px 4px"}}>✎</button>}
            </div>
          ) : isLoggedIn ? (
            <button onClick={e=>{e.stopPropagation();onClick();}} style={{background:"transparent",border:"0.5px solid var(--border-2)",borderRadius:5,padding:"3px 7px",fontSize:11,color:"var(--text-dim)",cursor:"pointer",fontFamily:"var(--font-geist)"}}>+</button>
          ) : <span style={{fontSize:11,color:"#2a2a2a"}}>—</span>}
        </td>
      </tr>
      {isSel&&(
        <tr style={{background:"var(--surface-2)",borderBottom:"0.5px solid #1a1a1a"}}>
          <td colSpan={8} style={{padding:"10px 14px",borderLeft:"2px solid #FC4C02"}}>
            {/* Compagnons dans le panel expandé */}
            <div style={{marginBottom:8}}>
              <p style={{fontSize:10,color:"var(--text-dim)",letterSpacing:".05em",textTransform:"uppercase",fontFamily:"var(--font-geist)",margin:"0 0 8px"}}>Compagnons</p>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                {compagnons.map(c=>(
                  <span key={c.id} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,background:"#0f2a1e",border:"0.5px solid #1a4a30",borderRadius:5,padding:"3px 10px",color:"#1d9e75",fontFamily:"var(--font-geist)"}}>
                    {c.nom}
                    {isLoggedIn&&<button onClick={e=>{e.stopPropagation();onRemoveCompagnon(c.id);}} style={{background:"transparent",border:"none",color:"#1a4a30",cursor:"pointer",fontSize:12,padding:0,lineHeight:1,marginLeft:2}}>✕</button>}
                  </span>
                ))}
                {isLoggedIn&&allCompagnons.filter(c=>c.actif&&!compagnons.find(x=>x.id===c.id)).map(c=>(
                  <button key={c.id} onClick={e=>{e.stopPropagation();onAddCompagnon(c);}}
                    style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,background:"var(--surface-2)",border:"0.5px solid var(--border-2)",borderRadius:5,padding:"3px 10px",color:"var(--text-dim)",cursor:"pointer",fontFamily:"var(--font-geist)"}}>
                    + {c.nom}
                  </button>
                ))}
                {compagnons.length===0&&!isLoggedIn&&<span style={{fontSize:11,color:"#333",fontFamily:"var(--font-geist)"}}>Aucun compagnon associé</span>}
              </div>
            </div>
            {/* Note privée */}
            {(a.private_note||a.description)&&(
              <p style={{fontSize:12,color:"var(--text-dim)",fontFamily:"var(--font-geist)",fontStyle:"italic",margin:0,paddingTop:8,borderTop:"0.5px solid #1a1a1a"}}>{(a as Activity & {private_note?:string}).private_note||a.description}</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Analyse allure ───────────────────────────────────────────────────────────

function AnalyseAllure({ activities }: { activities: Activity[] }) {
  const runs=activities.filter(isRun);
  const groupes:Record<string,Activity[]>={};
  runs.forEach(a=>{const k=a.name.trim();if(!groupes[k])groupes[k]=[];groupes[k].push(a);});
  const filtres=Object.entries(groupes).filter(([,acts])=>acts.length>=2).sort((a,b)=>b[1].length-a[1].length);
  const [sel,setSel]=useState(filtres[0]?.[0]??"");
  const [laps,setLaps]=useState<Record<number,Lap[]>>({});
  const [loading,setLoading]=useState(false);
  useEffect(()=>{if(!sel&&filtres.length>0)setSel(filtres[0][0]);},[filtres.length]);
  useEffect(()=>{
    if(!sel)return;
    const toLoad=(groupes[sel]??[]).filter(a=>!laps[a.id]);
    if(!toLoad.length)return;
    setLoading(true);
    Promise.all(toLoad.map(a=>fetch(`/api/strava/laps?id=${a.id}`).then(r=>r.ok?r.json():[]).then(l=>({id:a.id,laps:l}))))
      .then(results=>{const nd={...laps};results.forEach(({id,laps:l})=>{nd[id]=l;});setLaps(nd);setLoading(false);});
  },[sel]);
  if(!filtres.length) return<div style={{textAlign:"center",padding:"24px 0",color:"var(--text-dim)",fontSize:13,fontFamily:"var(--font-geist)"}}>Pas assez d'activités avec le même nom pour comparer.</div>;
  const acts=(groupes[sel]??[]).slice().sort((a,b)=>new Date(b.start_date_local).getTime()-new Date(a.start_date_local).getTime());
  const maxKm=Math.max(...acts.map(a=>(laps[a.id]??[]).length));
  const best=Array.from({length:maxKm},(_,i)=>{const p=acts.map(a=>{const l=(laps[a.id]??[])[i];return l&&l.average_speed>0?1000/l.average_speed:Infinity;}).filter(p=>p<Infinity);return p.length>0?Math.min(...p):0;});
  return(
    <div style={{...card,marginTop:12}}>
      <p style={{...lbl,margin:"0 0 12px"}}>Analyse allure km par km</p>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        {filtres.map(([nom,acts])=><button key={nom} onClick={()=>setSel(nom)} style={{padding:"5px 12px",borderRadius:20,fontSize:12,border:sel===nom?"0.5px solid #FC4C02":"0.5px solid var(--border-2)",background:sel===nom?"rgba(252,76,2,.12)":"transparent",color:sel===nom?"#FC4C02":"var(--text-dim)",cursor:"pointer",fontFamily:"var(--font-geist)"}}>{nom} <span style={{opacity:.6}}>({acts.length})</span></button>)}
      </div>
      {loading?<div style={{textAlign:"center",padding:"20px 0",color:"var(--text-dim)",fontSize:13}}>Chargement des splits...</div>:(
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:400}}>
            <thead><tr style={{borderBottom:"0.5px solid #1a1a1a"}}>
              <th style={{padding:"6px 12px",textAlign:"left",fontSize:10,color:"var(--text-dim)",fontWeight:400,letterSpacing:".05em",textTransform:"uppercase",fontFamily:"var(--font-geist)",whiteSpace:"nowrap"}}>Date</th>
              {Array.from({length:maxKm},(_,i)=><th key={i} style={{padding:"6px 10px",textAlign:"center",fontSize:10,color:"var(--text-dim)",fontWeight:400,fontFamily:"var(--font-geist)"}}>km {i+1}</th>)}
            </tr></thead>
            <tbody>
              {acts.map(a=>{
                const l=laps[a.id]??[];
                return<tr key={a.id} style={{borderBottom:"0.5px solid #1a1a1a"}}>
                  <td style={{padding:"8px 12px",fontSize:12,color:"var(--text-dim)",fontFamily:"var(--font-geist)",whiteSpace:"nowrap"}}>{fmt.dateShort(a.start_date_local)}</td>
                  {Array.from({length:maxKm},(_,i)=>{
                    const lap=l[i];
                    if(!lap)return<td key={i} style={{padding:"8px 10px",textAlign:"center"}}><span style={{fontSize:11,color:"#2a2a2a"}}>—</span></td>;
                    const pace=lap.average_speed>0?1000/lap.average_speed:9999;
                    const isBest=best[i]>0&&Math.abs(pace-best[i])<2;
                    return<td key={i} style={{padding:"8px 10px",textAlign:"center"}}><span style={{fontSize:12,fontFamily:"var(--font-dm-mono)",color:isBest?"#FC4C02":"var(--text-muted)",fontWeight:isBest?500:400}}>{fmt.pace(lap.average_speed)}</span></td>;
                  })}
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      )}
      <p style={{fontSize:11,color:"var(--text-dim)",margin:"8px 0 0",fontFamily:"var(--font-geist)"}}>En orange : meilleure allure sur ce km.</p>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function StravaPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [data, setData] = useState<{ activities: Activity[]; athlete: Athlete | null; stats: Stats | null; lastSync?: string | null } | null>(null);
  const [parcoursList, setParcoursList] = useState<Parcours[]>([]);
  const [associations, setAssociations] = useState<Map<number, Parcours | null>>(new Map());
  const [objectifs, setObjectifs] = useState<Objectif[]>([]);
  const [modalActivity, setModalActivity] = useState<Activity | null>(null);
  const [filterAnnee, setFilterAnnee] = useState<string[]>([String(new Date().getFullYear())]);
  const [filterParcours, setFilterParcours] = useState<string[]>(["tout"]);
  const [filterGroupe, setFilterGroupe] = useState<string>("tout");
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [timeField, setTimeField] = useState<"moving_time" | "elapsed_time">("moving_time");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [compagnonsPacelab, setCompagnonsPacelab] = useState<CompagnonPacelab[]>([]);
  // Map strava_activity_id -> liste de compagnons associés
  const [stravaCompagnons, setStravaCompagnons] = useState<Map<number, CompagnonPacelab[]>>(new Map());

  async function loadData() {
    const { createClient } = await import("@/lib/supabase");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setIsLoggedIn(true);

    // Lit depuis le cache (GET)
    const res = await fetch("/api/strava/activities");
    if (res.ok) {
      const json = await res.json();
      if (json.lastSync) setLastSync(json.lastSync);
      // Si le cache est vide, déclenche une sync automatique
      if (!json.activities?.length && user) {
        await syncFromStrava();
        return;
      }
      setData(json);
      setConnected(true);

      if (user) {
        const [{ data: parc }, { data: obj }, { data: comps }] = await Promise.all([
          supabase.from("parcours").select("id, nom, distance_km, denivele_positif_m").eq("actif", true).eq("user_id", user.id).order("nom"),
          supabase.from("objectifs").select("*").eq("actif", true).eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("compagnons").select("id, nom, actif").eq("user_id", user.id).order("nom"),
        ]);
        setCompagnonsPacelab(comps || []);

        // Charge les associations strava_compagnons
        const scRes = await fetch("/api/strava/compagnons");
        const scData: StravaCompagnon[] = scRes.ok ? await scRes.json() : [];
        const scMap = new Map<number, CompagnonPacelab[]>();
        scData.forEach((sc) => {
          const id = Number(sc.strava_activity_id);
          if (!scMap.has(id)) scMap.set(id, []);
          if (sc.compagnon) scMap.get(id)!.push(sc.compagnon);
        });
        setStravaCompagnons(scMap);
        const parcoursBDD: Parcours[] = parc || [];
        setParcoursList(parcoursBDD);
        setObjectifs(obj || []);

        const assocRes = await fetch("/api/strava/associations");
        const assocData: Association[] = assocRes.ok ? await assocRes.json() : [];
        const assocMap = new Map<number, Parcours | null>();
        assocData.forEach((a) => { assocMap.set(Number(a.strava_activity_id), a.parcours); });
        const activities: Activity[] = json.activities ?? [];
        activities.forEach((act) => {
          if (!assocMap.has(act.id)) {
            const match = parcoursBDD.find((p) => p.nom.toLowerCase() === act.name.trim().toLowerCase());
            if (match) assocMap.set(act.id, match);
          }
        });
        setAssociations(assocMap);
      }
    }
    // Charge la préférence moving/elapsed
    const { createClient: cc } = await import("@/lib/supabase");
    const sb2 = cc();
    const { data: { user: u2 } } = await sb2.auth.getUser();
    if (u2) {
      const { data: prefs } = await sb2.from("user_preferences").select("time_field").eq("user_id", u2.id).single();
      if (prefs?.time_field) setTimeField(prefs.time_field as "moving_time" | "elapsed_time");
    }
    setLoading(false);
  }

  async function syncFromStrava() {
    setSyncing(true);
    const res = await fetch("/api/strava/activities", { method: "POST" });
    if (res.ok) {
      const json = await res.json();
      setData(json);
      setConnected(true);
      // Mise à jour immédiate de la date — ne pas appeler loadData() qui écraserait avec l'ancienne date du cache
      const syncDate = json.lastSync ?? new Date().toISOString();
      setLastSync(syncDate);
    }
    setSyncing(false);
  }

  useEffect(() => { loadData(); }, []);

  async function handleConnect() {
    const res = await fetch("/api/strava/auth");
    const { url } = await res.json();
    window.location.href = url;
  }

  async function addStravaCompagnon(activityId: number, compagnon: CompagnonPacelab) {
    await fetch("/api/strava/compagnons", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strava_activity_id: activityId, compagnon_id: compagnon.id }),
    });
    setStravaCompagnons((prev) => {
      const next = new Map(prev);
      const existing = next.get(activityId) ?? [];
      if (!existing.find(c => c.id === compagnon.id)) next.set(activityId, [...existing, compagnon]);
      return next;
    });
  }

  async function removeStravaCompagnon(activityId: number, compagnonId: string) {
    await fetch(`/api/strava/compagnons?activity_id=${activityId}&compagnon_id=${compagnonId}`, { method: "DELETE" });
    setStravaCompagnons((prev) => {
      const next = new Map(prev);
      next.set(activityId, (next.get(activityId) ?? []).filter(c => c.id !== compagnonId));
      return next;
    });
  }

  async function handleSaveAssoc(parcoursId: string) {
    if (!modalActivity) return;
    await fetch("/api/strava/associations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ strava_activity_id: modalActivity.id, parcours_id: parcoursId }) });
    const p = parcoursList.find((p) => p.id === parcoursId) ?? null;
    setAssociations((prev) => new Map(prev).set(modalActivity.id, p));
    setModalActivity(null);
  }

  async function handleRemoveAssoc() {
    if (!modalActivity) return;
    await fetch("/api/strava/associations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ strava_activity_id: modalActivity.id, parcours_id: null }) });
    setAssociations((prev) => new Map(prev).set(modalActivity.id, null));
    setModalActivity(null);
  }

  const activities = data?.activities ?? [];
  const runs = activities.filter(isRun);
  const ytd = data?.stats?.ytd_run_totals;
  const all = data?.stats?.all_run_totals;

  const annees = Array.from(new Set(runs.map((a) => a.start_date_local.substring(0, 4)))).sort((a, b) => b.localeCompare(a));
  const anneeOptions = [{ value: "tout", label: "Tout" }, ...annees.map((a) => ({ value: a, label: a }))];

  const parcoursNoms = Array.from(new Set(runs.map((a) => associations.get(a.id)?.nom ?? null).filter(Boolean) as string[])).sort();
  const parcoursOptions = [
    { value: "tout", label: "Tous" },
    ...parcoursNoms.map((n) => ({ value: n, label: n })),
    { value: "__ind__", label: "Parcours indéfini" },
  ];

  const filtered = runs.filter((a) => {
    const isAAll = filterAnnee.includes("tout");
    if (!isAAll && !filterAnnee.filter(v => v !== "tout").some(an => a.start_date_local.startsWith(an))) return false;
    const isPAll = filterParcours.includes("tout");
    if (!isPAll) {
      const p = associations.get(a.id);
      const selP = filterParcours.filter(v => v !== "tout" && v !== "__ind__");
      const wantInd = filterParcours.includes("__ind__");
      if (!((selP.length > 0 && p && selP.includes(p.nom)) || (wantInd && !p))) return false;
    }
    const aIsGroupe = (a.athlete_count ?? 1) > 1 || (stravaCompagnons.get(a.id)?.length ?? 0) > 0;
    if (filterGroupe === "solo" && aIsGroupe) return false;
    if (filterGroupe === "groupe" && !aIsGroupe) return false;
    if (filterGroupe.startsWith("comp_")) {
      const compId = filterGroupe.replace("comp_", "");
      if (!stravaCompagnons.get(a.id)?.some(c => c.id === compId)) return false;
    }
    return true;
  });

  const hasFilters = !filterAnnee.includes("tout") || !filterParcours.includes("tout") || filterGroupe !== "tout";
  const totalSec = filtered.reduce((s, a) => s + (timeField === "elapsed_time" ? a.elapsed_time : a.moving_time), 0);
  const totalKm = filtered.reduce((s, a) => { const p = associations.get(a.id); return s + (p?.distance_km ?? a.distance / 1000); }, 0);
  const avgSec = filtered.length > 0 ? Math.round(totalSec / filtered.length) : 0; // totalSec déjà calculé avec timeField

  // coursesSummary pour les filtres (affect stats filtrées uniquement)
  const coursesSummary = filtered.map((a) => {
    const p = associations.get(a.id);
    return { date_course: a.start_date_local.split("T")[0], duree_secondes: timeField === "elapsed_time" ? a.elapsed_time : a.moving_time, parcours_distance_km: p?.distance_km ?? (a.distance > 0 ? a.distance / 1000 : null) };
  });
  // allRunsSummary pour l'objectif — indépendant des filtres
  const allRunsSummary = runs.map((a) => {
    const p = associations.get(a.id);
    return { date_course: a.start_date_local.split("T")[0], duree_secondes: timeField === "elapsed_time" ? a.elapsed_time : a.moving_time, parcours_distance_km: p?.distance_km ?? (a.distance > 0 ? a.distance / 1000 : null) };
  });

  const lastSyncStr = lastSync ? new Date(lastSync).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <div style={{ minHeight: "100vh" }}>
      <Navbar isLoggedIn={isLoggedIn} />
      {modalActivity && <AssocModal activity={modalActivity} parcoursList={parcoursList} current={associations.get(modalActivity.id) ?? null} onSave={handleSaveAssoc} onRemove={handleRemoveAssoc} onClose={() => setModalActivity(null)} />}

      <main style={{ padding: "24px", maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <p style={{ ...lbl, margin: "0 0 4px" }}>Intégration</p>
            <h1 style={{ fontSize: 22, fontWeight: 500, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
              Strava
            </h1>
          </div>
          {connected && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {lastSyncStr && <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-geist)" }}>Sync : {lastSyncStr}</span>}
              <button onClick={syncFromStrava} disabled={syncing} style={{ display: "flex", alignItems: "center", gap: 6, background: syncing ? "#2a2a2a" : "rgba(252,76,2,0.12)", border: "0.5px solid rgba(252,76,2,0.4)", borderRadius: 7, padding: "6px 14px", fontSize: 12, color: syncing ? "#555" : "#FC4C02", cursor: syncing ? "not-allowed" : "pointer", fontFamily: "var(--font-geist)" }}>
                <span style={{ fontSize: 14, display: "inline-block", animation: syncing ? "spin 1s linear infinite" : "none" }}>⟳</span>
                {syncing ? "Synchronisation..." : "Actualiser"}
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} /><span style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-geist)" }}>Connecté</span></div>
            </div>
          )}
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

        {error && <div style={{ background: "#2a0f0f", border: "0.5px solid #4a2020", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}><p style={{ fontSize: 13, color: "#e05050", margin: 0, fontFamily: "var(--font-geist)" }}>Connexion Strava refusée ou échouée.</p></div>}

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-dim)", fontSize: 13 }}>Chargement...</div>
        ) : !connected ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", textAlign: "center" }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="#FC4C02" style={{ marginBottom: 20 }}><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
            <p style={{ fontSize: 15, color: "var(--text-muted)", fontFamily: "var(--font-geist)", margin: "0 0 8px" }}>Connecte ton compte Strava</p>
            <p style={{ fontSize: 13, color: "var(--text-dim)", fontFamily: "var(--font-geist)", margin: "0 0 32px", maxWidth: 400 }}>Accède à toutes tes activités, tes stats globales et explore tes données de course.</p>
            {isLoggedIn
              ? <button onClick={handleConnect} style={{ display: "flex", alignItems: "center", gap: 10, background: "#FC4C02", color: "#fff", border: "none", borderRadius: 8, padding: "12px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-geist)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
                  Connecter Strava
                </button>
              : <p style={{ fontSize: 13, color: "var(--text-dim)", fontFamily: "var(--font-geist)" }}><a href="/login" style={{ color: "var(--coral)", textDecoration: "none" }}>Connecte-toi</a> pour lier ton compte Strava.</p>
            }
          </div>
        ) : (
          <>
            {/* Profil */}
            {data?.athlete && (
              <div style={{ display: "flex", alignItems: "center", gap: 16, ...card, marginBottom: 12 }}>
                {data.athlete.profile && <img src={data.athlete.profile} alt="avatar" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid #FC4C02" }} />}
                <div>
                  <p style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)", margin: "0 0 2px", fontFamily: "var(--font-geist)" }}>{data.athlete.firstname} {data.athlete.lastname}</p>
                  {data.athlete.city && <p style={{ fontSize: 12, color: "var(--text-dim)", margin: 0, fontFamily: "var(--font-geist)" }}>📍 {data.athlete.city}, {data.athlete.country}</p>}
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 20 }}>
                  <div style={{ textAlign: "center" }}><p style={{ fontSize: 16, fontWeight: 500, color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-dm-mono)" }}>{data.athlete.follower_count}</p><p style={{ fontSize: 10, color: "var(--text-dim)", margin: "2px 0 0", fontFamily: "var(--font-geist)" }}>abonnés</p></div>
                  <div style={{ textAlign: "center" }}><p style={{ fontSize: 16, fontWeight: 500, color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-dm-mono)" }}>{data.athlete.friend_count}</p><p style={{ fontSize: 10, color: "var(--text-dim)", margin: "2px 0 0", fontFamily: "var(--font-geist)" }}>abonnements</p></div>
                </div>
              </div>
            )}

            {/* Stats Cette Année + Tout temps + Objectif */}
            {data?.stats && (
            <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr", gap: 10, marginBottom: 12 }}>
              <div style={card}>
                <p style={{ ...lbl, color: "#FC4C02" }}>Cette année</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 16 }}>
                    {[{ l: "Sorties", v: ytd?.count ?? 0 }, { l: "Distance", v: fmt.distShort(ytd?.distance ?? 0) }, { l: "Temps", v: (() => { const yr = String(new Date().getFullYear()); const ytdRuns = runs.filter(a => a.start_date_local.startsWith(yr)); return fmt.time(ytdRuns.reduce((s,a)=>s+(timeField==="elapsed_time"?a.elapsed_time:a.moving_time),0)); })() }, { l: "Dénivelé", v: `+${Math.round(ytd?.elevation_gain ?? 0)}m` }].map(({ l, v }) => (
                      <div key={l}><p style={{ ...lbl, margin: "0 0 3px" }}>{l}</p><p style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-dm-mono)" }}>{v}</p></div>
                    ))}
                  </div>
                </div>
                <div style={card}>
                  <p style={lbl}>Tout temps</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    {[{ l: "Sorties", v: all?.count ?? 0 }, { l: "Distance", v: fmt.distShort(all?.distance ?? 0) }, { l: "Temps", v: fmt.time(runs.reduce((s,a)=>s+(timeField==="elapsed_time"?a.elapsed_time:a.moving_time),0)) }, { l: "Dénivelé", v: `+${Math.round(all?.elevation_gain ?? 0)}m` }].map(({ l, v }) => (
                      <div key={l}><p style={{ ...lbl, margin: "0 0 3px" }}>{l}</p><p style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-dm-mono)" }}>{v}</p></div>
                    ))}
                  </div>
                </div>
                <ObjectifCarousel objectifs={objectifs} courses={allRunsSummary} />
              </div>
            )}

            {/* Streak */}
            <StreakCal activities={runs} />



            {/* Bloc activités */}
            <div style={{ ...card, padding: 0, overflow: "hidden" }}>
              {/* Filtres */}
              <div style={{ padding: "16px 18px", borderBottom: "0.5px solid var(--border)", background: "#111" }}>
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                  <div><p style={{ ...lbl, margin: "0 0 8px" }}>Année</p><MultiPill options={anneeOptions} values={filterAnnee} onChange={v=>{setFilterAnnee(v);setSelectedId(null);setHoveredId(null);}}/></div>
                  {parcoursNoms.length > 0 && <div><p style={{ ...lbl, margin: "0 0 8px" }}>Parcours <span style={{ color: "#444", textTransform: "none", fontSize: 9 }}>multi-select</span></p><MultiPill options={parcoursOptions} values={filterParcours} onChange={v=>{setFilterParcours(v);setSelectedId(null);setHoveredId(null);}}/></div>}
                  <div>
                    <p style={{ ...lbl, margin: "0 0 8px" }}>Groupe</p>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {/* Tous + Solo */}
                      {([["tout","Tous"],["solo","Solo"]] as const).map(([v,label])=>(
                        <button key={v} onClick={()=>{setFilterGroupe(v);setSelectedId(null);setHoveredId(null);}} style={{padding:"5px 12px",borderRadius:20,fontSize:12,border:filterGroupe===v?"0.5px solid #FC4C02":"0.5px solid var(--border-2)",background:filterGroupe===v?"rgba(252,76,2,0.12)":"transparent",color:filterGroupe===v?"#FC4C02":"var(--text-dim)",cursor:"pointer",fontFamily:"var(--font-geist)",transition:"all .15s"}}>{label}</button>
                      ))}
                      {/* Filtre par compagnon (remplace "En groupe") */}
                      {compagnonsPacelab.filter(c => c.actif && runs.some(a => stravaCompagnons.get(a.id)?.some(sc => sc.id === c.id))).map(c => (
                        <button key={c.id} onClick={()=>{setFilterGroupe("comp_"+c.id);setSelectedId(null);setHoveredId(null);}} style={{padding:"5px 12px",borderRadius:20,fontSize:12,border:filterGroupe===("comp_"+c.id)?"0.5px solid #1d9e75":"0.5px solid var(--border-2)",background:filterGroupe===("comp_"+c.id)?"rgba(29,158,117,0.12)":"transparent",color:filterGroupe===("comp_"+c.id)?"#1d9e75":"var(--text-dim)",cursor:"pointer",fontFamily:"var(--font-geist)",transition:"all .15s"}}>{c.nom}</button>
                      ))}
                    </div>
                  </div>
                </div>
                {hasFilters && <button onClick={()=>{setFilterAnnee(["tout"]);setFilterParcours(["tout"]);setFilterGroupe("tout");setSelectedId(null);setHoveredId(null);}} style={{marginTop:12,background:"transparent",border:"none",color:"var(--text-dim)",fontSize:11,cursor:"pointer",fontFamily:"var(--font-geist)",padding:0,textDecoration:"underline",textDecorationColor:"#333"}}>Réinitialiser</button>}
              {/* Stats filtrées — compactes, sous les filtres */}
              <div style={{display:"flex",gap:24,flexWrap:"wrap",marginTop:14,paddingTop:14,borderTop:"0.5px solid var(--border)"}}>
                {[
                  {l:"Sorties",v:filtered.length},
                  {l:"Temps total",v:`${Math.floor(totalSec/3600)}h${String(Math.floor((totalSec%3600)/60)).padStart(2,"0")}`},
                  {l:"Distance",v:`${totalKm.toFixed(1)} km`},
                  {l:"Durée moy.",v:avgSec>0?fmt.time(avgSec):"—"},
                ].map(({l,v})=>(
                  <div key={l}>
                    <p style={{...lbl,margin:"0 0 2px"}}>{l}</p>
                    <p style={{fontSize:16,fontWeight:500,color:"var(--text-primary)",margin:0,fontFamily:"var(--font-dm-mono)"}}>{v}</p>
                  </div>
                ))}
              </div>
              </div>

              {/* Graphique */}
              {filtered.length >= 2 && (
                <div style={{ padding: "16px 18px", borderBottom: "0.5px solid var(--border)" }}>
                  <EvolutionChart activities={filtered} associations={associations} hoveredId={hoveredId} selectedId={selectedId} onHover={setHoveredId} onSelect={id=>setSelectedId(selectedId===id?null:id)} timeField={timeField} stravaCompagnons={stravaCompagnons} compagnonsPacelab={compagnonsPacelab}/>
                  {/* Note privée sous le graphique */}
                  <div style={{minHeight:32,marginTop:8}}>
                    {(() => {
                      const act = filtered.find(a => a.id === (hoveredId ?? selectedId));
                      const note = (act as (Activity & {private_note?:string}) | undefined)?.private_note || act?.description;
                      if (!note) return null;
                      return <p style={{fontSize:12,color:"var(--text-dim)",fontFamily:"var(--font-geist)",fontStyle:"italic",margin:0,padding:"6px 10px",background:"var(--surface-2)",borderRadius:6,borderLeft:"2px solid #FC4C02"}}>{note}</p>;
                    })()}
                  </div>
                  {/* Description sous graphique */}
                  <div style={{ minHeight: 24, marginTop: 6 }}>
                    {(() => {
                      const act = filtered.find(a => a.id === (hoveredId ?? selectedId));
                      if (!act?.description) return null;
                      return <p style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-geist)", fontStyle: "italic", margin: 0, padding: "6px 10px", background: "var(--surface-2)", borderRadius: 6, borderLeft: "2px solid #FC4C02" }}>{act.description}</p>;
                    })()}
                  </div>
                </div>
              )}

              {/* Header tableau */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 18px", borderBottom: "0.5px solid var(--border)", background: "#0e0e0e" }}>
                <p style={{ ...lbl, margin: 0 }}>{filtered.length} course{filtered.length!==1?"s":""} <span style={{color:"#444"}}>({runs.length} au total)</span></p>
                <span style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-geist)" }}>★ = données depuis le parcours associé</span>
              </div>

              {filtered.length === 0
                ? <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-dim)", fontSize: 13, fontFamily: "var(--font-geist)" }}>Aucune activité ne correspond aux filtres.</div>
                : <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr style={{ borderBottom: "0.5px solid #1a1a1a" }}>
                      {["Activité","Distance","Durée","Allure","D+","FC moy.","Parcours","Compagnons"].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:"var(--text-dim)",fontWeight:400,letterSpacing:".05em",textTransform:"uppercase",fontFamily:"var(--font-geist)"}}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {filtered.map(a=><ActivityRow key={a.id} a={a} p={associations.get(a.id)??null} isLoggedIn={isLoggedIn} isHov={hoveredId===a.id} isSel={selectedId===a.id} onHov={setHoveredId} onClick={()=>setSelectedId(selectedId===a.id?null:a.id)} onAssoc={()=>setModalActivity(a)} timeField={timeField} compagnons={stravaCompagnons.get(a.id)??[]} allCompagnons={compagnonsPacelab} onAddCompagnon={(c)=>addStravaCompagnon(a.id,c)} onRemoveCompagnon={(id)=>removeStravaCompagnon(a.id,id)}/>)}
                    </tbody>
                  </table>
              }
            </div>

            {/* Analyse allure */}
            <AnalyseAllure activities={filtered} />
          </>
        )}
      </main>
    </div>
  );
}