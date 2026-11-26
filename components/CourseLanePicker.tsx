'use client';
import {useEffect,useRef,useState} from 'react';
export type PoolOption={id:string;nome:string};
export type LaneOption={id:string;piscina_id:string;numero:number};
export default function CourseLanePicker({pools,lanes,initialPool="",initialLanes=[],requirePool=false}:{requirePool?:boolean;pools:PoolOption[];lanes:LaneOption[];initialPool?:string;initialLanes?:string[]}){
 const [pool,setPool]=useState(initialPool);
 const [chosen,setChosen]=useState<string[]>(initialLanes);
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{const form=root.current?.closest('form');const reset=()=>{setPool(initialPool);setChosen(initialLanes);};form?.addEventListener('reset',reset);return()=>form?.removeEventListener('reset',reset);},[initialPool,initialLanes]);
 const available=lanes.filter(l=>l.piscina_id===pool).sort((a,b)=>a.numero-b.numero);
 return <div className="course-lanes" ref={root}><input type="hidden" data-dirty-track data-dirty-initial={JSON.stringify(initialLanes)} value={JSON.stringify(chosen)} readOnly/><label>Piscina {requirePool?'(obbligatoria)':'(facoltativa)'}<select name="piscina_id" required={requirePool} value={pool} onChange={e=>{setPool(e.target.value);setChosen([]);}}><option value="">Lezione senza piscina / teorica</option>{pools.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>
 {pool&&<fieldset className="course-lane-list"><legend>Corsie da prenotare (facoltative)</legend>
  {available.length===0?<p className="tiny muted">Non ci sono corsie registrate per questa piscina.</p>:<div className="course-lane-grid">{available.map(l=><label className="check-label" key={l.id}><input type="checkbox" name="corsie_id" value={l.id} checked={chosen.includes(l.id)} onChange={e=>setChosen(current=>e.target.checked?[...current,l.id]:current.filter(x=>x!==l.id))}/> Corsia {l.numero}</label>)}</div>}
  <p className="tiny muted">Se una corsia è già occupata nello stesso intervallo, l'intera operazione viene annullata.</p>
 </fieldset>}
 </div>;
}
