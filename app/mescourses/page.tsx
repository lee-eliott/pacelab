"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import ObjectifCarousel from "@/components/ObjectifCarousel";

// ─── interfaces ───────────────────────────────────────────────────────────────

interface Athlete {
  firstname: string; lastname: string; city: string; country: string;
  profile: string;
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

const lbl: React.CSSProperties = { fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "var(--font-geist)", margin: "0 0 6px", display: "block" };
const card: React.CSSProperties = { background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "14px 16px" };

// ─── StreakCalendar ───────────────────────────────────────────────────────────


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
    <div className="card bento-hover" style={{marginBottom:12}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:10}}>
        <div><p style={{...lbl,margin:"0 0 4px"}}>Régularité Strava</p><p style={{fontSize:11,color:"var(--text-dim)",margin:0,fontFamily:"var(--font-geist)"}}>20 dernières semaines</p></div>
        <div style={{display:"flex",gap:16}}>
          <div style={{textAlign:"right"}}><p style={{...lbl,margin:"0 0 2px"}}>Streak actuelle</p><div style={{display:"flex",alignItems:"baseline",gap:4}}><span style={{fontSize:26,fontWeight:500,color:streak>0?"#FC4C02":"var(--text-dim)",fontFamily:"var(--font-dm-mono)",lineHeight:1}}>{streak}</span><span style={{fontSize:11,color:"var(--text-dim)",fontFamily:"var(--font-geist)"}}>sem.</span>{streak>=4&&<svg width="20" height="20" viewBox="0 0 24 24" fill="#FC4C02" stroke="none" aria-label="streak active" style={{animation:"flame-flicker 1.2s ease-in-out infinite",filter:"drop-shadow(0 0 6px rgba(252,76,2,0.7))"}}><path d="M12 2C9.5 5.5 8 8 8 11a4 4 0 0 0 8 0c0-1.5-.5-3-2-5 0 2-1 3.5-2 4.5C11 9.5 12 7 12 2z"/></svg>}</div></div>
          <div style={{textAlign:"right"}}><p style={{...lbl,margin:"0 0 2px"}}>Meilleure</p><div style={{display:"flex",alignItems:"baseline",gap:4}}><span style={{fontSize:26,fontWeight:500,color:"var(--text-muted)",fontFamily:"var(--font-dm-mono)",lineHeight:1}}>{best}</span><span style={{fontSize:11,color:"var(--text-dim)",fontFamily:"var(--font-geist)"}}>sem.</span></div></div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"flex-end",gap:4}}>
        {sems.map((s,i)=>{
          const active=s.has&&!s.fut; const pulse=s.cur&&!active&&!s.fut&&streak>=1;
          let bg="var(--surface-2)",border="0.5px solid var(--border)",tc="var(--text-dim)";
          if(active){bg="#FC4C02";border="0.5px solid #c03a00";tc="rgba(255,255,255,.75)";}
          else if(s.cur){bg="transparent";border="0.5px solid #FC4C02";tc="#FC4C02";}
          return(
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center"}}>
              {s.isNew?<div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:3,width:"100%"}}><span style={{fontSize:8,color:"var(--text-dim)",fontFamily:"var(--font-dm-mono)"}}>{s.yr}</span><div style={{width:"100%",height:1,background:"var(--border)",marginTop:1}}/></div>:<div style={{height:14}}/>}
              <div className="week-cell" title={`S${s.wn} · ${s.mon.toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}`} style={{width:"100%",height:30,borderRadius:4,background:bg,border,outline:s.cur?"1.5px solid rgba(255,255,255,.2)":"none",outlineOffset:"2px",opacity:s.fut?.2:1,display:"flex",alignItems:"center",justifyContent:"center",animation:pulse?"s-pulse 1.8s ease-in-out infinite":"none",position:"relative"}}>
                <span style={{fontSize:8,fontWeight:500,color:tc,fontFamily:"var(--font-dm-mono)"}}>{s.wn}</span>
                {s.cur&&<span style={{position:"absolute",top:3,right:3,width:5,height:5,borderRadius:"50%",background:"#FC4C02",animation:"ping 1.5s ease-out infinite"}}/>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Graphique évolution ──────────────────────────────────────────────────────

function EvolutionChart({ activities, associations, hoveredId, selectedId, onHover, onSelect, timeField, stravaCompagnons, compagnonsPacelab, sortedCompagnons, compColors, externalTrigger = 0 }: {
  activities: Activity[]; associations: Map<number, Parcours | null>;
  hoveredId: number | null; selectedId: number | null;
  onHover: (id: number | null) => void; onSelect: (id: number | null) => void;
  timeField: "moving_time" | "elapsed_time";
  stravaCompagnons: Map<number, CompagnonPacelab[]>;
  compagnonsPacelab: CompagnonPacelab[];
  sortedCompagnons: CompagnonPacelab[];
  compColors: string[];
  externalTrigger?: number;
}) {
  const [mode, setMode] = useState<"temps" | "allure">("temps");
  const containerRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const [animKey, setAnimKey] = useState(0);
  const inViewRef = useRef(false);
  const pendingAnim = useRef(false);
  const hasTriggered = useRef(false);
  const initTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // IntersectionObserver — première apparition seulement (scroll vers le graphique)
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    let firstCallback = true;
    const obs = new IntersectionObserver(([entry]) => {
      if (firstCallback) {
        firstCallback = false;
        inViewRef.current = entry.isIntersecting;
        if (entry.isIntersecting) {
          // Le bloc parent a animate-in animate-in-delay-4 (400ms + 500ms = 900ms).
          // On attend qu'il soit entièrement visible avant de lancer la courbe.
          initTimer.current = setTimeout(() => {
            hasTriggered.current = true;
            setAnimKey(k => k + 1);
          }, 900);
        }
        return;
      }
      const entering = entry.isIntersecting && !inViewRef.current;
      inViewRef.current = entry.isIntersecting;
      if (entering && (!hasTriggered.current || pendingAnim.current)) {
        hasTriggered.current = true;
        pendingAnim.current = false;
        setAnimKey(k => k + 1);
      }
    }, { threshold: 0.2 });
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (initTimer.current) clearTimeout(initTimer.current);
    };
  }, []);

  // Sync Strava uniquement — retrigger l'animation
  useEffect(() => {
    if (externalTrigger === 0) return;
    // Annuler un éventuel timer de démarrage en cours
    if (initTimer.current) {
      clearTimeout(initTimer.current);
      initTimer.current = null;
    }
    if (inViewRef.current) {
      setAnimKey(k => k + 1);
    } else {
      pendingAnim.current = true; // jouer dès que le graphique sera visible
    }
  }, [externalTrigger]);

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
    if (mode === "temps") return timeField==="elapsed_time"?(a as {elapsed_time?:number}).elapsed_time??a.moving_time:a.moving_time;
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
    elapsed_time: (a as {elapsed_time?:number}).elapsed_time ?? a.moving_time,
  }));

  const vals = data.map((d) => d.val);
  const minV = Math.min(...vals); const maxV = Math.max(...vals);
  const range = maxV - minV || 1;

  const prVal = Math.min(...vals);
  const prIdx = data.findIndex((d) => d.val === prVal);

  const W = 1000; const H = 180;
  const padL = 52; const padR = 12; const padT = 20; const padB = 30;

  function xOf(i: number) { return padL + (i / Math.max(data.length - 1, 1)) * (W - padL - padR); }
  // Mode temps : temps longs EN HAUT (croissant vers le haut)
  // Mode allure : bonnes allures EN HAUT (paceToSec petit = haut)
  function yOf(v: number) {
    if (mode === "temps") return padT + ((maxV - v) / range) * (H - padT - padB); // maxV (long) en haut
    return padT + ((v - minV) / range) * (H - padT - padB); // minV (bonne allure) en haut
  }

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
    <div ref={outerRef}>
      {/* Toggle mode */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <p style={{...lbl,margin:0}}>Évolution</p>
          {activities.some(a => (a.athlete_count??1)>1) && <span style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"var(--text-dim)",fontFamily:"var(--font-geist)"}}><span style={{width:7,height:7,borderRadius:"50%",background:"var(--green)",display:"inline-block",flexShrink:0}}/> = course en groupe</span>}
        </div>
        <div style={{display:"flex",gap:4,background:"var(--surface-2)",border:"0.5px solid var(--border-2)",borderRadius:6,padding:3}}>
          {(["temps","allure"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{padding:"3px 10px",borderRadius:4,fontSize:11,border:"none",cursor:"pointer",fontFamily:"var(--font-geist)",background:mode===m?"#f5a623":"transparent",color:mode===m?"#fff":"var(--text-dim)"}}>
              {m === "temps" ? "Temps" : "Allure"}
            </button>
          ))}
        </div>
      </div>

      {/* Tooltip — espace constant pour éviter le tremblotement */}
      <div style={{height:32,marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{display:"flex",alignItems:"center",gap:8,padding:"0 12px",background:"var(--surface-2)",borderRadius:8,border:"0.5px solid var(--border-2)",height:28,width:"fit-content"}}>
        {activePoint ? (
          <>
            <span style={{fontSize:11,color:"var(--text-dim)",fontFamily:"var(--font-geist)"}}>{activePoint.date}</span>
            <span style={{fontSize:14,fontWeight:500,color:"var(--text-primary)",fontFamily:"var(--font-dm-mono)"}}>
              {mode === "temps" ? fmt.time(timeField==="elapsed_time"?activePoint.elapsed_time:activePoint.moving_time) : fmt.pace(activePoint.speed)}
            </span>
            {activePoint.val === prVal && <span style={{fontSize:10,background:"rgba(252,76,2,.15)",border:"0.5px solid #FC4C02",borderRadius:4,padding:"1px 5px",color:"#FC4C02",fontFamily:"var(--font-geist)"}}>PR</span>}

          </>
        ) : <span style={{fontSize:11,color:"var(--text-dim)",fontFamily:"var(--font-geist)"}}>Survoler un point pour afficher les détails</span>}
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
              <line x1={padL} y1={yOf(v)} x2={W-padR} y2={yOf(v)} style={{stroke:"var(--border)"}} strokeWidth={1}/>
              <text x={padL-6} y={yOf(v)+4} textAnchor="end" fontSize={9} style={{fill:"var(--text-dim)"}} fontFamily="var(--font-dm-mono)">{formatYTick(v)}</text>
            </g>
          ))}
          {/* Axe X labels */}
          {xTicks.map((d)=>{
            const i = data.findIndex(x => x.id === d.id);
            return <text key={d.id} x={xOf(i)} y={H+padB-4} textAnchor="middle" fontSize={9} style={{fill:"var(--text-dim)"}} fontFamily="var(--font-geist)">{d.date}</text>;
          })}
          {/* Ligne PR */}
          <line x1={padL} y1={yOf(prVal)} x2={W-padR} y2={yOf(prVal)} stroke="#FC4C02" strokeWidth={1} strokeDasharray="4 3"/>
          <text x={padL+4} y={yOf(prVal)-4} fontSize={9} fill="#FC4C02" fontFamily="var(--font-geist)">PR</text>
          {/* Courbe — animation gauche → droite déclenchée par IntersectionObserver */}
          <path
            key={animKey}
            d={pathD}
            fill="none"
            stroke="#f5a623"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={animKey === 0 ? 1 : undefined}
            style={{ animation: animKey > 0 ? "draw-line 1s cubic-bezier(0.4, 0, 0.2, 1) forwards" : "none" }}
          />
          {/* Points */}
          {data.map((d,i)=>{
            const isActive=d.id===activeId; const isPR=i===prIdx;
            // Couleur selon le compagnon dominant — même palette que les badges
            const comps=stravaCompagnons.get(d.id)??[];
            // Utilise l'ordre global stable passé depuis la page
            let ptColor="#555";
            if(comps.length>0){
              const dominated=comps.reduce((best,c)=>{
                const ia=sortedCompagnons.findIndex(x=>x.id===c.id);
                const ib=sortedCompagnons.findIndex(x=>x.id===best.id);
                return ia<ib?c:best;
              },comps[0]);
              const ci=sortedCompagnons.findIndex(x=>x.id===dominated.id);
              ptColor=compColors[ci%compColors.length];
            } else if(isPR) ptColor="#FC4C02";
            const r=isActive?6:comps.length>0?4:isPR?5:3;
            return(
              <circle key={d.id} cx={xOf(i)} cy={yOf(d.val)} r={r}
                fill={isActive?"#fff":ptColor}
                stroke={isActive||d.id===selectedId?"#f5a623":"none"}
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
        return<button key={o.value} onClick={()=>toggle(o.value)} style={{padding:"5px 12px",borderRadius:6,fontSize:12,border:active?"0.5px solid rgba(245,166,35,0.5)":"0.5px solid var(--border-2)",background:active?"rgba(245,166,35,0.1)":"transparent",color:active?"#f5a623":"var(--text-dim)",cursor:"pointer",fontFamily:"var(--font-geist)",transition:"all .15s",whiteSpace:"nowrap"}}>{o.label}</button>;
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
      <div style={{background:"var(--surface)",border:"0.5px solid var(--border)",borderRadius:12,padding:28,width:"100%",maxWidth:460}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div><p style={{...lbl,margin:"0 0 2px"}}>Association parcours</p><h2 style={{fontSize:15,fontWeight:500,color:"#fff",margin:0,fontFamily:"var(--font-geist)"}}>{activity.name}</h2></div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:"var(--text-dim)",fontSize:18,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:18}}>
          {parcoursList.map(p=>(
            <button key={p.id} onClick={()=>setSel(p.id)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 13px",borderRadius:7,cursor:"pointer",border:sel===p.id?"0.5px solid rgba(245,166,35,0.5)":"0.5px solid var(--border-2)",background:sel===p.id?"rgba(245,166,35,0.08)":"var(--surface-2)",transition:"all .15s"}}>
              <span style={{fontSize:13,color:sel===p.id?"#f5a623":"var(--text-primary)",fontFamily:"var(--font-geist)"}}>{p.nom}</span>
              <div style={{display:"flex",gap:8}}>
                {p.distance_km&&<span style={{fontSize:11,color:sel===p.id?"#f5a623":"var(--text-dim)",fontFamily:"var(--font-dm-mono)"}}>{p.distance_km} km</span>}
                {p.denivele_positif_m&&<span style={{fontSize:11,color:sel===p.id?"#f5a623":"var(--text-dim)",fontFamily:"var(--font-dm-mono)"}}>D+ {p.denivele_positif_m} m</span>}
              </div>
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={async()=>{if(!sel)return;setSaving(true);await onSave(sel);setSaving(false);}} disabled={saving||!sel} style={{flex:1,background:sel?"#f5a623":"#2a2a2a",color:sel?"#fff":"#555",border:"none",borderRadius:7,padding:"9px",fontSize:13,fontWeight:500,cursor:sel?"pointer":"not-allowed",fontFamily:"var(--font-geist)"}}>{saving?"...":"Associer"}</button>
          {current&&<button onClick={async()=>{setSaving(true);await onRemove();setSaving(false);}} disabled={saving} style={{background:"transparent",color:"#664040",border:"0.5px solid #3a2a2a",borderRadius:7,padding:"9px 14px",fontSize:13,cursor:"pointer",fontFamily:"var(--font-geist)"}}>Retirer</button>}
          <button onClick={onClose} style={{background:"transparent",color:"var(--text-dim)",border:"0.5px solid var(--border-2)",borderRadius:7,padding:"9px 14px",fontSize:13,cursor:"pointer",fontFamily:"var(--font-geist)"}}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

// ─── ActivityRow ──────────────────────────────────────────────────────────────

function ActivityRow({ a, p, isLoggedIn, isHov, isSel, onHov, onClick, onAssoc, timeField, compagnons, allCompagnons, sortedCompagnons, compColors, onAddCompagnon, onRemoveCompagnon }: {
  a:Activity; p:Parcours|null; isLoggedIn:boolean; isHov:boolean; isSel:boolean;
  onHov:(id:number|null)=>void; onClick:()=>void; onAssoc:()=>void; timeField:"moving_time"|"elapsed_time";
  compagnons:CompagnonPacelab[]; allCompagnons:CompagnonPacelab[];
  sortedCompagnons:CompagnonPacelab[]; compColors:string[];
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
        style={{borderBottom:"0.5px solid var(--border)",background:isAct?"var(--surface-2)":"transparent",cursor:"pointer",transition:"background .1s, border-left-color .1s"}}>
        <td style={{padding:"10px 12px",borderLeft:isAct?"2px solid #f5a623":"2px solid transparent"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:run?"var(--accent)":"var(--text-dim)",display:"inline-block",flexShrink:0,marginTop:2}}/>
            <div>
              <p style={{fontSize:13,fontWeight:500,color:"var(--text-primary)",margin:0,fontFamily:"var(--font-geist)"}}>{a.name}</p>
              <p style={{fontSize:11,color:"var(--text-dim)",margin:"2px 0 0",fontFamily:"var(--font-geist)"}}>{fmt.date(a.start_date_local)}</p>
            </div>
            {isGroupe&&<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          </div>
        </td>
        <td style={{padding:"10px 12px",fontSize:13,color:"var(--text-primary)",fontFamily:"var(--font-dm-mono)"}}>{fmt.dist(distM)}{p?.distance_km&&<span style={{fontSize:9,color:"#f5a623",marginLeft:3}}>★</span>}</td>
        <td style={{padding:"10px 12px",fontSize:13,color:"var(--text-primary)",fontFamily:"var(--font-dm-mono)"}}>{fmt.time(timeField==="elapsed_time"?a.elapsed_time:a.moving_time)}</td>
        <td style={{padding:"10px 12px",fontSize:13,color:"var(--text-dim)",fontFamily:"var(--font-dm-mono)"}}>{run?fmt.pace(speed):"—"}</td>
        <td style={{padding:"10px 12px",fontSize:13,color:"var(--text-dim)",fontFamily:"var(--font-dm-mono)"}}>{elev>0?`+${Math.round(elev)}m`:"—"}{p?.denivele_positif_m&&<span style={{fontSize:9,color:"#f5a623",marginLeft:3}}>★</span>}</td>
        <td style={{padding:"10px 12px",fontSize:13,color:"var(--text-dim)",fontFamily:"var(--font-dm-mono)"}}>{a.average_heartrate?`${Math.round(a.average_heartrate)} bpm`:"—"}</td>
        <td style={{padding:"10px 12px"}}>
          {p?(
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:11,background:"rgba(245,166,35,.1)",border:"0.5px solid rgba(245,166,35,.3)",borderRadius:5,padding:"2px 8px",color:"#f5a623",fontFamily:"var(--font-geist)",whiteSpace:"nowrap"}}>{p.nom}</span>
              {isLoggedIn&&<button onClick={e=>{e.stopPropagation();onAssoc();}} style={{background:"transparent",border:"none",color:"var(--text-dim)",cursor:"pointer",fontSize:11,padding:"2px 4px"}}>✎</button>}
            </div>
          ):isLoggedIn?(
            <button onClick={e=>{e.stopPropagation();onAssoc();}} style={{background:"transparent",border:"0.5px solid var(--border-2)",borderRadius:5,padding:"3px 8px",fontSize:11,color:"var(--text-dim)",cursor:"pointer",fontFamily:"var(--font-geist)",whiteSpace:"nowrap"}}>+ Parcours</button>
          ):<span style={{fontSize:11,color:"#2a2a2a"}}>—</span>}
        </td>
        <td style={{padding:"10px 12px"}} onClick={e=>e.stopPropagation()}>
          {compagnons.length > 0 ? (
            <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
              {compagnons.map(c=>{
                const PALETTES=[["#0f2a1e","#1a4a30","#1d9e75"],["#0f1e2a","#1a304a","#1d75e0"],["#1e0f2a","#3a1a4a","#8b3de0"],["#2a1e0f","#4a3a1a","#e09030"],["#2a2a0f","#4a4a1a","#c0a030"],["#150f2a","#2a1a4a","#6040e0"],["#2a0f0f","#4a1a1a","#e05050"],["#0f2a2a","#1a4a4a","#1db8b8"]];
                const idx=sortedCompagnons.findIndex(x=>x.id===c.id);
                const [bg,border,color]=idx>=0?PALETTES[idx%PALETTES.length]:PALETTES[0];
                return <span key={c.id} style={{fontSize:11,background:bg,border:`0.5px solid ${border}`,borderRadius:5,padding:"2px 7px",color:color,fontFamily:"var(--font-geist)"}}>{c.nom}</span>;
              })}
              {isLoggedIn&&<button onClick={e=>{e.stopPropagation();onClick();}} title="Modifier les compagnons" style={{background:"transparent",border:"none",color:"var(--text-dim)",cursor:"pointer",fontSize:12,padding:"1px 4px"}}>✎</button>}
            </div>
          ) : isLoggedIn ? (
            <button onClick={e=>{e.stopPropagation();onClick();}} style={{background:"transparent",border:"0.5px solid var(--border-2)",borderRadius:5,padding:"3px 7px",fontSize:11,color:"var(--text-dim)",cursor:"pointer",fontFamily:"var(--font-geist)"}}>+</button>
          ) : <span style={{fontSize:11,color:"#2a2a2a"}}>—</span>}
        </td>
      </tr>
      {isSel&&(
        <tr style={{background:"var(--surface-2)",borderBottom:"0.5px solid #1a1a1a"}}>
          <td colSpan={8} style={{padding:"10px 14px",borderLeft:"2px solid #f5a623"}}>
            {/* Compagnons dans le panel expandé */}
            <div style={{marginBottom:8}}>
              <p style={{fontSize:10,color:"var(--text-dim)",letterSpacing:".05em",textTransform:"uppercase",fontFamily:"var(--font-geist)",margin:"0 0 8px"}}>Compagnons</p>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                {compagnons.map(c=>{
                  const PALETTES=[["#0f2a1e","#1a4a30","#1d9e75"],["#0f1e2a","#1a304a","#1d75e0"],["#1e0f2a","#3a1a4a","#8b3de0"],["#2a1e0f","#4a3a1a","#e09030"],["#2a2a0f","#4a4a1a","#c0a030"],["#150f2a","#2a1a4a","#6040e0"],["#2a0f0f","#4a1a1a","#e05050"],["#0f2a2a","#1a4a4a","#1db8b8"]];
                  const idx=sortedCompagnons.findIndex(x=>x.id===c.id);
                  const [bg,border,color]=idx>=0?PALETTES[idx%PALETTES.length]:PALETTES[0];
                  return(
                  <span key={c.id} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,background:bg,border:`0.5px solid ${border}`,borderRadius:5,padding:"3px 10px",color:color,fontFamily:"var(--font-geist)"}}>
                    {c.nom}
                    {isLoggedIn&&<button onClick={e=>{e.stopPropagation();onRemoveCompagnon(c.id);}} style={{background:"transparent",border:"none",color:border,cursor:"pointer",fontSize:12,padding:0,lineHeight:1,marginLeft:2}}>✕</button>}
                  </span>
                  );
                })}
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
        {filtres.map(([nom,acts])=><button key={nom} onClick={()=>setSel(nom)} style={{padding:"5px 12px",borderRadius:6,fontSize:12,border:sel===nom?"0.5px solid rgba(245,166,35,0.5)":"0.5px solid var(--border-2)",background:sel===nom?"rgba(245,166,35,.1)":"transparent",color:sel===nom?"#f5a623":"var(--text-dim)",cursor:"pointer",fontFamily:"var(--font-geist)"}}>{nom} <span style={{opacity:.6}}>({acts.length})</span></button>)}
      </div>
      {loading?<div className="card skeleton-pulse" style={{height:120,marginTop:8}}/>:(
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
                    return<td key={i} style={{padding:"8px 10px",textAlign:"center"}}><span style={{fontSize:12,fontFamily:"var(--font-dm-mono)",color:isBest?"#f5a623":"var(--text-muted)",fontWeight:isBest?500:400}}>{fmt.pace(lap.average_speed)}</span></td>;
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

function MesCoursesContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isDemo = pathname?.startsWith("/demo") ?? false;
  const error = searchParams.get("error");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [chartAnimTrigger, setChartAnimTrigger] = useState(0);
  const [tokenExpired, setTokenExpired] = useState(false);
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
  const [badgeCount, setBadgeCount] = useState<number | null>(null);
  const [featuredBadge, setFeaturedBadge] = useState<{name:string;emoji:string}|null>(null);

  useEffect(() => {
    try {
      const cnt = localStorage.getItem("pacelab_badge_count");
      if (cnt) setBadgeCount(parseInt(cnt));
      const fb = localStorage.getItem("pacelab_featured_badge");
      if (fb) setFeaturedBadge(JSON.parse(fb));
    } catch {}
  }, []);

  async function loadData() {
    const { createClient } = await import("@/lib/supabase");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setIsLoggedIn(true);

    // Connecté = données du user, non connecté = données d'Eliott
    if (isDemo) {
      await loadDemoData();
      return;
    }
    const res = await fetch("/api/strava/activities");
    if (res.ok) {
      const json = await res.json();
      if (json.lastSync) setLastSync(json.lastSync);
      // Sync auto uniquement si le cache est vide (première connexion)
      if (user && !json.activities?.length) {
        await syncFromStrava();
        return;
      }
      setData(json);
      setConnected(true);

      if (user) {
        const activities: Activity[] = json.activities ?? [];

        const [{ data: parc }, { data: obj }, { data: comps }] = await Promise.all([
          supabase.from("parcours").select("id, nom, distance_km, denivele_positif_m").eq("actif", true).eq("user_id", user.id).order("nom"),
          supabase.from("objectifs").select("*").eq("actif", true).eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("compagnons").select("id, nom, actif").eq("user_id", user.id).order("nom"),
        ]);
        const parcoursBDD: Parcours[] = parc || [];
        setParcoursList(parcoursBDD);
        setObjectifs(obj || []);
        setCompagnonsPacelab(comps || []);

        // Associations parcours
        const assocRes = await fetch("/api/strava/associations");
        const assocData: Association[] = assocRes.ok ? await assocRes.json() : [];
        const assocMap = new Map<number, Parcours | null>();
        assocData.forEach((a) => { assocMap.set(Number(a.strava_activity_id), a.parcours); });

        // Auto-match par nom pour les activités sans association en base
        activities.forEach((act) => {
          if (!assocMap.has(act.id)) {
            const match = parcoursBDD.find((p) => p.nom.toLowerCase() === act.name.trim().toLowerCase());
            if (match) assocMap.set(act.id, match);
          }
        });
        setAssociations(assocMap);

        // Compagnons Strava
        const scRes = await fetch("/api/strava/compagnons");
        const scData: StravaCompagnon[] = scRes.ok ? await scRes.json() : [];
        const scMap = new Map<number, CompagnonPacelab[]>();
        scData.forEach((sc) => {
          const id = Number(sc.strava_activity_id);
          if (!scMap.has(id)) scMap.set(id, []);
          if (sc.compagnon) scMap.get(id)!.push(sc.compagnon);
        });
        setStravaCompagnons(scMap);
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

  async function loadDemoData() {
    const res = await fetch("/api/demo");
    if (!res.ok) { setLoading(false); return; }
    const json = await res.json();
    setData(json);
    setConnected(true);
    setIsLoggedIn(true); // En démo, on simule un user connecté
    setLastSync(json.lastSync);
    const parcoursBDD = json.parcours || [];
    setParcoursList(parcoursBDD);
    setObjectifs(json.objectifs || []);
    setCompagnonsPacelab(json.compagnons || []);
    const assocMap = new Map();
    (json.associations || []).forEach((a: {strava_activity_id:number;parcours:unknown}) => {
      assocMap.set(Number(a.strava_activity_id), a.parcours);
    });
    setAssociations(assocMap);
    const scMap = new Map();
    (json.stravaCompagnons || []).forEach((sc: {strava_activity_id:number;compagnon:{id:string;nom:string}|null}) => {
      const id = Number(sc.strava_activity_id);
      if (!scMap.has(id)) scMap.set(id, []);
      if (sc.compagnon) scMap.get(id).push(sc.compagnon);
    });
    setStravaCompagnons(scMap);
    setLoading(false);
  }

  async function syncFromStrava() {
    if (isDemo) {
      setSyncing(true);
      await new Promise(r => setTimeout(r, 1200)); // simule la latence
      setLastSync(new Date().toISOString());
      setSyncing(false);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 10000);
      return;
    }
    setSyncing(true);
    const { createClient } = await import("@/lib/supabase");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const res = await fetch("/api/strava/activities", { method: "POST" });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("Sync failed:", res.status, errText);
      if (res.status === 401) setTokenExpired(true);
      setSyncing(false);
      return;
    }

    const json = await res.json();
    setConnected(true);
    const syncDate = json.lastSync ?? new Date().toISOString();
    setLastSync(syncDate);

    // Recharge les données complètes depuis le cache (GET)
    const fresh = await fetch("/api/strava/activities");
    const freshJson = fresh.ok ? await fresh.json() : json;
    setData(freshJson);
    setChartAnimTrigger(t => t + 1);

    // Recharge parcours, compagnons, associations après la sync
    if (user) {
      const activities: Activity[] = json.activities ?? [];
      const [{ data: parc }, { data: obj }, { data: comps }] = await Promise.all([
        supabase.from("parcours").select("id, nom, distance_km, denivele_positif_m").eq("actif", true).eq("user_id", user.id).order("nom"),
        supabase.from("objectifs").select("*").eq("actif", true).eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("compagnons").select("id, nom, actif").eq("user_id", user.id).order("nom"),
      ]);
      const parcoursBDD: Parcours[] = parc || [];
      setParcoursList(parcoursBDD);
      setObjectifs(obj || []);
      setCompagnonsPacelab(comps || []);

      const assocRes = await fetch("/api/strava/associations");
      const assocData: Association[] = assocRes.ok ? await assocRes.json() : [];
      const assocMap = new Map<number, Parcours | null>();
      assocData.forEach((a) => { assocMap.set(Number(a.strava_activity_id), a.parcours); });
      activities.forEach((act) => {
        if (!assocMap.has(act.id)) {
          const match = parcoursBDD.find((p) => p.nom.toLowerCase() === act.name.trim().toLowerCase());
          if (match) assocMap.set(act.id, match);
        }
      });
      setAssociations(assocMap);

      const scRes = await fetch("/api/strava/compagnons");
      const scData: StravaCompagnon[] = scRes.ok ? await scRes.json() : [];
      const scMap = new Map<number, CompagnonPacelab[]>();
      scData.forEach((sc) => {
        const id = Number(sc.strava_activity_id);
        if (!scMap.has(id)) scMap.set(id, []);
        if (sc.compagnon) scMap.get(id)!.push(sc.compagnon);
      });
      setStravaCompagnons(scMap);
    }

    // Signal badge uniquement si de nouvelles activités ont été téléchargées
    const oldCount = data?.activities?.length ?? 0;
    const newCount = freshJson?.activities?.length ?? 0;
    if (newCount > oldCount) {
      localStorage.setItem("pacelab_badge_dot", "true");
      window.dispatchEvent(new Event("pacelab-badge-update"));
    }

    setSyncing(false);
    setSyncSuccess(true);
    setTimeout(() => setSyncSuccess(false), 10000);
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

  // Ordre stable des compagnons par nb de courses — utilisé pour les couleurs partout
  const sortedCompagnons = [...compagnonsPacelab].sort((a, b) => {
    const na = runs.filter(r => stravaCompagnons.get(r.id)?.some(c => c.id === a.id)).length;
    const nb = runs.filter(r => stravaCompagnons.get(r.id)?.some(c => c.id === b.id)).length;
    return nb - na || a.nom.localeCompare(b.nom);
  });
  const COMP_COLORS_GLOBAL = ["#1d9e75","#3d8fe0","#b06de0","#e09030","#c0a030","#8060e0","#e05050","#1db8b8","#e060a0","#80c030"];
  const totalSec = filtered.reduce((s, a) => s + (timeField === "elapsed_time" ? a.elapsed_time : a.moving_time), 0);
  const totalKm = filtered.reduce((s, a) => { const p = associations.get(a.id); return s + (p?.distance_km ?? a.distance / 1000); }, 0);
  const avgSec = filtered.length > 0 ? Math.round(totalSec / filtered.length) : 0; // totalSec déjà calculé avec timeField

  // Allure moyenne filtrée
  const filteredWithDist = filtered.filter(a => { const p = associations.get(a.id); return p?.distance_km || a.distance > 0; });
  const filteredTotalKm = filteredWithDist.reduce((s, a) => { const p = associations.get(a.id); return s + (p?.distance_km ?? a.distance / 1000); }, 0);
  const filteredTotalSec = filteredWithDist.reduce((s, a) => s + (timeField === "elapsed_time" ? a.elapsed_time : a.moving_time), 0);
  const allureMoyFiltered = filteredTotalKm > 0 ? fmt.pace(filteredTotalKm * 1000 / filteredTotalSec) : "—";

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
      <Navbar isLoggedIn={isLoggedIn} isDemo={isDemo} />
      {modalActivity && <AssocModal activity={modalActivity} parcoursList={parcoursList} current={associations.get(modalActivity.id) ?? null} onSave={handleSaveAssoc} onRemove={handleRemoveAssoc} onClose={() => setModalActivity(null)} />}

      <main style={{ padding: "32px 24px", maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div className="animate-in" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <p style={{ ...lbl, margin: "0 0 8px", letterSpacing: "0.08em" }}>Strava · {new Date().getFullYear()}</p>
            <h1 style={{ fontSize: 32, fontWeight: 600, color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-dm-mono)", letterSpacing: "-0.03em", lineHeight: 1 }}>
              Mes Courses
            </h1>
          </div>
          {connected && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {lastSyncStr && !tokenExpired && (
                <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-geist)" }}>
                  Sync {lastSyncStr}
                </span>
              )}
              {tokenExpired ? (
                <button onClick={handleConnect} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--coral-dim)", border: "0.5px solid rgba(252,76,2,0.4)", borderRadius: 7, padding: "7px 14px", fontSize: 12, color: "var(--coral)", cursor: "pointer", fontFamily: "var(--font-geist)", transition: "background 0.15s" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Token expiré — Reconnecter Strava
                </button>
              ) : (
                <button onClick={syncFromStrava} disabled={syncing || syncSuccess} style={{ display: "flex", alignItems: "center", gap: 6, background: syncSuccess ? "rgba(34,197,94,0.08)" : "var(--coral-dim)", border: syncSuccess ? "0.5px solid rgba(34,197,94,0.35)" : "0.5px solid rgba(252,76,2,0.35)", borderRadius: 7, padding: "7px 14px", fontSize: 12, color: syncSuccess ? "var(--green)" : "var(--coral)", cursor: syncing || syncSuccess ? "not-allowed" : "pointer", fontFamily: "var(--font-geist)", transition: "all .25s ease", opacity: syncing ? 0.7 : 1 }}>
                  {syncSuccess ? (
                    <><div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", flexShrink: 0 }} />Synchronisé</>
                  ) : (
                    <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: syncing ? "spin 1s linear infinite" : "none", flexShrink: 0 }}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>{syncing ? "Synchronisation..." : "Synchroniser Strava"}</>
                  )}
                </button>
              )}
              {isLoggedIn && connected && (
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} />
                  <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-geist)" }}>connecté</span>
                </div>
              )}
            </div>
          )}
        </div>


        {error && <div style={{ background: "#2a0f0f", border: "0.5px solid #4a2020", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}><p style={{ fontSize: 13, color: "#e05050", margin: 0, fontFamily: "var(--font-geist)" }}>Connexion Strava refusée ou échouée.</p></div>}

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="card skeleton-pulse" style={{ height: 74 }} />
            <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr", gap: 10 }}>
              <div className="card skeleton-pulse" style={{ height: 80 }} />
              <div className="card skeleton-pulse" style={{ height: 80 }} />
              <div className="card skeleton-pulse" style={{ height: 80 }} />
            </div>
            <div className="card skeleton-pulse" style={{ height: 70 }} />
            <div className="card skeleton-pulse" style={{ height: 320 }} />
          </div>
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
              <div className="animate-in animate-in-delay-1 bento-hover" style={{ display: "flex", alignItems: "center", gap: 16, background: "linear-gradient(135deg, var(--surface) 0%, transparent 100%)", border: "0.5px solid rgba(245,166,35,0.15)", borderRadius: 14, padding: "16px 20px", marginBottom: 12 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--accent-dim)", border: "2px solid rgba(245,166,35,0.5)", boxShadow: "0 0 16px rgba(245,166,35,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 600, color: "var(--accent)", fontFamily: "var(--font-dm-mono)", overflow: "hidden", flexShrink: 0, transition: "box-shadow 200ms ease" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 8px rgba(245,166,35,0.18), 0 0 24px rgba(245,166,35,0.25)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 16px rgba(245,166,35,0.12)"; }}>
                  {data.athlete.profile && data.athlete.profile !== "avatar_medium.png"
                    ? <img src={data.athlete.profile} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    : (data.athlete.firstname?.[0] ?? "?")}
                </div>
                <div>
                  <p style={{ fontSize: 18, fontWeight: 500, color: "var(--text-primary)", margin: "0 0 3px", fontFamily: "var(--font-geist)", letterSpacing: "-0.01em" }}>{data.athlete.firstname} {data.athlete.lastname}</p>
                  {data.athlete.city && <p style={{ fontSize: 12, color: "var(--text-dim)", margin: 0, fontFamily: "var(--font-geist)" }}>{data.athlete.city}, {data.athlete.country}</p>}
                </div>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 20 }}>
                  {badgeCount !== null && (
                    <a href="/recompenses" style={{ textAlign: "center", textDecoration: "none" }}>
                      <p style={{ fontSize: 24, fontWeight: 600, color: "var(--accent)", margin: 0, fontFamily: "var(--font-dm-mono)", letterSpacing: "-0.02em" }}>{badgeCount}</p>
                      <p style={{ fontSize: 9, color: "var(--text-dim)", margin: "2px 0 0", fontFamily: "var(--font-geist)", letterSpacing: "0.06em", textTransform: "uppercase" }}>badges</p>
                    </a>
                  )}
                  {featuredBadge && (
                    <a href="/recompenses" style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--accent-dim)", border: "0.5px solid rgba(245,166,35,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                        {featuredBadge.emoji}
                      </div>
                      <p style={{ fontSize: 9, color: "var(--text-dim)", margin: 0, fontFamily: "var(--font-geist)", maxWidth: 70, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{featuredBadge.name}</p>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Stats bento */}
            {(data?.stats || (data?.activities && data.activities.length > 0)) && (
              <div className="animate-in animate-in-delay-2" style={{ marginBottom: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8, marginBottom: 8 }}>

                  {/* Héro — Distance YTD */}
                  <div className="bento-hover" style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 14, padding: "24px 28px", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", bottom: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(245,166,35,0.04)", border: "0.5px solid rgba(245,166,35,0.06)", animation: "orb-float 6s ease-in-out infinite" }} />
                    <p style={{ ...lbl, color: "rgba(245,166,35,0.65)", margin: "0 0 10px", letterSpacing: "0.08em" }}>{new Date().getFullYear()} · Distance</p>
                    <p style={{ fontSize: 52, fontWeight: 600, color: "var(--accent)", margin: "0 0 2px", fontFamily: "var(--font-dm-mono)", letterSpacing: "-0.04em", lineHeight: 1 }}>
                      {fmt.distShort(ytd?.distance ?? 0)}
                    </p>
                    <div style={{ display: "flex", gap: 24, marginTop: 18, paddingTop: 16, borderTop: "0.5px solid var(--border)" }}>
                      {[
                        { l: "Sorties", v: String(ytd?.count ?? 0) },
                        { l: "Temps", v: (() => { const yr = String(new Date().getFullYear()); const ytdRuns = runs.filter(a => a.start_date_local.startsWith(yr)); return fmt.time(ytdRuns.reduce((s,a)=>s+(timeField==="elapsed_time"?a.elapsed_time:a.moving_time),0)); })() },
                        { l: "Dénivelé", v: `+${Math.round(ytd?.elevation_gain ?? 0)}m` },
                      ].map(({ l, v }) => (
                        <div key={l}>
                          <p style={{ ...lbl, margin: "0 0 3px" }}>{l}</p>
                          <p style={{ fontSize: 17, fontWeight: 500, color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-dm-mono)", letterSpacing: "-0.01em" }}>{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tout temps */}
                  <div className="bento-hover" style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 14, padding: "22px 22px" }}>
                    <p style={{ ...lbl, margin: "0 0 14px" }}>Tout temps</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div>
                        <p style={{ ...lbl, margin: "0 0 2px" }}>Distance</p>
                        <p style={{ fontSize: 20, fontWeight: 500, color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-dm-mono)", letterSpacing: "-0.02em" }}>{fmt.distShort(all?.distance ?? 0)}</p>
                      </div>
                      {/* Sorties + Temps côte à côte */}
                      <div style={{ display: "flex", gap: 14 }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ ...lbl, margin: "0 0 2px" }}>Sorties</p>
                          <p style={{ fontSize: 20, fontWeight: 500, color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-dm-mono)", letterSpacing: "-0.02em" }}>{all?.count ?? 0}</p>
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ ...lbl, margin: "0 0 2px" }}>Temps</p>
                          <p style={{ fontSize: 20, fontWeight: 500, color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-dm-mono)", letterSpacing: "-0.02em" }}>{fmt.time(all?.moving_time ?? 0)}</p>
                        </div>
                      </div>
                      <div>
                        <p style={{ ...lbl, margin: "0 0 2px" }}>Dénivelé</p>
                        <p style={{ fontSize: 20, fontWeight: 500, color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-dm-mono)", letterSpacing: "-0.02em" }}>+{Math.round(all?.elevation_gain ?? 0)}m</p>
                      </div>
                    </div>
                  </div>

                  {/* Objectif */}
                  <ObjectifCarousel objectifs={objectifs} courses={allRunsSummary} />
                </div>
              </div>
            )}

            {/* Streak */}
            <div className="animate-in animate-in-delay-3">
              <StreakCal activities={runs} />
            </div>



            {/* Bloc activités */}
            <div className="animate-in animate-in-delay-4" style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
              {/* Filtres */}
              <div style={{ padding: "18px 20px", borderBottom: "0.5px solid var(--border)", background: "var(--surface-2)" }}>
                <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div><p style={{ ...lbl, margin: "0 0 8px" }}>Année</p><MultiPill options={anneeOptions} values={filterAnnee} onChange={v=>{setFilterAnnee(v);setSelectedId(null);setHoveredId(null);}}/></div>
                  {parcoursNoms.length > 0 && <div><p style={{ ...lbl, margin: "0 0 8px" }}>Parcours</p><MultiPill options={parcoursOptions} values={filterParcours} onChange={v=>{setFilterParcours(v);setSelectedId(null);setHoveredId(null);}}/></div>}
                  <div>
                    <p style={{ ...lbl, margin: "0 0 8px" }}>Groupe</p>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {([["tout","Tous"],["solo","Solo"]] as const).map(([v,label])=>(
                        <button key={v} onClick={()=>{setFilterGroupe(v);setSelectedId(null);setHoveredId(null);}} className="filter-pill" style={{padding:"5px 12px",borderRadius:6,fontSize:12,border:filterGroupe===v?"0.5px solid rgba(245,166,35,0.5)":"0.5px solid var(--border-2)",background:filterGroupe===v?"rgba(245,166,35,0.1)":"transparent",color:filterGroupe===v?"#f5a623":"var(--text-dim)",cursor:"pointer",fontFamily:"var(--font-geist)"}}>{label}</button>
                      ))}
                      {compagnonsPacelab.filter(c => c.actif && runs.some(a => stravaCompagnons.get(a.id)?.some(sc => sc.id === c.id))).map(c => (
                        <button key={c.id} onClick={()=>{setFilterGroupe("comp_"+c.id);setSelectedId(null);setHoveredId(null);}} className="filter-pill" style={{padding:"5px 12px",borderRadius:6,fontSize:12,border:filterGroupe===("comp_"+c.id)?"0.5px solid #1d9e75":"0.5px solid var(--border-2)",background:filterGroupe===("comp_"+c.id)?"rgba(29,158,117,0.12)":"transparent",color:filterGroupe===("comp_"+c.id)?"#1d9e75":"var(--text-dim)",cursor:"pointer",fontFamily:"var(--font-geist)"}}>{c.nom}</button>
                      ))}
                    </div>
                  </div>
                </div>
                {hasFilters && <button onClick={()=>{setFilterAnnee(["tout"]);setFilterParcours(["tout"]);setFilterGroupe("tout");setSelectedId(null);setHoveredId(null);}} style={{marginTop:12,background:"transparent",border:"none",color:"var(--text-dim)",fontSize:11,cursor:"pointer",fontFamily:"var(--font-geist)",padding:0,textDecoration:"underline",textDecorationColor:"var(--border-2)"}}>Réinitialiser les filtres</button>}
              {/* Stats filtrées — inline avec séparateurs */}
              <div style={{display:"flex",gap:0,flexWrap:"wrap",marginTop:14,paddingTop:14,borderTop:"0.5px solid var(--border)",alignItems:"baseline"}}>
                {[
                  {l:"Sorties",v:String(filtered.length)},
                  {l:"Temps",v:`${Math.floor(totalSec/3600)}h${String(Math.floor((totalSec%3600)/60)).padStart(2,"0")}`},
                  {l:"Distance",v:`${totalKm.toFixed(1)} km`},
                  {l:"Moy.",v:avgSec>0?fmt.time(avgSec):"—"},
                  {l:"Allure",v:allureMoyFiltered},
                ].map(({l,v},i)=>(
                  <div key={l} style={{display:"flex",alignItems:"baseline",gap:4}}>
                    {i > 0 && <span style={{color:"var(--text-dim)",fontSize:11,margin:"0 10px",opacity:0.4}}>·</span>}
                    <span style={{...lbl,margin:0}}>{l}</span>
                    <span style={{fontSize:15,fontWeight:500,color:"var(--text-primary)",fontFamily:"var(--font-dm-mono)",marginLeft:4}}>{v}</span>
                  </div>
                ))}
              </div>
              </div>

              {/* Graphique */}
              {filtered.length >= 2 && (
                <div className="chart-wrapper" style={{ padding: "16px 18px", borderBottom: "0.5px solid var(--border)" }}>
                  <EvolutionChart activities={filtered} associations={associations} hoveredId={hoveredId} selectedId={selectedId} onHover={setHoveredId} onSelect={id=>setSelectedId(selectedId===id?null:id)} timeField={timeField} stravaCompagnons={stravaCompagnons} compagnonsPacelab={compagnonsPacelab} sortedCompagnons={sortedCompagnons} compColors={COMP_COLORS_GLOBAL} externalTrigger={chartAnimTrigger}/>
                  {/* Note privée sous le graphique */}
                  <div style={{minHeight:32,marginTop:8}}>
                    {(() => {
                      const act = filtered.find(a => a.id === (hoveredId ?? selectedId));
                      const note = (act as (Activity & {private_note?:string}) | undefined)?.private_note || act?.description;
                      if (!note) return null;
                      return <p style={{fontSize:12,color:"var(--text-dim)",fontFamily:"var(--font-geist)",fontStyle:"italic",margin:0,padding:"6px 10px",background:"var(--surface-2)",borderRadius:6,borderLeft:"2px solid #f5a623"}}>{note}</p>;
                    })()}
                  </div>

                </div>
              )}

              {/* Header tableau */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderBottom: "0.5px solid var(--border)", background: "var(--surface)" }}>
                <p style={{ ...lbl, margin: 0, letterSpacing: "0.08em" }}>{filtered.length} course{filtered.length!==1?"s":""} <span style={{color:"var(--text-dim)",opacity:0.4,fontWeight:400}}>/ {runs.length} total</span></p>
                <span style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-geist)", opacity: 0.5 }}>★ = données parcours</span>
              </div>

              {filtered.length === 0
                ? <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <p style={{ fontSize: 13, color: "var(--text-dim)", fontFamily: "var(--font-geist)", margin: "0 0 6px" }}>Aucune activité pour ces filtres</p>
                    <p style={{ fontSize: 11, color: "var(--text-dim)", opacity: 0.55, fontFamily: "var(--font-geist)", margin: 0 }}>Essaie d'élargir la période ou de réinitialiser les filtres</p>
                  </div>
                : <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr style={{ borderBottom: "0.5px solid var(--border)" }}>
                      {["Activité","Distance","Durée","Allure","D+","FC moy.","Parcours","Compagnons"].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:9,color:"var(--text-dim)",fontWeight:500,letterSpacing:".08em",textTransform:"uppercase",fontFamily:"var(--font-geist)"}}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {filtered.map(a=><ActivityRow key={a.id} a={a} p={associations.get(a.id)??null} isLoggedIn={isLoggedIn} isHov={hoveredId===a.id} isSel={selectedId===a.id} onHov={setHoveredId} onClick={()=>setSelectedId(selectedId===a.id?null:a.id)} onAssoc={()=>setModalActivity(a)} timeField={timeField} compagnons={stravaCompagnons.get(a.id)??[]} allCompagnons={compagnonsPacelab} sortedCompagnons={sortedCompagnons} compColors={COMP_COLORS_GLOBAL} onAddCompagnon={(c)=>addStravaCompagnon(a.id,c)} onRemoveCompagnon={(id)=>removeStravaCompagnon(a.id,id)}/>)}
                    </tbody>
                  </table>
              }
            </div>

          </>
        )}
      </main>
    </div>
  );
}

export default function MesCoursesPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
      <MesCoursesContent />
    </Suspense>
  );
}