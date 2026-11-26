'use client';
import {useEffect,useRef,useState} from 'react';
import {enrollmentEligibility} from '@/lib/course-ui';
type Candidate={id:string;name:string;membership:string|null;hasValidCard:boolean;eligible:boolean;alreadyEnrolled:boolean;isDirector:boolean;unavailable:boolean;emergencyName?:string;emergencyPhone?:string};
export default function CourseStudentPicker({people,full=false}:{people:Candidate[];full?:boolean}){
 const root=useRef<HTMLDivElement>(null),[search,setSearch]=useState(''),[id,setId]=useState('');
 const [name,setName]=useState(''),[phone,setPhone]=useState('');
 useEffect(()=>{const form=root.current?.closest('form');const reset=()=>{setSearch('');setId('');setName('');setPhone('');};form?.addEventListener('reset',reset);return()=>form?.removeEventListener('reset',reset);},[]);
 const norm=(x:string)=>x.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase('it');
 const visible=people.filter(p=>p.id===id||norm(search).split(/\s+/).every(t=>norm(p.name).includes(t)));
 const selected=people.find(p=>p.id===id),reason=selected?enrollmentEligibility(selected):'';
 return <div ref={root} className="stack">
 <label>Cerca persona<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nome o cognome" data-dirty-ignore/></label>
 <label>Allievo<select name="persona_id" required value={id} onChange={e=>{setId(e.target.value);setName('');setPhone('');}}><option value="">Seleziona persona…</option>{visible.map(p=><option key={p.id} value={p.id}>{p.name}{enrollmentEligibility(p)?' · Non iscrivibile':' · Iscrivibile'}</option>)}</select></label>
 {selected&&<div className="sc-card"><p>Adesione: <strong>{selected.membership?.replaceAll('_',' ')??'Non acquisita'}</strong></p><p>Tesseramento: <strong>{selected.unavailable?'Da verificare':selected.hasValidCard?'Attivo e valido':'Non valido o mancante'}</strong></p><p role="status" className={'notice '+(reason?'warning':'success')}>{reason||'Requisiti associativi attuali soddisfatti'}</p><p>Contatto di emergenza registrato: {selected.emergencyName?[selected.emergencyName,selected.emergencyPhone].filter(Boolean).join(' · '):'Non acquisito'}</p></div>}
 <fieldset><legend>Contatto di emergenza</legend><p className="hint">Lascia entrambi i campi vuoti per conservare il contatto esistente. Per aggiornarlo inserisci entrambi i valori.</p><div className="form-grid"><label>Nome e cognome<input name="emergenza_nome" value={name} onChange={e=>setName(e.target.value)} required={Boolean(phone)} minLength={2} maxLength={160}/></label><label>Telefono<input name="emergenza_telefono" type="tel" value={phone} onChange={e=>setPhone(e.target.value)} required={Boolean(name)} minLength={5} maxLength={32}/></label></div></fieldset>
 <input type="hidden" name="stato" value="iscritto"/>{full&&<p className="notice warning">Capienza raggiunta. Non puoi aggiungere un altro allievo.</p>}<button type="submit" className="button" disabled={!selected||Boolean(reason)||full}>Conferma iscrizione</button>
 </div>;
}
