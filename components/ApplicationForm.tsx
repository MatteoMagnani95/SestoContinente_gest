'use client';
import { useState,useRef,type FormEvent } from 'react';
import {useRouter} from 'next/navigation';
import {markFormSaved} from '@/lib/dirty-navigation';
import { saveApplicationAction } from '@/app/actions';
import {validaCF} from '@/lib/codice-fiscale';
import SceltaImmagini from '@/components/SceltaImmagini';

type RequestDraft = {
  nome: string; cognome: string; data_nascita: string; luogo_nascita: string;
  codice_fiscale: string | null; provincia_nascita?:string|null; stato_nascita?:string|null; sesso_cf?:string|null; indirizzo: string; cap: string; comune: string;
  telefono: string; nome_tutore: string | null; cognome_tutore: string | null;
  parentela_tutore: string | null; presa_visione: boolean;flag_statuto?:boolean;flag_privacy?:boolean;immagini_scelta?:boolean|null;emergenza_nome?:string;emergenza_telefono?:string;
};
function minorAge(birth: string) {
  if (!birth) return false;
  const date = new Date(`${birth}T12:00:00`);
  const age18 = new Date(date);
  age18.setFullYear(age18.getFullYear() + 18);
  return age18 > new Date();
}
export default function ApplicationForm({ saved,sceltaRegistrata,legalConfigured,testMode,statutoUrl,privacyUrl }: {saved?:RequestDraft|null;sceltaRegistrata?:boolean|null;legalConfigured:boolean;testMode:boolean;statutoUrl:string;privacyUrl:string}) {
  const [birth, setBirth] = useState(saved?.data_nascita ?? '');
  const minor = minorAge(birth);
  const [cf,setCf]=useState(saved?.codice_fiscale??'');
  const cfBlocked=Boolean(cf.trim())&&!validaCF(cf);
  const router=useRouter();
  const [error,setError]=useState('');const [pending,setPending]=useState(false);const submitting=useRef(false);
  async function submit(e:FormEvent<HTMLFormElement>){
   e.preventDefault();if(submitting.current)return;
   const form=e.currentTarget;
   if(!legalConfigured){setError('Statuto e informativa privacy non configurati: contatta la segreteria.');return;}
   const data=new FormData(form);const button=(e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null;data.set('intent',button?.value==='bozza'?'bozza':'invia');
   submitting.current=true;setPending(true);setError('');
   try{const result=await saveApplicationAction(data);if(result.error){setError(result.error);return;}if(result.next){markFormSaved(form);router.push(result.next);router.refresh();}}
   catch{setError('Invio non riuscito. I dati compilati sono ancora presenti: riprova o contatta la segreteria.');}
   finally{submitting.current=false;setPending(false);}
  }
  return <form data-dirty-form onSubmit={submit} className="panel application-form">
    {testMode&&<div className="notice warning" role="status"><strong>COLLAUDO — pratica simulata.</strong> Usa esclusivamente dati inventati. Le dichiarazioni sotto simulano il flusso di adesione: non costituiscono una presa visione di documenti ufficiali.</div>}
    {!legalConfigured&&<div className="notice error" role="alert">Registrazione non disponibile: la segreteria deve configurare statuto e informativa privacy prima di raccogliere le adesioni.</div>}
    <div className="section-head"><span className="step">01</span><div><h2>Dati della persona da iscrivere</h2><p className="muted">Se l'allievo è minorenne, inserisci qui i suoi dati.</p></div></div>
    <div className="form-grid">
      <label>Nome *<input name="nome" required minLength={2} defaultValue={saved?.nome}/></label>
      <label>Cognome *<input name="cognome" required minLength={2} defaultValue={saved?.cognome}/></label>
      <label>Data di nascita *<input name="data_nascita" type="date" required value={birth} onChange={e=>setBirth(e.target.value)}/></label>
      <label>Comune di nascita (o città estera) *<input name="luogo_nascita" required minLength={2} defaultValue={saved?.luogo_nascita}/></label>
      <label>Provincia di nascita (sigla, per l'Italia)<input name="provincia_nascita" maxLength={2} autoCapitalize="characters" defaultValue={saved?.provincia_nascita??''}/></label>
      <label>Stato di nascita *<input name="stato_nascita" required maxLength={100} defaultValue={saved?.stato_nascita??'Italia'}/></label>
      <label>Sesso anagrafico per il CF<select name="sesso_cf" defaultValue={saved?.sesso_cf??''}><option value="">Non indicato</option><option value="M">M</option><option value="F">F</option></select></label>
      <label className="span-2">Codice fiscale (se disponibile)<input name="codice_fiscale" autoCapitalize="characters" maxLength={16} value={cf} onChange={e=>setCf(e.target.value.toUpperCase())} aria-invalid={cfBlocked} placeholder="CF ufficiale di 16 caratteri"/>{cfBlocked&&<span role="alert">Controlla i 16 caratteri del codice fiscale.</span>}<span className="hint">Se non possiedi un codice fiscale italiano, lascia vuoto: la segreteria verificherà la situazione.</span></label>
    </div>

    <div className="section-head"><span className="step">02</span><div><h2>Residenza e recapito</h2><p className="muted">I dati sono utilizzati per gestire la richiesta.</p></div></div>
    <div className="form-grid">
      <label className="span-2">Indirizzo di residenza *<input name="indirizzo" required defaultValue={saved?.indirizzo}/></label>
      <label>CAP *<input name="cap" required minLength={4} maxLength={10} defaultValue={saved?.cap}/></label>
      <label>Comune di residenza *<input name="comune" required defaultValue={saved?.comune}/></label>
      <label className="span-2">Telefono di contatto *<input name="telefono" type="tel" required minLength={5} defaultValue={saved?.telefono}/></label>
    </div>
    <fieldset><legend>Contatto di emergenza (facoltativo per l’adesione)</legend><div className="form-grid"><label>Nome e cognome<input minLength={2} maxLength={160} name="emergenza_nome" defaultValue={saved?.emergenza_nome??''}/></label>
    <label>Numero di telefono<input type="tel" minLength={5} maxLength={32} name="emergenza_telefono" defaultValue={saved?.emergenza_telefono??''}/></label></div></fieldset>
    {minor && <div className="minor-panel">
      <div className="section-head"><span className="step">03</span><div><h2>Genitore o tutore</h2><p>Per un minorenne l'account e la domanda sono presentati dal genitore o tutore.</p></div></div>
      <div className="form-grid">
        <label>Nome del tutore *<input name="nome_tutore" required minLength={2} defaultValue={saved?.nome_tutore??''}/></label>
        <label>Cognome del tutore *<input name="cognome_tutore" required minLength={2} defaultValue={saved?.cognome_tutore??''}/></label>
        <label className="span-2">Relazione con il minore *<select name="parentela_tutore" defaultValue={saved?.parentela_tutore??''} required><option value="">Seleziona...</option><option value="Madre">Madre</option><option value="Padre">Padre</option><option value="Tutore legale">Tutore legale</option></select></label>
      </div>
    </div>}
    <div className="section-head"><span className="step">{minor?'04':'03'}</span><div><h2>Conferma</h2><p className="muted">{testMode?'Ambiente di prova: inserire esclusivamente dati inventati.':'Controlla i dati e le dichiarazioni prima di inviare la richiesta.'}</p></div></div>
    <label className="check-label"><input name="flag_statuto" type="checkbox" required defaultChecked={saved?.flag_statuto??false}/><span>{testMode?"Simulo la presa visione dello ":"Dichiaro di aver preso visione dello "}<a href={statutoUrl||'#'} target="_blank" rel="noopener noreferrer">{testMode?"Statuto di prova":"Statuto associativo"}</a>{testMode?" (solo collaudo).":" e di accettarne le disposizioni."} *</span></label>
    <label className="check-label"><input name="flag_privacy" type="checkbox" required defaultChecked={saved?.flag_privacy??false}/><span>{testMode?"Simulo la lettura dell’":"Dichiaro di aver ricevuto e letto l’"}<a href={privacyUrl||'#'} target="_blank" rel="noopener noreferrer">{testMode?"informativa di prova":"informativa privacy"}</a>{testMode?" (solo collaudo).":" (presa visione, non consenso generico al trattamento)."} *</span></label>
    <SceltaImmagini value={sceltaRegistrata} test={testMode}/>
    <div aria-live="polite">{error&&<p className="notice error" role="alert">{error}</p>}{pending&&<p>Salvataggio in corso…</p>}</div>
    <div className="form-actions"><button className="button ghost" type="submit" name="intent" value="bozza" disabled={pending||cfBlocked||!legalConfigured}>Salva bozza</button><button className="button" type="submit" name="intent" value="invia" disabled={pending||cfBlocked||!legalConfigured}>Invia alla segreteria</button><a className="button ghost" href="/area-personale">Annulla / Torna indietro</a></div>
  </form>;
}
