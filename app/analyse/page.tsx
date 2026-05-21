"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import RevealOnScroll from "@/components/RevealOnScroll";
import { lbl } from "@/lib/styles";

interface Activity {
  id: number; name: string; sport_type: string;
  moving_time: number; elapsed_time: number; distance: number; average_speed: number;
  total_elevation_gain: number; start_date_local: string; athlete_count?: number;
  private_note?: string;
}
interface Parcours { id: string; nom: string; distance_km: number | null; denivele_positif_m: number | null; }
interface Association { strava_activity_id: number; parcours: Parcours | null; }

function isRun(a: Activity) { return ["Run","TrailRun","VirtualRun"].includes(a.sport_type); }
function fmtPace(speed: number) { if(!speed)return"—"; const s=1000/speed; return`${Math.floor(s/60)}'${String(Math.round(s%60)).padStart(2,"0")}"`; }
function fmtTime(s: number) { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h>0?`${h}h${String(m).padStart(2,"0")}`:`${m}m${String(s%60).padStart(2,"0")}s`; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"2-digit"}); }
function paceToSec(speed: number) { return speed>0?1000/speed:9999; }
function secToPaceStr(sec: number) { return`${Math.floor(sec/60)}'${String(Math.round(sec%60)).padStart(2,"0")}"`; }
function quantile(sorted: number[], q: number) { const pos=(sorted.length-1)*q,base=Math.floor(pos),rest=pos-base; return sorted[base+1]!==undefined?sorted[base]+rest*(sorted[base+1]-sorted[base]):sorted[base]; }

const card: React.CSSProperties = { background:"var(--surface)",border:"0.5px solid var(--border)",borderRadius:12,padding:"20px 22px" };

function BoxPlot({ paces, selectedId, hoveredId, onSelect, onHover }: { paces:{speed:number;date:string;id:number}[]; selectedId:number|null; hoveredId:number|null; onSelect:(id:number)=>void; onHover:(id:number|null)=>void }) {
  const sorted=[...paces].map(p=>paceToSec(p.speed)).sort((a,b)=>a-b);
  if(sorted.length<2) return <div style={{textAlign:"center",padding:"30px 0",color:"var(--text-dim)",fontSize:13}}>Minimum 2 sorties pour afficher la distribution.</div>;
  // min = meilleure allure (paceToSec petit), max = pire (grand)
  const min=sorted[0],max=sorted[sorted.length-1],q1=quantile(sorted,.25),median=quantile(sorted,.5),q3=quantile(sorted,.75),range=max-min||1;
  const W=900,H=160,padL=90,padR=40,padT=30,padB=40,midY=padT+(H-padT-padB)/2,boxH=44;
  // Bonnes allures À DROITE : paceToSec grand → x petit (gauche), petit → x grand (droite)
  function xOf(s: number){return padL+((max-s)/range)*(W-padL-padR);}
  // Avec inversion : xOf(min) = droite, xOf(max) = gauche
  // xOf(q1) > xOf(q3) car q1 < q3 → la boîte va de xOf(q3) à xOf(q1)
  const boxLeft=Math.min(xOf(q1),xOf(q3));
  const boxWidth=Math.abs(xOf(q1)-xOf(q3));
  const ticks=Array.from({length:5},(_,i)=>min+(i/4)*range);
  return(
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block",overflow:"visible"}} onMouseLeave={()=>onHover(null)}>
        {ticks.map((t,i)=><g key={i}>
          <line x1={xOf(t)} y1={padT} x2={xOf(t)} y2={H-padB} style={{stroke:"var(--border)"}} strokeWidth={1}/>
          <text x={xOf(t)} y={H-padB+14} textAnchor="middle" fontSize={9} style={{fill:"var(--text-dim)"}} fontFamily="var(--font-dm-mono)">{secToPaceStr(t)}</text>
        </g>)}
        {/* Whiskers : de max (gauche) vers q3, et de q1 vers min (droite) */}
        <line x1={xOf(max)} y1={midY} x2={xOf(q3)} y2={midY} style={{stroke:"var(--border-2)"}} strokeWidth={1.5} strokeDasharray="3 2"/>
        <line x1={xOf(q1)} y1={midY} x2={xOf(min)} y2={midY} style={{stroke:"var(--border-2)"}} strokeWidth={1.5} strokeDasharray="3 2"/>
        <line x1={xOf(max)} y1={midY-10} x2={xOf(max)} y2={midY+10} style={{stroke:"var(--text-dim)"}} strokeWidth={1.5}/>
        <line x1={xOf(min)} y1={midY-10} x2={xOf(min)} y2={midY+10} style={{stroke:"var(--text-dim)"}} strokeWidth={1.5}/>
        {/* Boîte IQR */}
        <rect x={boxLeft} y={midY-boxH/2} width={boxWidth} height={boxH} fill="rgba(245,166,35,0.08)" stroke="#f5a623" strokeWidth={1} rx={3}/>
        <line x1={xOf(median)} y1={midY-boxH/2} x2={xOf(median)} y2={midY+boxH/2} stroke="#f5a623" strokeWidth={2.5}/>
        {/* Labels */}
        <text x={xOf(max)-6} y={midY+4} textAnchor="end" fontSize={9} style={{fill:"var(--text-dim)"}} fontFamily="var(--font-dm-mono)">{secToPaceStr(max)}</text>
        <text x={xOf(min)+6} y={midY+4} textAnchor="start" fontSize={9} style={{fill:"var(--text-dim)"}} fontFamily="var(--font-dm-mono)">{secToPaceStr(min)}</text>
        <text x={xOf(median)} y={midY-boxH/2-8} textAnchor="middle" fontSize={9} fill="#f5a623" fontFamily="var(--font-dm-mono)">Méd. {secToPaceStr(median)}</text>
        <text x={xOf(q3)} y={midY+boxH/2+14} textAnchor="middle" fontSize={8} fill="#f5a623" opacity={0.7} fontFamily="var(--font-dm-mono)">Q1</text>
        <text x={xOf(q1)} y={midY+boxH/2+14} textAnchor="middle" fontSize={8} fill="#f5a623" opacity={0.7} fontFamily="var(--font-dm-mono)">Q3</text>
        {/* Points */}
        {paces.map(p=>{const px=xOf(paceToSec(p.speed)),isSel=p.id===selectedId,isHov=p.id===hoveredId;return(
          <g key={p.id} onClick={()=>onSelect(p.id===selectedId?-1:p.id)} onMouseEnter={()=>onHover(p.id)} onMouseLeave={()=>onHover(null)} style={{cursor:"pointer"}}>
            <rect x={px-12} y={midY-12} width={24} height={24} fill="transparent"/>
            <circle cx={px} cy={midY} r={isSel||isHov?8:5} fill={isSel?"#fff":isHov?"rgba(255,255,255,0.8)":"rgba(245,166,35,0.55)"} stroke={isSel||isHov?"#f5a623":"rgba(245,166,35,0.2)"} strokeWidth={isSel||isHov?2:1}/>
            {isSel&&<text x={px} y={midY-16} textAnchor="middle" fontSize={9} fill="#f5a623" fontFamily="var(--font-dm-mono)">{fmtPace(p.speed)}</text>}
          </g>
        );})}
      </svg>
      <div style={{display:"flex",gap:16,marginTop:6}}>
        {[{c:"var(--text-muted)",l:`Max · ${secToPaceStr(max)}`},{c:"#f5a623",l:`Médiane · ${secToPaceStr(median)}`},{c:"#1d9e75",l:`Min · ${secToPaceStr(min)} ← PR`}].map(({c,l})=><span key={l} style={{fontSize:11,color:c,fontFamily:"var(--font-dm-mono)"}}>{l}</span>)}
      </div>
    </div>
  );
}

