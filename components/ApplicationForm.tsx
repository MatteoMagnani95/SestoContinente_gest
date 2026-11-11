'use client';
import { useState } from 'react';
import { saveApplicationAction } from '@/app/actions';

type RequestDraft = {
  nome: string; cognome: string; data_nascita: string; luogo_nascita: string;
  codice_fiscale: string | null; indirizzo: string; cap: string; comune: string;
  telefono: string; nome_tutore: string | null; cognome_tutore: string | null;
  parentela_tutore: string | null; presa_visione: boolean;
};
function minorAge(birth: string) {
  if (!birth) return false;
  const date = new Date(`${birth}T12:00:00`);
  const age18 = new Date(date);
  age18.setFullYear(age18.getFullYear() + 18);
  return age18 > new Date();
}
export default function ApplicationForm({ saved }: {saved?:RequestDraft|null}) {
  const [birth, setBirth] = useState(saved?.data_nascita ?? '');
  const minor = minorAge(birth);
  return <form action={saveApplicationAction} className="panel application-form">
    <div className="section-head"><span className="step">01</span><div><h2>Dati della persona da iscrivere</h2><p className="muted">Se l'allievo è minorenne, inserisci qui i suoi dati.</p></div></div>
    <div className="form-grid">
      <label>Nome *<input name="nome" required minLength={2} defaultValue={saved?.nome}/></label>
      <label>Cognome *<input name="cognome" required minLength={2} defaultValue={saved?.cognome}/></label>
      <label>Data di nascita *<input name="data_nascita" type="date" required value={birth} onChange={e=>setBirth(e.target.value)}/></label>
      <label>Luogo di nascita *<input name="luogo_nascita" required minLength={2} defaultValue={saved?.luogo_nascita}/></label>
      <label className="span-2">Codice fiscale (se disponibile)<input name="codice_fiscale" autoCapitalize="characters" maxLength={16} defaultValue={saved?.codice_fiscale??''} placeholder="Codice fiscale italiano o identificativo valido"/><span className="hint">Se non possiedi un codice fiscale italiano, lascia vuoto: la segreteria verificherà la situazione.</span></label>
    </div>
    <div className="section-head"><span className="step">02</span><div><h2>Residenza e recapito</h2><p className="muted">I dati sono utilizzati per gestire la richiesta.</p></div></div>
    <div className="form-grid">
      <label className="span-2">Indirizzo di residenza *<input name="indirizzo" required defaultValue={saved?.indirizzo}/></label>
      <label>CAP *<input name="cap" required minLength={4} maxLength={10} defaultValue={saved?.cap}/></label>
      <label>Comune *<input name="comune" required defaultValue={saved?.comune}/></label>
      <label className="span-2">Telefono di contatto *<input name="telefono" type="tel" required minLength={5} defaultValue={saved?.telefono}/></label>
    </div>
    {minor && <div className="minor-panel">
      <div className="section-head"><span className="step">03</span><div><h2>Genitore o tutore</h2><p>Per un minorenne l'account e la domanda sono presentati dal genitore o tutore.</p></div></div>
      <div className="form-grid">
        <label>Nome del tutore *<input name="nome_tutore" required minLength={2} defaultValue={saved?.nome_tutore??''}/></label>
        <label>Cognome del tutore *<input name="cognome_tutore" required minLength={2} defaultValue={saved?.cognome_tutore??''}/></label>
        <label className="span-2">Relazione con il minore *<select name="parentela_tutore" defaultValue={saved?.parentela_tutore??''} required><option value="">Seleziona...</option><option value="Madre">Madre</option><option value="Padre">Padre</option><option value="Tutore legale">Tutore legale</option></select></label>
      </div>
    </div>}
    <div className="section-head"><span className="step">{minor?'04':'03'}</span><div><h2>Conferma</h2><p className="muted">Ambiente di prova: inserire esclusivamente dati inventati.</p></div></div>
    <label className="check-label"><input name="presa_visione" type="checkbox" defaultChecked={saved?.presa_visione ?? false}/><span>Confermo che i dati sono fittizi e che questa è una simulazione tecnica. Prima della raccolta di dati reali saranno disponibili documentazione associativa e informativa privacy.</span></label>
    <div className="form-actions"><button className="button ghost" type="submit" name="intent" value="bozza">Salva bozza</button><button className="button" type="submit" name="intent" value="invia">Invia alla segreteria</button></div>
  </form>;
}
