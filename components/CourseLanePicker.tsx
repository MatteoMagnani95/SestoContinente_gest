'use client';
import {useEffect,useRef,useState} from 'react';
import {checkLaneConflicts} from '@/app/gestionale/calendario-visivo/actions';
import {lessonInterval,formatRome} from '@/lib/course-tools';
import type {LanePreview} from '@/lib/calendar-tools';
export type PoolOption={id:string;nome:string;orari_disponibili?:string|null;limitazioni?:string|null};
export type LaneOption={id:string;piscina_id:string;numero:number;note?:string|null};
type Preview=LanePreview|{status:'idle'}|{status:'pending'};
export default function CourseLanePicker({pools,lanes,initialPool="",initialLanes=[],requirePool=false}:{requirePool?:boolean;pools:PoolOption[];lanes:LaneOption[];initialPool?:string;initialLanes?:string[]}){
 const [pool,setPool]=useState(initialPool),[chosen,setChosen]=useState<string[]>(initialLanes),[preview,setPreview]=useState<Preview>({status:'idle'}),[revision,setRevision]=useState(0);
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{const form=root.current?.closest('form');const reset=()=>{setPool(initialPool);setChosen(initialLanes);setPreview({status:'idle'});setRevision(n=>n+1);};form?.addEventListener('reset',reset);return()=>form?.removeEventListener('reset',reset);},[initialPool,initialLanes]);
 useEffect(()=>{
  const form=root.current?.closest('form');if(!form||!pool){setPreview({status:'idle'});return;}
  let generation=0,timer:ReturnType<typeof setTimeout>|undefined,disposed=false;
  function refresh(){
   const current=++generation;if(timer)clearTimeout(timer);const data=new FormData(form!);data.set('piscina_id',pool);
   try{lessonInterval(data);}catch{setPreview({status:'idle'});return;}
   setPreview({status:'pending'});
   timer=setTimeout(async()=>{try{const result=await checkLaneConflicts(data);if(!disposed&&current===generation)setPreview(result);}catch{if(!disposed&&current===generation)setPreview({status:'error',message:'Occupazione non verificabile. Riprova.'});}},450);
  }
  const changed=(e:Event)=>{const target=e.target;if(target instanceof HTMLInputElement&&['inizio','fine','giorno_inizio','giorno_fine','ora_inizio','ora_fine'].includes(target.name))refresh();};
  form.addEventListener('input',changed);form.addEventListener('change',changed);refresh();
  return()=>{disposed=true;generation++;if(timer)clearTimeout(timer);form.removeEventListener('input',changed);form.removeEventListener('change',changed);};
 },[pool,revision]);
 const available=lanes.filter(l=>l.piscina_id===pool).sort((a,b)=>a.numero-b.numero);
 const selectedPool=pools.find(p=>p.id===pool);
 const conflicts=preview.status==='ready'?preview.conflicts:[];
 // Mantieni selezionate le corsie in conflitto per permettere una correzione esplicita, ma blocca il submit nativo.
 useEffect(()=>{for(const element of root.current?.querySelectorAll<HTMLInputElement>('input[name="corsie_id"]')??[]){element.setCustomValidity(element.checked&&conflicts.some(b=>b.corsia_id===element.value)?'Corsia già prenotata: deselezionala o modifica l’orario.':'');}},[preview,chosen]);
 return <div className="course-lanes" ref={root}><input type="hidden" data-dirty-track data-dirty-initial={JSON.stringify(initialLanes)} value={JSON.stringify(chosen)} readOnly/><label>Piscina {requirePool?'(obbligatoria)':'(facoltativa)'}<select name="piscina_id" required={requirePool} value={pool} onChange={e=>{setPool(e.target.value);setChosen([]);setPreview({status:'idle'});}}><option value="">{requirePool?'Seleziona piscina…':'Lezione senza piscina / teorica'}</option>{pools.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>
 {pool&&<><div className="sc-card sc-pool-conditions"><strong>Condizioni dell’impianto</strong><p>Orari dichiarati: {selectedPool?.orari_disponibili||'Non acquisiti'}</p><p>Limitazioni: {selectedPool?.limitazioni||'Non acquisite'}</p><p className="tiny muted">Informazioni testuali: verifica le condizioni con il gestore. Non certificano la disponibilità contrattuale.</p></div><fieldset className="course-lane-list"><legend>Corsie da prenotare (facoltative)</legend>
 <div role="status" aria-live="polite">{preview.status==='idle'?'Inserisci data e orario per verificare le prenotazioni.':preview.status==='pending'?'Verifica delle prenotazioni in corso…':preview.status==='error'?preview.message:'Occupazione letta alle '+formatRome(preview.checkedAt)+'. Il controllo è ripetuto al salvataggio.'}</div>
 <button type="button" className="sc-button sc-button-secondary" onClick={()=>setRevision(n=>n+1)} disabled={preview.status==='pending'}>Aggiorna verifica</button>
 {available.length===0?<p className="tiny muted">Non ci sono corsie registrate per questa piscina.</p>:<div className="sc-lane-options">{available.map(l=>{const occupied=conflicts.filter(b=>b.corsia_id===l.id),checked=chosen.includes(l.id);return <div key={l.id} className={'sc-lane-option'+(occupied.length?' sc-lane-conflict':'')}><label className="check-label"><input type="checkbox" name="corsie_id" value={l.id} checked={checked} disabled={occupied.length>0&&!checked} onChange={e=>setChosen(current=>e.target.checked?[...current,l.id]:current.filter(x=>x!==l.id))}/> <strong>Corsia {l.numero}</strong></label><span className="sc-lane-state">{preview.status==='ready'?(occupied.length?'Prenotata nell’intervallo':'Non prenotata nel gestionale'):'Occupazione da verificare'}</span>{occupied.map(b=><small key={b.id}>{formatRome(b.inizio)} – {formatRome(b.fine)}</small>)}{l.note&&<small>Vincoli / note: {l.note}</small>}</div>;})}</div>}
 <p className="tiny muted">Nessuna prenotazione registrata non significa corsia disponibile. In caso di conflitto, il database annulla l’intera operazione.</p>
 </fieldset></>}
 </div>;
}
