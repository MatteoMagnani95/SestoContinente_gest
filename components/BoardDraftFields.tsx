'use client';
import {useState,useEffect,useRef} from 'react';
import {tipiVerbale} from '@/lib/cda-documenti';
import BoardFile from '@/components/BoardFile';
export default function BoardDraftFields(){
 const [date,setDate]=useState(''),[subject,setSubject]=useState(''),[type,setType]=useState(''),root=useRef<HTMLDivElement>(null);
 useEffect(()=>{const form=root.current?.closest('form');const reset=()=>{setDate('');setSubject('');setType('');};form?.addEventListener('reset',reset);return()=>form?.removeEventListener('reset',reset);},[]);
 return <div className="stack" ref={root}><fieldset className="sc-form-section"><legend>Dati della seduta</legend><label>Data CdA<input type="date" name="data_consiglio" required value={date} onChange={e=>setDate(e.target.value)}/></label><label>Oggetto<input name="oggetto" required maxLength={500} value={subject} onChange={e=>setSubject(e.target.value)}/></label><label>Tipologia<select name="tipo" required value={type} onChange={e=>setType(e.target.value)}><option value="">Seleziona tipologia…</option>{tipiVerbale.map(t=><option key={t}>{t}</option>)}</select></label></fieldset>
 <fieldset className="sc-form-section"><legend>Carica bozza originale</legend><BoardFile required label="Bozza originale"/><p className="tiny muted">Il PDF è una trascrizione del testo Word, non una riproduzione fedele dell’impaginazione.</p></fieldset>
 <section className="sc-card"><h3>Adesioni e riepilogo</h3><p>Le eventuali adesioni sono selezionate e confermate all’apertura della votazione, dopo il caricamento della bozza.</p><p><strong>Data:</strong> {date?date.split('-').reverse().join('/'):'Da indicare'}</p><p><strong>Oggetto:</strong> {subject||'Da indicare'}</p><p><strong>Tipologia:</strong> {type||'Da indicare'}</p></section></div>;
}