function EvolutionLine({ paces, selectedId, hoveredId, onSelect, onHover }: { paces:{speed:number;date:string;id:number}[]; selectedId:number|null; hoveredId:number|null; onSelect:(id:number)=>void; onHover:(id:number|null)=>void }) {
  const chrono=[...paces].reverse();
  if(chrono.length<2) return null;
  const paceSecs=chrono.map(p=>paceToSec(p.speed));
  const minP=Math.min(...paceSecs),maxP=Math.max(...paceSecs),rngP=maxP-minP||1;
  const W=900,H=130,padL=52,padR=40,padT=20,padB=28;
  function xOf(i:number){return padL+(i/(chrono.length-1))*(W-padL-padR);}
  // paceToSec petit = bonne allure = EN HAUT (y petit = padT)
  function yOf(speed:number){return padT+((paceToSec(speed)-minP)/rngP)*(H-padT-padB);}
  const pathD=chrono.map((p,i)=>`${i===0?"M":"L"}${xOf(i).toFixed(1)},${yOf(p.speed).toFixed(1)}`).join(" ");
  const prSpeed=chrono[paceSecs.indexOf(minP)].speed;
  const prIdx=paceSecs.indexOf(minP);
  const step=Math.max(1,Math.floor(chrono.length/6));
  const yTicks=Array.from({length:4},(_,i)=>minP+Math.round((i/3)*rngP));
  return(
    <div>
      <p style={{...lbl,margin:"0 0 10px"}}>Évolution de l'allure</p>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} onMouseLeave={()=>onHover(null)}>
        <line x1={padL} y1={yOf(prSpeed)} x2={W-padR} y2={yOf(prSpeed)} stroke="#f5a623" strokeWidth={1} strokeDasharray="4 3" opacity={.35}/>
        <path d={pathD} fill="none" stroke="#f5a623" strokeWidth={1.5} strokeLinecap="round"/>
        {chrono.map((p,i)=>{const isSel=p.id===selectedId,isHov=p.id===hoveredId,isPR=i===prIdx;return(
          <g key={p.id} onClick={()=>onSelect(p.id===selectedId?-1:p.id)} onMouseEnter={()=>onHover(p.id)} onMouseLeave={()=>onHover(null)} style={{cursor:"pointer"}}>
            <rect x={xOf(i)-14} y={yOf(p.speed)-14} width={28} height={28} fill="transparent"/>
            <circle cx={xOf(i)} cy={yOf(p.speed)} r={isSel||isHov?7:isPR?5:3} fill={isSel?"#fff":isHov?"rgba(255,255,255,0.85)":isPR?"#f5a623":"var(--text-dim)"} stroke={isSel||isHov?"#f5a623":"none"} strokeWidth={2}/>
            {isSel&&<text x={xOf(i)} y={yOf(p.speed)-12} textAnchor="middle" fontSize={9} fill="#f5a623" fontFamily="var(--font-dm-mono)">{fmtPace(p.speed)}</text>}
          </g>
        );})}
        {chrono.filter((_,i)=>i===0||i===chrono.length-1||i%step===0).map(p=>{const i=chrono.indexOf(p);return<text key={p.id} x={xOf(i)} y={H-4} textAnchor="middle" fontSize={8} style={{fill:"var(--text-dim)"}} fontFamily="var(--font-geist)">{fmtDate(p.date)}</text>;})}
      </svg>
    </div>
  );
}


export default function AnalysePage() {
  const pathname = usePathname();
  const isDemo = pathname?.startsWith("/demo") ?? false;
  const [isLoggedIn,setIsLoggedIn]=useState(false);
  const [activities,setActivities]=useState<Activity[]>([]);
  const [parcoursList,setParcoursList]=useState<Parcours[]>([]);
  const [associations,setAssociations]=useState<Map<number,Parcours|null>>(new Map());
  const [loading,setLoading]=useState(true);
  const [selectedParcours,setSelectedParcours]=useState<string|null>(null);
  const [selectedActivityId,setSelectedActivityId]=useState<number|null>(null);
  const [hoveredId,setHoveredId]=useState<number|null>(null);
  const [filterAnnee,setFilterAnnee]=useState<string>("tout");
  const [filterKm,setFilterKm]=useState<number|null>(null);
  const [filterGroupe,setFilterGroupe]=useState<string>("tout");
  const [timeField,setTimeField]=useState<"moving_time"|"elapsed_time">("moving_time");
  const [stravaCompagnons,setStravaCompagnons]=useState<Map<number,{id:string;nom:string}[]>>(new Map());
  const [compagnonsPacelab,setCompagnonsPacelab]=useState<{id:string;nom:string;actif:boolean}[]>([]);

  useEffect(()=>{
    async function init(){
      const {createClient}=await import("@/lib/supabase");
      const supabase=createClient();
      const {data:{user}}=await supabase.auth.getUser();
      if(user) setIsLoggedIn(true);

      if(isDemo){
        const res=await fetch("/api/demo");
        if(res.ok){
          const json=await res.json();
          const runs=(json.activities??[]).filter(isRun);
          setActivities(runs);
          setIsLoggedIn(true);
          const parcoursBDD:Parcours[]=json.parcours||[];
          setParcoursList(parcoursBDD);
          const assocMap=new Map<number,Parcours|null>();
          (json.associations||[]).forEach((a:Association)=>{assocMap.set(Number(a.strava_activity_id),a.parcours);});
          runs.forEach((act:Activity)=>{
            if(!assocMap.has(act.id)){
              const match=parcoursBDD.find((p:Parcours)=>p.nom.toLowerCase()===act.name.trim().toLowerCase());
              if(match) assocMap.set(act.id,match);
            }
          });
          setAssociations(assocMap);
          const scData:(typeof json.stravaCompagnons[0])[]=(json.stravaCompagnons||[]);
          const scMap=new Map<number,{id:string;nom:string}[]>();
          scData.forEach((sc:{strava_activity_id:number;compagnon:{id:string;nom:string}|null})=>{const id=Number(sc.strava_activity_id);if(!scMap.has(id))scMap.set(id,[]);if(sc.compagnon)scMap.get(id)!.push(sc.compagnon);});
          setStravaCompagnons(scMap);
          setCompagnonsPacelab(json.compagnons||[]);
          const counts=new Map<string,number>();
          runs.forEach((a:Activity)=>{const p=assocMap.get(a.id);if(p) counts.set(p.id,(counts.get(p.id)??0)+1);});
          const top=[...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0];
          if(top) setSelectedParcours(top);
        }
        setLoading(false);
        return;
      }

      const res=await fetch("/api/strava/activities");
      if(res.ok){
        const json=await res.json();
        const runs=(json.activities??[]).filter(isRun);
        setActivities(runs);
        if(user){
          const [{ data:parc },assocRes]=await Promise.all([
            supabase.from("parcours").select("id,nom,distance_km,denivele_positif_m").eq("actif",true).eq("user_id",user.id).order("nom"),
            fetch("/api/strava/associations"),
          ]);
          const parcoursBDD:Parcours[]=parc||[];
          setParcoursList(parcoursBDD);
          const assocData:Association[]=assocRes.ok?await assocRes.json():[];
          const assocMap=new Map<number,Parcours|null>();
          assocData.forEach(a=>{assocMap.set(Number(a.strava_activity_id),a.parcours);});
          runs.forEach((act:Activity)=>{
            if(!assocMap.has(act.id)){
              const match=parcoursBDD.find((p:Parcours)=>p.nom.toLowerCase()===act.name.trim().toLowerCase());
              if(match) assocMap.set(act.id,match);
            }
          });
          setAssociations(assocMap);

          // Charge compagnons Pacelab + strava_compagnons
          const [{ data:comps }, scRes] = await Promise.all([
            supabase.from("compagnons").select("id,nom,actif").eq("user_id",user.id).order("nom"),
            fetch("/api/strava/compagnons"),
          ]);
          setCompagnonsPacelab(comps||[]);
          const scData:{strava_activity_id:number;compagnon:{id:string;nom:string}|null}[]=scRes.ok?await scRes.json():[];
          const scMap=new Map<number,{id:string;nom:string}[]>();
          scData.forEach(sc=>{const id=Number(sc.strava_activity_id);if(!scMap.has(id))scMap.set(id,[]);if(sc.compagnon)scMap.get(id)!.push(sc.compagnon);});
          setStravaCompagnons(scMap);

          // Charge la préférence moving/elapsed
          let prefs = null;
          try { const r = await supabase.from("user_preferences").select("time_field").eq("user_id", user.id).single(); prefs = r.data; } catch {}
          if(prefs && (prefs as {time_field?:string}).time_field) setTimeField((prefs as {time_field:string}).time_field as "moving_time"|"elapsed_time");

          const counts=new Map<string,number>();
          runs.forEach((a:Activity)=>{const p=assocMap.get(a.id);if(p) counts.set(p.id,(counts.get(p.id)??0)+1);});
          const top=[...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0];
          if(top) setSelectedParcours(top);
        }
      }
      setLoading(false);
    }
    init();
  },[]);

  // Helper : retourne la durée selon la préférence user
  function getTime(a:Activity):number { return timeField==="elapsed_time"?a.elapsed_time:a.moving_time; }

  const parcoursActif=parcoursList.find(p=>p.id===selectedParcours)??null;
  // Sans filtre groupe — utilisé pour les calculs de récupération (jours entre sorties)
  const actsForParcoursNoGroupFilter=activities
    .filter(a=>associations.get(a.id)?.id===selectedParcours)
    .filter(a=>filterAnnee==="tout"||a.start_date_local.startsWith(filterAnnee))
    .sort((a,b)=>new Date(b.start_date_local).getTime()-new Date(a.start_date_local).getTime());
  const actsForParcours=actsForParcoursNoGroupFilter
    .filter(a=>{
      const comps=stravaCompagnons.get(a.id)??[];
      const isGroupe=(a.athlete_count??1)>1||comps.length>0;
      if(filterGroupe==="solo"&&isGroupe) return false;
      if(filterGroupe==="groupe"&&!isGroupe) return false;
      if(filterGroupe.startsWith("comp_")){const cId=filterGroupe.replace("comp_","");if(!comps.some(c=>c.id===cId))return false;}
      return true;
    });
  const anneesDisponibles=Array.from(new Set(activities.filter(a=>associations.get(a.id)?.id===selectedParcours).map(a=>a.start_date_local.substring(0,4)))).sort((a,b)=>b.localeCompare(a));
  const paces=actsForParcours.map(a=>{const p=associations.get(a.id);const speed=p?.distance_km?(p.distance_km*1000)/getTime(a):a.average_speed;return{speed,date:a.start_date_local,id:a.id};});
  const selectedActivity=selectedActivityId&&selectedActivityId>0?actsForParcours.find(a=>a.id===selectedActivityId)??null:null;
  const selPaceNum=selectedActivity?(()=>{const p=associations.get(selectedActivity.id);return p?.distance_km?(p.distance_km*1000)/getTime(selectedActivity):selectedActivity.average_speed;})():null;

  return(
    <div style={{minHeight:"100vh"}}>
      <Navbar isLoggedIn={isLoggedIn} isDemo={isDemo}/>
      <main style={{padding:"24px",maxWidth:1100,margin:"0 auto"}}>
        <div style={{marginBottom:24}}>
          <p style={{fontSize:11,color:"var(--text-dim)",letterSpacing:"0.04em",textTransform:"uppercase",margin:"0 0 4px"}}>Analyses</p>
          <h1 style={{fontSize:22,fontWeight:500,color:"#fff",margin:0}}>Performance</h1>
        </div>

        {loading?(
          <div style={{textAlign:"center",padding:"60px 0",color:"var(--text-dim)",fontSize:13}}>Chargement...</div>
        ):(!isLoggedIn && !isDemo)?(
          <div style={{textAlign:"center",padding:"60px 0"}}><p style={{fontSize:13,color:"var(--text-dim)",fontFamily:"var(--font-geist)",margin:"0 0 16px"}}>Connecte-toi pour accéder aux analyses.</p><a href="/login" style={{fontSize:13,color:"#f5a623",fontFamily:"var(--font-geist)",textDecoration:"none"}}>Se connecter →</a></div>
        ):parcoursList.length===0?(
          <div style={{textAlign:"center",padding:"60px 0"}}><p style={{fontSize:13,color:"var(--text-dim)",fontFamily:"var(--font-geist)"}}>Aucun parcours associé. Associe des parcours à tes activités dans Mes Courses.</p></div>
        ):(
          <>
            {/* Sélecteur */}
            <div style={{marginBottom:20}}>
              <p style={{...lbl,margin:"0 0 10px"}}>Parcours</p>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {parcoursList.filter(p=>activities.some(a=>associations.get(a.id)?.id===p.id)).map(p=>{
                  const count=activities.filter(a=>associations.get(a.id)?.id===p.id).length;
                  const active=selectedParcours===p.id;
                  return<button key={p.id} onClick={()=>{setSelectedParcours(p.id);setSelectedActivityId(null);setFilterGroupe("tout");setFilterAnnee("tout");setHoveredId(null);}} style={{padding:"7px 16px",borderRadius:20,fontSize:13,fontFamily:"var(--font-geist)",cursor:"pointer",transition:"all .15s",border:active?"0.5px solid #f5a623":"0.5px solid var(--border-2)",background:active?"rgba(245,166,35,0.12)":"transparent",color:active?"#f5a623":"var(--text-dim)"}}>
                    {p.nom} <span style={{opacity:.6,fontSize:11}}>({count})</span>
                  </button>;
                })}
              </div>
            </div>

            {/* Filtre année */}
            {anneesDisponibles.length>1&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
              <p style={{...lbl,margin:"0 8px 0 0",alignSelf:"center"}}>Année</p>
              {["tout",...anneesDisponibles].map(a=>{const active=filterAnnee===a;return<button key={a} onClick={()=>{setFilterAnnee(a);setSelectedActivityId(null);setHoveredId(null);}} style={{padding:"5px 12px",borderRadius:20,fontSize:12,border:active?"0.5px solid #f5a623":"0.5px solid var(--border-2)",background:active?"rgba(245,166,35,0.12)":"transparent",color:active?"#f5a623":"var(--text-dim)",cursor:"pointer",fontFamily:"var(--font-geist)",transition:"all .15s"}}>{a==="tout"?"Tout":a}</button>;})}
            </div>}

            {/* Filtre groupe */}
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16,alignItems:"center"}}>
              <p style={{...lbl,margin:"0 8px 0 0",alignSelf:"center"}}>Groupe</p>
              {([["tout","Tous"],["solo","Solo"],["groupe","En groupe"]] as const).map(([v,label])=>{
                const active=filterGroupe===v;
                return<button key={v} onClick={()=>{setFilterGroupe(v);setSelectedActivityId(null);setHoveredId(null);}} style={{padding:"5px 12px",borderRadius:20,fontSize:12,border:active?"0.5px solid #f5a623":"0.5px solid var(--border-2)",background:active?"rgba(245,166,35,0.12)":"transparent",color:active?"#f5a623":"var(--text-dim)",cursor:"pointer",fontFamily:"var(--font-geist)",transition:"all .15s"}}>{label}</button>;
              })}
              {compagnonsPacelab.filter(c=>c.actif&&activities.some(a=>associations.get(a.id)?.id===selectedParcours&&stravaCompagnons.get(a.id)?.some(sc=>sc.id===c.id))).map(c=>{
                const v="comp_"+c.id,active=filterGroupe===v;
                return<button key={v} onClick={()=>{setFilterGroupe(v);setSelectedActivityId(null);setHoveredId(null);}} style={{padding:"5px 12px",borderRadius:20,fontSize:12,border:active?"0.5px solid #1d9e75":"0.5px solid var(--border-2)",background:active?"rgba(29,158,117,0.12)":"transparent",color:active?"#1d9e75":"var(--text-dim)",cursor:"pointer",fontFamily:"var(--font-geist)",transition:"all .15s"}}>{c.nom}</button>;
              })}
            </div>

            {parcoursActif&&actsForParcours.length>=2?(
              <>
                {/* KPIs */}
                <RevealOnScroll delay={0}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:16}}>
                  {(()=>{
                    const sp=[...paces].map(p=>paceToSec(p.speed)).sort((a,b)=>a-b);
                    const med=quantile(sp,.5),best=sp[0];
                    const last3=paces.slice(0,3).reduce((s,p)=>s+paceToSec(p.speed),0)/Math.min(3,paces.length);
                    // Régression linéaire sur l'axe temps → allure
                    // x = index chronologique (du plus ancien au plus récent)
                    // y = secondes/km (valeur élevée = allure lente)
                    // Coefficient directeur négatif = allure qui baisse = progression
                    let trend="—", tc="var(--text-dim)";
                    if(paces.length>=3){
                      const chrono=[...paces].reverse(); // du plus ancien au plus récent
                      const n=chrono.length;
                      const xs=chrono.map((_,i)=>i);
                      const ys=chrono.map(p=>paceToSec(p.speed));
                      const sumX=xs.reduce((a,b)=>a+b,0);
                      const sumY=ys.reduce((a,b)=>a+b,0);
                      const sumXY=xs.reduce((a,i)=>a+i*ys[i],0);
                      const sumX2=xs.reduce((a,i)=>a+i*i,0);
                      const slope=(n*sumXY-sumX*sumY)/(n*sumX2-sumX*sumX);
                      // slope < 0 = allure en baisse = progression
                      if(slope<-1) { trend="↗ Progression"; tc="#1d9e75"; }
                      else if(slope>1) { trend="↘ Régression"; tc="#e05050"; }
                      else { trend="→ Stable"; tc="var(--text-dim)"; }
                    }
                    return[{l:"Sorties",v:actsForParcours.length,c:undefined},{l:"Meilleure allure",v:secToPaceStr(best),c:undefined},{l:"Allure médiane",v:secToPaceStr(med),c:undefined},{l:"Moy. 3 dernières",v:secToPaceStr(last3),c:undefined},{l:"Tendance",v:trend,c:tc}].map(({l,v,c})=>(
                      <div key={l} className="bento-hover" style={card}><p style={{...lbl,margin:"0 0 6px"}}>{l}</p><p style={{fontSize:17,fontWeight:500,color:c??"var(--text-primary)",margin:0,fontFamily:"var(--font-dm-mono)"}}>{v}</p></div>
                    ));
                  })()}
                </div>
                </RevealOnScroll>

                {/* Infos parcours */}
                <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:16}}>
                  {parcoursActif.distance_km&&<span style={{fontSize:12,color:"var(--text-dim)",fontFamily:"var(--font-geist)"}}>📍 {parcoursActif.distance_km} km</span>}
                  {parcoursActif.denivele_positif_m&&<span style={{fontSize:12,color:"var(--text-dim)",fontFamily:"var(--font-geist)"}}>⛰ +{parcoursActif.denivele_positif_m}m D+</span>}
                  {parcoursActif.denivele_positif_m&&parcoursActif.distance_km&&<span style={{fontSize:12,color:"var(--text-dim)",fontFamily:"var(--font-geist)"}}>· {Math.round(parcoursActif.denivele_positif_m/parcoursActif.distance_km)} m/km</span>}
                </div>

                {/* Boxplot */}
                <RevealOnScroll delay={0}>
                <div className="bento-hover" style={{...card,marginBottom:16}}>
                  <p style={{...lbl,margin:"0 0 4px"}}>Distribution des allures</p>
                  <p style={{fontSize:11,color:"var(--text-dim)",margin:"0 0 16px",fontFamily:"var(--font-geist)"}}>Clique sur un point pour voir les détails d'une sortie</p>
                  <BoxPlot paces={paces} selectedId={selectedActivityId} hoveredId={hoveredId} onSelect={setSelectedActivityId} onHover={setHoveredId}/>
                </div>
                </RevealOnScroll>

                {/* Sortie sélectionnée */}
                {selectedActivity&&selPaceNum&&(
                  <div style={{background:"rgba(245,166,35,0.04)",border:"0.5px solid rgba(245,166,35,0.2)",borderRadius:10,padding:"14px 18px",marginBottom:16,display:"flex",gap:24,alignItems:"center",flexWrap:"wrap"}}>
                    <div><p style={{...lbl,margin:"0 0 2px",color:"#f5a623"}}>Sortie sélectionnée</p><p style={{fontSize:13,color:"var(--text-primary)",margin:0,fontFamily:"var(--font-geist)"}}>{fmtDate(selectedActivity.start_date_local)}</p></div>
                    {[{l:"Allure",v:fmtPace(selPaceNum)},{l:"Temps",v:fmtTime(getTime(selectedActivity))},{l:"D+",v:`+${Math.round(selectedActivity.total_elevation_gain)}m`},{l:"Groupe",v:(selectedActivity.athlete_count??1)>1?"👥 Groupe":"Solo"}].map(({l,v})=>(
                      <div key={l}><p style={{...lbl,margin:"0 0 2px"}}>{l}</p><p style={{fontSize:15,fontWeight:500,color:"#f5a623",margin:0,fontFamily:"var(--font-dm-mono)"}}>{v}</p></div>
                    ))}
                    {selectedActivity.private_note&&<p style={{fontSize:12,color:"var(--text-dim)",margin:0,fontFamily:"var(--font-geist)",fontStyle:"italic",flex:1}}>{selectedActivity.private_note}</p>}
                    <button onClick={()=>setSelectedActivityId(null)} style={{background:"transparent",border:"none",color:"var(--text-dim)",cursor:"pointer",fontSize:16}}>✕</button>
                  </div>
                )}

                {/* Évolution */}
                <RevealOnScroll delay={80}>
                <div className="bento-hover" style={{...card,marginBottom:16}}>
                  <EvolutionLine paces={paces} selectedId={selectedActivityId} hoveredId={hoveredId} onSelect={setSelectedActivityId} onHover={setHoveredId}/>
                </div>
                </RevealOnScroll>


                {/* ── 1. Corrélation Solo vs Groupe ─────────────────────── */}
                {(()=>{
                  const solo=actsForParcours.filter(a=>(a.athlete_count??1)<=1&&(stravaCompagnons.get(a.id)?.length??0)===0);
                  const groupe=actsForParcours.filter(a=>(a.athlete_count??1)>1||(stravaCompagnons.get(a.id)?.length??0)>0);
                  if(solo.length<1||groupe.length<1) return null;
                  const avgSpeed=(acts:Activity[])=>acts.reduce((s,a)=>{const p=associations.get(a.id);return s+(p?.distance_km?(p.distance_km*1000)/a.moving_time:a.average_speed);},0)/acts.length;
                  const sSolo=avgSpeed(solo),sGroupe=avgSpeed(groupe);
                  const diff=paceToSec(sSolo)-paceToSec(sGroupe); // positif = solo plus lent
                  const isBetterGroupe=diff>0;
                  return(
                    <div className="bento-hover" style={{...card,marginBottom:16}}>
                      <p style={{...lbl,margin:"0 0 16px"}}>Solo vs Groupe</p>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                        {[{l:"Allure moy. solo",v:fmtPace(sSolo),c:"var(--text-primary)",n:solo.length},{l:"Allure moy. groupe",v:fmtPace(sGroupe),c:"#1d9e75",n:groupe.length}].map(({l,v,c,n})=>(
                          <div key={l} style={{background:"var(--surface-2)",borderRadius:8,padding:"12px 14px"}}>
                            <p style={{...lbl,margin:"0 0 4px"}}>{l} <span style={{opacity:.6}}>({n} sorties)</span></p>
                            <p style={{fontSize:20,fontWeight:500,color:c,margin:0,fontFamily:"var(--font-dm-mono)"}}>{v}</p>
                          </div>
                        ))}
                      </div>
                      <p style={{fontSize:13,color:"#1d9e75",fontFamily:"var(--font-geist)",margin:0}}>
                        ↗ {isBetterGroupe?`Tu cours ${secToPaceStr(Math.abs(diff))}/km plus vite en groupe`:`Tu cours ${secToPaceStr(Math.abs(diff))}/km plus vite en solo`}
                      </p>
                    </div>
                  );
                })()}

                {/* ── 2. Analyse saisonnière ─────────────────────────────── */}
                {(()=>{
                  const byMonth=new Map<string,{speeds:number[];count:number}>();
                  actsForParcours.forEach(a=>{
                    const m=a.start_date_local.substring(0,7); // YYYY-MM
                    const p=associations.get(a.id);
                    const speed=p?.distance_km?(p.distance_km*1000)/getTime(a):a.average_speed;
                    if(!byMonth.has(m)) byMonth.set(m,{speeds:[],count:0});
                    byMonth.get(m)!.speeds.push(speed);
                    byMonth.get(m)!.count++;
                  });
                  const months=[...byMonth.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
                  if(months.length<2) return null;
                  const allSpeeds=months.map(([,v])=>v.speeds.reduce((a,b)=>a+b,0)/v.speeds.length);
                  const minSpd=Math.min(...allSpeeds),maxSpd=Math.max(...allSpeeds);
                  const globalPRSpeed=Math.max(...actsForParcours.map(a=>{const p=associations.get(a.id);return p?.distance_km?(p.distance_km*1000)/getTime(a):a.average_speed;}));
                  const W=900,H=140,padL=55,padR=20,padT=28,padB=32;
                  const nM=months.length;
                  function xOf(i:number){return padL+(nM<=1?0:i/(nM-1))*(W-padL-padR);}
                  // Bonnes allures EN HAUT — plage Y inclut le PR individuel
                  const minPaceAll=paceToSec(globalPRSpeed);
                  const maxPaceAll=paceToSec(minSpd);
                  const rngPace=maxPaceAll-minPaceAll||1;
                  function yOf(s:number){return padT+((paceToSec(s)-minPaceAll)/rngPace)*(H-padT-padB);}
                  const MOIS=["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
                  return(
                    <div className="bento-hover" style={{...card,marginBottom:16}}>
                      <p style={{...lbl,margin:"0 0 4px"}}>Analyse saisonnière</p>
                      <p style={{fontSize:11,color:"var(--text-dim)",margin:"0 0 14px",fontFamily:"var(--font-geist)"}}>Allure moyenne par mois — les meilleures allures sont en bas</p>
                      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
                        {months.map(([m,v],i)=>{
                          const avgSpd=v.speeds.reduce((a,b)=>a+b,0)/v.speeds.length;
                          const x=xOf(i),y=yOf(avgSpd),isPR=false; // isPR non utilisé par mois
                          const mIdx=parseInt(m.split("-")[1])-1;
                          return<g key={m}>
                            <line x1={x} y1={padT} x2={x} y2={H-padB} style={{stroke:"var(--border)"}} strokeWidth={1}/>
                            <circle cx={x} cy={y} r={isPR?7:5} fill={isPR?"#f5a623":"rgba(245,166,35,0.5)"}/>
                            <text x={x} y={H-4} textAnchor="middle" fontSize={9} style={{fill:"var(--text-dim)"}} fontFamily="var(--font-geist)">{MOIS[mIdx]} {m.split("-")[0].slice(2)}</text>
                            <text x={x} y={y-10} textAnchor="middle" fontSize={8} style={{fill:isPR?"#f5a623":"var(--text-muted)"}} fontFamily="var(--font-dm-mono)">{fmtPace(avgSpd)}</text>
                            {v.count>1&&<text x={x} y={y+20} textAnchor="middle" fontSize={7} style={{fill:"var(--text-dim)"}} fontFamily="var(--font-geist)">×{v.count}</text>}
                          </g>;
                        })}
                        <polyline points={months.map(([,v],i)=>`${xOf(i)},${yOf(v.speeds.reduce((a,b)=>a+b,0)/v.speeds.length)}`).join(" ")} fill="none" stroke="#f5a623" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
                        {/* Y axis labels */}
                        <text x={padL-4} y={yOf(minSpd)+4} textAnchor="end" fontSize={8} style={{fill:"var(--text-dim)"}} fontFamily="var(--font-dm-mono)">{fmtPace(minSpd)}</text>
                        <text x={padL-4} y={yOf(maxSpd)+4} textAnchor="end" fontSize={8} style={{fill:"var(--text-dim)"}} fontFamily="var(--font-dm-mono)">{fmtPace(maxSpd)}</text>
                        {/* Ligne PR */}
                        <line x1={padL} y1={yOf(globalPRSpeed)} x2={W-padR} y2={yOf(globalPRSpeed)} stroke="#f5a623" strokeWidth={1} strokeDasharray="4 3" opacity={0.5}/>
                        <text x={padL+6} y={yOf(globalPRSpeed)-4} fontSize={9} fill="#f5a623" fontFamily="var(--font-geist)">PR {fmtPace(globalPRSpeed)}</text>
                      </svg>
                    </div>
                  );
                })()}

                {/* ── 3. Récupération entre sorties ─────────────────────── */}
                {(()=>{
                  if(actsForParcoursNoGroupFilter.length<4) return null;
                  const chrono=[...actsForParcoursNoGroupFilter].reverse();
                  const points=chrono.slice(1).map((a,i)=>{
                    const prev=chrono[i];
                    const days=Math.round((new Date(a.start_date_local).getTime()-new Date(prev.start_date_local).getTime())/(86400000));
                    const p=associations.get(a.id);
                    const speed=p?.distance_km?(p.distance_km*1000)/getTime(a):a.average_speed;
                    return{days,speed,date:a.start_date_local,id:a.id};
                  }).filter(p=>p.days>0&&p.days<=30);
                  if(points.length<3) return null;
                  // Corrélation : repos long = meilleure allure ?
                  const avgDays=points.reduce((s,p)=>s+p.days,0)/points.length;
                  const shortRest=points.filter(p=>p.days<=avgDays);
                  const longRest=points.filter(p=>p.days>avgDays);
                  const avgSpeed=(pts:{speed:number}[])=>pts.length>0?pts.reduce((s,p)=>s+p.speed,0)/pts.length:0;
                  const sShort=avgSpeed(shortRest),sLong=avgSpeed(longRest);
                  const W=900,H=130,padL=55,padR=20,padT=20,padB=28;
                  const maxDays=Math.max(...points.map(p=>p.days));
                  const speeds=points.map(p=>p.speed);
                  const minPR=Math.min(...speeds),maxPR=Math.max(...speeds);
                  const minSpd=minPR,maxSpd=maxPR;
                  const minPace=paceToSec(maxPR),maxPace=paceToSec(minPR),rngPace=maxPace-minPace||1;
                  function xOf(d:number){return padL+(d/maxDays)*(W-padL-padR);}
                  function yOf(s:number){return padT+((paceToSec(s)-minPace)/rngPace)*(H-padT-padB);}
                  return(
                    <div className="bento-hover" style={{...card,marginBottom:16}}>
                      <p style={{...lbl,margin:"0 0 4px"}}>Récupération & performance</p>
                      <p style={{fontSize:11,color:"var(--text-dim)",margin:"0 0 14px",fontFamily:"var(--font-geist)"}}>Jours de repos avant la sortie vs allure — les meilleures allures sont en bas</p>
                      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{marginBottom:8}}>
                        {/* Grille X tous les 2j */}
                        {Array.from({length:Math.ceil(maxDays/2)},(_,i)=>(i+1)*2).filter(d=>d<=maxDays).map(d=>(
                          <g key={d}>
                            <line x1={xOf(d)} y1={padT} x2={xOf(d)} y2={H-padB} style={{stroke:"var(--border)"}} strokeWidth={1}/>
                            <text x={xOf(d)} y={H-4} textAnchor="middle" fontSize={8} style={{fill:"var(--text-dim)"}} fontFamily="var(--font-geist)">{d}j</text>
                          </g>
                        ))}
                        {/* Grille Y */}
                        {[minSpd,maxSpd].map((s,i)=>(
                          <g key={i}>
                            <line x1={padL} y1={yOf(s)} x2={W-padR} y2={yOf(s)} style={{stroke:"var(--border)"}} strokeWidth={1} strokeDasharray="3 2"/>
                            <text x={padL-4} y={yOf(s)+4} textAnchor="end" fontSize={8} style={{fill:"var(--text-dim)"}} fontFamily="var(--font-dm-mono)">{fmtPace(s)}</text>
                          </g>
                        ))}
                        {points.map(p=>{const isSel=p.id===selectedActivityId,isHov=p.id===hoveredId;return(
                          <g key={p.id} onClick={()=>setSelectedActivityId(p.id===selectedActivityId?null:p.id)} onMouseEnter={()=>setHoveredId(p.id)} onMouseLeave={()=>setHoveredId(null)} style={{cursor:"pointer"}}>
                            <rect x={xOf(p.days)-12} y={yOf(p.speed)-12} width={24} height={24} fill="transparent"/>
                            <circle cx={xOf(p.days)} cy={yOf(p.speed)} r={isSel||isHov?7:4} fill={isSel?"#fff":isHov?"rgba(255,255,255,0.8)":"rgba(245,166,35,0.6)"} stroke={isSel||isHov?"#f5a623":"rgba(245,166,35,0.2)"} strokeWidth={isSel||isHov?2:1}/>
            {isSel&&<text x={xOf(p.days)} y={yOf(p.speed)-12} textAnchor="middle" fontSize={9} fill="#f5a623" fontFamily="var(--font-dm-mono)">{fmtPace(p.speed)}</text>}
                          </g>
                        );})}
                      </svg>
                      {sShort>0&&sLong>0&&<p style={{fontSize:12,color:"var(--text-dim)",margin:0,fontFamily:"var(--font-geist)"}}>
                        Repos court (≤{Math.round(avgDays)}j) : <strong style={{color:"var(--text-muted)"}}>{fmtPace(sShort)}</strong> · Repos long (&gt;{Math.round(avgDays)}j) : <strong style={{color:"var(--text-muted)"}}>{fmtPace(sLong)}</strong>
                        {paceToSec(sLong)<paceToSec(sShort)?" · ↗ Tu cours mieux après plus de repos":" · ↗ Tu cours mieux avec peu de repos"}
                      </p>}
                    </div>
                  );
                })()}

                {/* ── 4. Prédicteur de PR ───────────────────────────────── */}
                {(()=>{
                  if(actsForParcours.length<5) return null;
                  const chrono=[...actsForParcours].reverse();
                  const n=chrono.length,xs=chrono.map((_,i)=>i),ys=chrono.map(a=>{const p=associations.get(a.id);return paceToSec(p?.distance_km?(p.distance_km*1000)/getTime(a):a.average_speed);});
                  const sumX=xs.reduce((a,b)=>a+b,0),sumY=ys.reduce((a,b)=>a+b,0),sumXY=xs.reduce((a,i)=>a+i*ys[i],0),sumX2=xs.reduce((a,i)=>a+i*i,0);
                  const slope=(n*sumXY-sumX*sumY)/(n*sumX2-sumX*sumX);
                  const intercept=(sumY-slope*sumX)/n;
                  const currentBestSec=Math.min(...ys);
                  if(slope>=0) return null; // pas de progression = pas de prédiction
                  // Combien de sorties pour battre le PR ?
                  const sortiesRestantes=Math.ceil((currentBestSec-intercept)/(-slope))-n;
                  if(sortiesRestantes<=0||sortiesRestantes>50) return null;
                  // Date estimée basée sur la fréquence moyenne
                  const freqJours=(new Date(chrono[n-1].start_date_local).getTime()-new Date(chrono[0].start_date_local).getTime())/(86400000*n);
                  const daysUntilPR=Math.round(sortiesRestantes*freqJours);
                  const datePR=new Date(); datePR.setDate(datePR.getDate()+daysUntilPR);
                  const dateStr=datePR.toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"});
                  const predictedPRSec=intercept+slope*(n+sortiesRestantes-1);
                  return(
                    <div className="bento-hover" style={{...card,marginBottom:16,background:"rgba(245,166,35,0.03)",border:"0.5px solid rgba(245,166,35,0.15)"}}>
                      <p style={{...lbl,color:"#f5a623",margin:"0 0 12px"}}>Prédicteur de PR</p>
                      <div style={{display:"flex",gap:20,flexWrap:"wrap",alignItems:"center"}}>
                        <div><p style={{...lbl,margin:"0 0 4px"}}>PR actuel</p><p style={{fontSize:22,fontWeight:500,color:"var(--text-primary)",margin:0,fontFamily:"var(--font-dm-mono)"}}>{secToPaceStr(currentBestSec)}</p></div>
                        <div style={{fontSize:20,color:"var(--text-dim)"}}>→</div>
                        <div><p style={{...lbl,margin:"0 0 4px"}}>PR prédit</p><p style={{fontSize:22,fontWeight:500,color:"#f5a623",margin:0,fontFamily:"var(--font-dm-mono)"}}>{secToPaceStr(predictedPRSec)}</p></div>
                        <div><p style={{...lbl,margin:"0 0 4px"}}>Dans environ</p><p style={{fontSize:22,fontWeight:500,color:"var(--text-primary)",margin:0,fontFamily:"var(--font-dm-mono)"}}>{sortiesRestantes} sorties</p></div>
                        <div><p style={{...lbl,margin:"0 0 4px"}}>Date estimée</p><p style={{fontSize:14,fontWeight:500,color:"var(--text-muted)",margin:0,fontFamily:"var(--font-geist)"}}>{dateStr}</p></div>
                      </div>
                      <p style={{fontSize:11,color:"var(--text-dim)",margin:"12px 0 0",fontFamily:"var(--font-geist)"}}>Basé sur la régression linéaire de ta progression. Si tu maintiens ton rythme actuel.</p>
                    </div>
                  );
                })()}

                {/* ── 5. Charge d'entraînement ─────────────────────────── */}
                {(()=>{
                  // Km par semaine sur toutes les activités (pas que ce parcours)
                  const allRuns=activities.filter(isRun);
                  const byWeek=new Map<string,{km:number;acts:number}>();
                  allRuns.forEach(a=>{
                    const d=new Date(a.start_date_local);
                    const mon=new Date(d); mon.setDate(d.getDate()-(d.getDay()||7)+1);
                    const wk=`${mon.getFullYear()}-${String(mon.getMonth()+1).padStart(2,"0")}-${String(mon.getDate()).padStart(2,"0")}`;
                    if(!byWeek.has(wk)) byWeek.set(wk,{km:0,acts:0});
                    const entry=byWeek.get(wk)!;
                    entry.km+=a.distance/1000; entry.acts++;
                  });
                  const weeks=[...byWeek.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-20);
                  if(weeks.length<4) return null;
                  const maxKm=Math.max(...weeks.map(([,v])=>v.km));
                  const W=900,H=110,padL=55,padR=10,padT=16,padB=28;
                  const barW=(W-padL-padR)/weeks.length*0.7;
                  const barSpacing=(W-padL-padR)/weeks.length;
                  function xOf(i:number){return padL+i*barSpacing+barSpacing/2;}
                  const avgKm=weeks.reduce((s,[,v])=>s+v.km,0)/weeks.length;
                  return(
                    <div className="bento-hover" style={{...card,marginBottom:16}}>
                      <p style={{...lbl,margin:"0 0 4px"}}>Charge d'entraînement</p>
                      <p style={{fontSize:11,color:"var(--text-dim)",margin:"0 0 14px",fontFamily:"var(--font-geist)"}}>Km courus par semaine (20 dernières semaines) · Moy: {avgKm.toFixed(1)} km/sem</p>
                      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
                        <line x1={padL} y1={padT+(1-avgKm/maxKm)*(H-padT-padB)} x2={W-padR} y2={padT+(1-avgKm/maxKm)*(H-padT-padB)} stroke="#f5a623" strokeWidth={1} strokeDasharray="4 3" opacity={.4}/>
                        {weeks.map(([wk,v],i)=>{
                          const barH=Math.max(2,(v.km/maxKm)*(H-padT-padB));
                          const bW=barSpacing*0.7,x=xOf(i)-bW/2,y=H-padB-barH;
                          const isAboveAvg=v.km>avgKm;
                          return<g key={wk}>
                            <rect x={x} y={y} width={bW} height={barH} fill={isAboveAvg?"rgba(245,166,35,0.7)":"rgba(245,166,35,0.3)"} rx={2}/>
                            {barH>12&&<text x={xOf(i)} y={y-3} textAnchor="middle" fontSize={7} style={{fill:isAboveAvg?"#f5a623":"var(--text-dim)"}} fontFamily="var(--font-dm-mono)">{v.km.toFixed(1)}</text>}
                            {i%4===0&&<text x={xOf(i)} y={H-4} textAnchor="middle" fontSize={8} style={{fill:"var(--text-dim)"}} fontFamily="var(--font-geist)">{wk.slice(5,10).replace("-",".")}</text>}
                          </g>;
                        })}
                        <line x1={padL} y1={padT} x2={W-padR} y2={padT} style={{stroke:"var(--border)"}} strokeWidth={1}/>
                        <text x={padL-4} y={padT+4} textAnchor="end" fontSize={8} style={{fill:"var(--text-dim)"}} fontFamily="var(--font-dm-mono)">{maxKm.toFixed(0)} km</text>
                        <line x1={padL} y1={H-padB} x2={W-padR} y2={H-padB} style={{stroke:"var(--border)"}} strokeWidth={1}/>
                        <text x={padL-4} y={H-padB+4} textAnchor="end" fontSize={8} style={{fill:"var(--text-dim)"}} fontFamily="var(--font-dm-mono)">0</text>
                      </svg>
                    </div>
                  );
                })()}

                {/* ── 6. Heatmap mensuelle ─────────────────────────────── */}
                {(()=>{
                  if(actsForParcours.length<3) return null;
                  // Construit une grille calendrier des sorties sur ce parcours
                  const years=[...new Set(actsForParcours.map(a=>a.start_date_local.substring(0,4)))].sort();
                  const bestSpeed=Math.max(...paces.map(p=>p.speed));
                  const worstSpeed=Math.min(...paces.map(p=>p.speed));
                  const rng=bestSpeed-worstSpeed||1;
                  const MOIS=["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
                  return(
                    <div className="bento-hover" style={{...card,marginBottom:16}}>
                      <p style={{...lbl,margin:"0 0 4px"}}>Heatmap des performances</p>
                      <p style={{fontSize:11,color:"var(--text-dim)",margin:"0 0 16px",fontFamily:"var(--font-geist)"}}>Chaque case = une sortie · Plus foncé = meilleure allure</p>
                      {years.map(yr=>{
                        const yearActs=actsForParcours.filter(a=>a.start_date_local.startsWith(yr));
                        return<div key={yr} style={{marginBottom:12}}>
                          <p style={{...lbl,margin:"0 0 8px",color:"var(--text-dim)"}}>{yr}</p>
                          <div style={{display:"grid",gridTemplateColumns:"repeat(12,1fr)",gap:4}}>
                            {Array.from({length:12},(_,mIdx)=>{
                              const monthActs=yearActs.filter(a=>parseInt(a.start_date_local.substring(5,7))-1===mIdx);
                              return<div key={mIdx}>
                                <p style={{fontSize:9,color:"var(--text-dim)",margin:"0 0 4px",fontFamily:"var(--font-geist)",textAlign:"center"}}>{MOIS[mIdx]}</p>
                                <div style={{display:"flex",flexDirection:"column",gap:3}}>
                                  {monthActs.length===0
                                    ?<div style={{height:24,borderRadius:4,background:"var(--surface-2)",border:"0.5px solid var(--border)"}}/>
                                    :monthActs.map(a=>{
                                      const p=associations.get(a.id);
                                      const speed=p?.distance_km?(p.distance_km*1000)/a.moving_time:a.average_speed;
                                      const intensity=(speed-worstSpeed)/rng; // 0=lent, 1=rapide
                                      const opacity=0.2+intensity*0.8;
                                      const isSelH=a.id===selectedActivityId,isHovH=a.id===hoveredId;
                      return<div key={a.id} title={`${fmtDate(a.start_date_local)} · ${fmtPace(speed)}`} onMouseEnter={()=>setHoveredId(a.id)} onMouseLeave={()=>setHoveredId(null)} onClick={()=>setSelectedActivityId(a.id===selectedActivityId?null:a.id)} style={{height:isSelH?30:24,borderRadius:4,background:isSelH?"#f5a623":isHovH?`rgba(245,166,35,${Math.min(1,opacity+0.3)})`:(`rgba(245,166,35,${opacity})`),border:isSelH?"2px solid #fff":isHovH?"0.5px solid #f5a623":"0.5px solid rgba(245,166,35,0.2)",cursor:"pointer",transition:"all .15s",boxShadow:isSelH?"0 0 8px rgba(245,166,35,0.6)":"none"}}/>;
                                    })
                                  }
                                </div>
                              </div>;
                            })}
                          </div>
                        </div>;
                      })}
                      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}>
                        <span style={{fontSize:10,color:"var(--text-dim)",fontFamily:"var(--font-geist)"}}>Lent</span>
                        {[.2,.4,.6,.8,1].map(o=><div key={o} style={{width:16,height:10,borderRadius:2,background:`rgba(245,166,35,${o})`}}/>)}
                        <span style={{fontSize:10,color:"var(--text-dim)",fontFamily:"var(--font-geist)"}}>Rapide</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Tableau classement */}
                <div className="bento-hover" style={{...card,padding:0,overflow:"hidden",marginBottom:16}}>
                  <div style={{padding:"12px 18px",borderBottom:"0.5px solid var(--border)"}}><p style={{...lbl,margin:0}}>Classement — {parcoursActif.nom}</p></div>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr style={{borderBottom:"0.5px solid var(--border)"}}>
                      {["#","Date","Allure","Temps","D+","Groupe","Note"].map(h=><th key={h} style={{padding:"7px 14px",textAlign:"left",fontSize:10,color:"var(--text-dim)",fontWeight:400,letterSpacing:".05em",textTransform:"uppercase",fontFamily:"var(--font-geist)"}}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {[...actsForParcours].map(a=>{const p=associations.get(a.id);const speed=p?.distance_km?(p.distance_km*1000)/getTime(a):a.average_speed;return{a,speed};}).sort((x,y)=>y.speed-x.speed).map(({a,speed},rank)=>{
                        const isSel=a.id===selectedActivityId,isHov=a.id===hoveredId,isPR=rank===0;
                        return<tr key={a.id} onClick={()=>setSelectedActivityId(a.id===selectedActivityId?null:a.id)} onMouseEnter={()=>setHoveredId(a.id)} onMouseLeave={()=>setHoveredId(null)} style={{borderBottom:"0.5px solid var(--border)",background:isSel?"var(--surface-2)":a.id===hoveredId?"rgba(255,255,255,0.03)":"transparent",cursor:"pointer",transition:"background .1s"}}>
                          <td style={{padding:"9px 14px",borderLeft:isSel||isHov?"2px solid #f5a623":"2px solid transparent"}}>{isPR?<span style={{fontSize:10,background:"rgba(245,166,35,.15)",border:"0.5px solid #f5a623",borderRadius:4,padding:"1px 5px",color:"#f5a623",fontFamily:"var(--font-geist)"}}>PR</span>:<span style={{fontSize:12,color:"var(--text-dim)",fontFamily:"var(--font-dm-mono)"}}>{rank+1}</span>}</td>
                          <td style={{padding:"9px 14px",fontSize:12,color:"var(--text-dim)",fontFamily:"var(--font-geist)"}}>{fmtDate(a.start_date_local)}</td>
                          <td style={{padding:"9px 14px"}}><span style={{fontSize:14,fontWeight:500,color:isPR?"#f5a623":"var(--text-primary)",fontFamily:"var(--font-dm-mono)"}}>{fmtPace(speed)}</span></td>
                          <td style={{padding:"9px 14px",fontSize:12,color:"var(--text-dim)",fontFamily:"var(--font-dm-mono)"}}>{fmtTime(getTime(a))}</td>
                          <td style={{padding:"9px 14px",fontSize:12,color:"var(--text-dim)",fontFamily:"var(--font-dm-mono)"}}>{a.total_elevation_gain>0?`+${Math.round(a.total_elevation_gain)}m`:"—"}</td>
                          <td style={{padding:"9px 14px",fontSize:12,color:"var(--text-dim)",fontFamily:"var(--font-geist)"}}>{(a.athlete_count??1)>1?"👥":"Solo"}</td>
                          <td style={{padding:"9px 14px",fontSize:11,color:"var(--text-dim)",fontFamily:"var(--font-geist)",fontStyle:"italic",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(a as Activity&{private_note?:string}).private_note||"—"}</td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>

              </>
            ):(
              <div style={{textAlign:"center",padding:"40px 0",color:"var(--text-dim)",fontSize:13,fontFamily:"var(--font-geist)"}}>{actsForParcours.length===0?"Aucune activité associée à ce parcours.":"Pas assez de sorties pour analyser (minimum 2)."}</div>
            )}
          </>
        )}
      </main>
    </div>
  );
}