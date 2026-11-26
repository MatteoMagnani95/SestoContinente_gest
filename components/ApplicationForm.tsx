'use client';
import { useState,useRef,useEffect,type FormEvent } from 'react';
import {useRouter} from 'next/navigation';
import {validBirthDate,minorAge,todayRome,imageChoice} from '@/lib/application-input';
import {markFormSaved} from '@/lib/dirty-navigation';
import { saveApplicationAction } from '@/app/actions';
import {validaCF} from '@/lib/codice-fiscale';
import SceltaImmagini from '@/components/SceltaImmagini';
import {Button,Alert} from '@/components/ui/Primitives';

type RequestDraft = {
  nome: string; cognome: string; data_nascita: string; luogo_nascita: string;
  codice_fiscale: string | null; provincia_nascita?:string|null; stato_nascita?:string|null; sesso_cf?:string|null; indirizzo: string; cap: string; comune: string;
  telefono: string; nome_tutore: string | null; cognome_tutore: string | null;
  parentela_tutore: string | null; presa_visione: boolean;flag_statuto?:boolean;flag_privacy?:boolean;immagini_scelta?:boolean|null;emergenza_nome?:string;emergenza_telefono?:string;
};
export default function ApplicationForm({ saved,sceltaRegistrata,legalConfigured,testMode,statutoUrl,privacyUrl }: {saved?:RequestDraft|null;sceltaRegistrata?:boolean|null;legalConfigured:boolean;testMode:boolean;statutoUrl:string;privacyUrl:string}) {
  const reviewDialog=useRef<HTMLDialogElement>(null),reviewButton=useRef<HTMLButtonElement>(null),formRef=useRef<HTMLFormElement>(null),reviewTrigger=useRef<HTMLButtonElement|null>(null);
  const [review,setReview]=useState<FormData|null>(null);
  const [birth, setBirth] = useState(saved?.data_nascita ?? '');
  const minor = minorAge(birth);
  const [cf,setCf]=useState(saved?.codice_fiscale??'');
  const cfBlocked=Boolean(cf.trim())&&!validaCF(cf);
  const router=useRouter();
  const [error,setError]=useState('');const [pending,setPending]=useState(false);const submitting=useRef(false);
  useEffect(()=>{const dialog=reviewDialog.current;if(review&&dialog&&!dialog.open){dialog.showModal();reviewButton.current?.focus();}},[review]);
  function closeReview(){if(submitting.current)return;reviewDialog.current?.close();setReview(null);reviewTrigger.current?.focus();}
  async function persist(form:HTMLFormElement,data:FormData){
   if(submitting.current)return;
   submitting.current=true;setPending(true);setError('');
   try{const result=await saveApplicationAction(data);if(result.error){setError(result.error);reviewDialog.current?.close();setReview(null);const field=result.field?form.elements.namedItem(result.field):null;if(field instanceof HTMLElement)requestAnimationFrame(()=>field.focus());return;}if(result.next){markFormSaved(form);reviewDialog.current?.close();setReview(null);router.push(result.next);router.refresh();}}
   catch{setError('Invio non riuscito. I dati compilati sono ancora presenti: riprova o contatta la segreteria.');reviewDialog.current?.close();setReview(null);}
   finally{submitting.current=false;setPending(false);}
  }
  async function submit(e:FormEvent<HTMLFormElement>){
   e.preventDefault();if(submitting.current||review)return;
   const form=e.currentTarget;
   if(!legalConfigured){setError('Statuto e informativa privacy non configurati: contatta la segreteria.');return;}
   if(!validBirthDate(birth)){setError('Controlla la data di nascita.');return;}
   const data=new FormData(form);const button=(e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null;
   const draft=button?.value==='bozza';data.set('intent',draft?'bozza':'invia');
   if(draft){await persist(form,data);return;}
   setError('');reviewTrigger.current=button;setReview(data);
  }
  const value=(key:string)=>String(review?.get(key)??'').trim();
  const reviewRows=review?[
    ['Nome e cognome',[value('nome'),value('cognome')].join(' ')],
    ['Data di nascita',value('data_nascita')],['Luogo di nascita',[value('luogo_nascita'),value('provincia_nascita'),value('stato_nascita')].filter(Boolean).join(' · ')],
    ['Sesso ai fini del CF',value('sesso_cf')],['Codice fiscale',value('codice_fiscale')],
    ['Residenza',[value('indirizzo'),value('cap'),value('comune')].filter(Boolean).join(' · ')],['Telefono',value('telefono')],
    ['Contatto di emergenza',[value('emergenza_nome'),value('emergenza_telefono')].filter(Boolean).join(' · ')],
    ...(minorAge(value('data_nascita'))?[['Genitore o tutore',[value('nome_tutore'),value('cognome_tutore'),value('parentela_tutore')].filter(Boolean).join(' · ')]]:[]),
    ['Statuto',review.get('flag_statuto')==='on'?'Presa visione confermata':'Non confermata'],
    ['Privacy',review.get('flag_privacy')==='on'?'Presa visione confermata':'Non confermata'],
    ['Foto e video',imageChoice(review)==='si'?'Autorizzazione prestata':'Autorizzazione non prestata']
  ]:[];
  return <><form ref={formRef} data-dirty-form onSubmit={submit} className="sc-card application-form sc-application" aria-busy={pending}>
    <fieldset className="edit-fields" disabled={pending}>
    {testMode&&<div className="notice warning" role="status"><strong>COLLAUDO — pratica simulata.</strong> Usa esclusivamente dati inventati. Le dichiarazioni sotto simulano il flusso di adesione: non costituiscono una presa visione di documenti ufficiali.</div>}
    {!legalConfigured&&<div className="notice error" role="alert">Registrazione non disponibile: la segreteria deve configurare statuto e informativa privacy prima di raccogliere le adesioni.</div>}
    <nav className="sc-application-progress" aria-label="Sezioni della domanda"><a href="#dati-persona">1. Dati personali</a><a href="#recapiti">2. Recapiti{minor?' e tutore':''}</a><a href="#dichiarazioni">3. Dichiarazioni</a><span>4. Riepilogo e invio</span></nav>
    <p className="sc-field-hint">I campi contrassegnati con * sono obbligatori. Puoi salvare una bozza dopo aver compilato i dati richiesti e le dichiarazioni.</p>
    <div id="dati-persona" className="section-head"><span className="step">01</span><div><h2>Dati della persona da iscrivere</h2><p className="muted">Se l'allievo è minorenne, inserisci qui i suoi dati.</p></div></div>
    <div className="form-grid">
      <label>Nome *<input name="nome" required minLength={2} defaultValue={saved?.nome}/></label>
      <label>Cognome *<input name="cognome" required minLength={2} defaultValue={saved?.cognome}/></label>
      <label>Data di nascita *<input name="data_nascita" type="date" required min="1900-01-01" max={todayRome()} data-dirty-initial={saved?.data_nascita??''} value={birth} onChange={e=>setBirth(e.target.value)}/></label>
      <label>Comune di nascita (o città estera) *<input name="luogo_nascita" required minLength={2} defaultValue={saved?.luogo_nascita}/></label>
      <label>Provincia di nascita (sigla, per l'Italia)<input name="provincia_nascita" maxLength={2} autoCapitalize="characters" defaultValue={saved?.provincia_nascita??''}/></label>
      <label>Stato di nascita *<input name="stato_nascita" required maxLength={100} defaultValue={saved?.stato_nascita??'Italia'}/></label>
      <label>Sesso anagrafico per il CF<select name="sesso_cf" defaultValue={saved?.sesso_cf??''}><option value="">Non indicato</option><option value="M">M</option><option value="F">F</option></select></label>
      <label className="span-2">Codice fiscale (se disponibile)<input name="codice_fiscale" autoCapitalize="characters" maxLength={16} data-dirty-initial={saved?.codice_fiscale??''} value={cf} onChange={e=>setCf(e.target.value.toUpperCase())} aria-invalid={cfBlocked} placeholder="CF ufficiale di 16 caratteri"/>{cfBlocked&&<span role="alert">Controlla i 16 caratteri del codice fiscale.</span>}<span className="hint">Se non possiedi un codice fiscale italiano, lascia vuoto: la segreteria verificherà la situazione.</span></label>
    </div>

    <div id="recapiti" className="section-head"><span className="step">02</span><div><h2>Residenza e recapito</h2><p className="muted">I dati sono utilizzati per gestire la richiesta.</p></div></div>
    <div className="form-grid">
      <label className="span-2">Indirizzo di residenza *<input name="indirizzo" required defaultValue={saved?.indirizzo}/></label>
      <label>CAP *<input name="cap" required minLength={4} maxLength={10} defaultValue={saved?.cap}/></label>
      <label>Comune di residenza *<input name="comune" required defaultValue={saved?.comune}/></label>
      <label className="span-2">Telefono di contatto *<input name="telefono" type="tel" required minLength={5} defaultValue={saved?.telefono}/></label>
    </div>
    <fieldset><legend>Contatto di emergenza (facoltativo per l’adesione)</legend><div className="form-grid"><label>Nome e cognome<input minLength={2} maxLength={160} name="emergenza_nome" defaultValue={saved?.emergenza_nome??''}/></label>
    <label>Numero di telefono<input type="tel" minLength={5} maxLength={32} name="emergenza_telefono" defaultValue={saved?.emergenza_telefono??''}/></label></div></fieldset>
    {minor && <div className="minor-panel sc-form-section">
      <div className="section-head"><span className="step">2b</span><div><h2>Genitore o tutore</h2><p>Per un minorenne l'account e la domanda sono presentati dal genitore o tutore.</p></div></div>
      <div className="form-grid">
        <label>Nome del tutore *<input name="nome_tutore" required minLength={2} defaultValue={saved?.nome_tutore??''}/></label>
        <label>Cognome del tutore *<input name="cognome_tutore" required minLength={2} defaultValue={saved?.cognome_tutore??''}/></label>
        <label className="span-2">Relazione con il minore *<select name="parentela_tutore" defaultValue={saved?.parentela_tutore??''} required><option value="">Seleziona...</option><option value="Madre">Madre</option><option value="Padre">Padre</option><option value="Tutore legale">Tutore legale</option></select></label>
      </div>
    </div>}
    <div id="dichiarazioni" className="section-head"><span className="step">03</span><div><h2>Privacy e dichiarazioni</h2><p className="muted">{testMode?'Ambiente di prova: inserire esclusivamente dati inventati.':'Controlla i dati e le dichiarazioni prima di inviare la richiesta.'}</p></div></div>
    <label className="check-label"><input name="flag_statuto" type="checkbox" required defaultChecked={saved?.flag_statuto??false}/><span>{testMode?"Simulo la presa visione dello ":"Dichiaro di aver preso visione dello "}{statutoUrl?<a href={statutoUrl} target="_blank" rel="noopener noreferrer">{testMode?"Statuto di prova":"Statuto associativo"}</a>:<strong>Statuto non disponibile</strong>}{testMode?" (solo collaudo).":" e di accettarne le disposizioni."} *</span></label>
    <label className="check-label"><input name="flag_privacy" type="checkbox" required defaultChecked={saved?.flag_privacy??false}/><span>{testMode?"Simulo la lettura dell’":"Dichiaro di aver ricevuto e letto l’"}{privacyUrl?<a href={privacyUrl} target="_blank" rel="noopener noreferrer">{testMode?"informativa di prova":"informativa privacy"}</a>:<strong>informativa non disponibile</strong>}{testMode?" (solo collaudo).":" (presa visione, non consenso generico al trattamento)."} *</span></label>
    <SceltaImmagini value={sceltaRegistrata} test={testMode}/>
    </fieldset>
    <div aria-live="polite">{error&&<p className="notice error" role="alert">{error}</p>}{pending&&<p>Salvataggio in corso…</p>}</div>
    <div className="form-actions"><button className="button ghost" type="submit" name="intent" value="bozza" disabled={pending||cfBlocked||!legalConfigured}>Salva bozza</button><button className="button" type="submit" name="intent" value="invia" disabled={pending||cfBlocked||!legalConfigured}>Controlla e invia</button><a className="button ghost" href="/richiesta/stato">Torna alla domanda</a></div>
  </form>
  {review&&<dialog ref={reviewDialog} className="sc-editor-dialog sc-editor-modal sc-application-review" aria-labelledby="sc-review-title" onCancel={e=>{e.preventDefault();closeReview();}}><div className="sc-editor-inner"><header className="sc-editor-header"><h2 id="sc-review-title">Riepilogo della domanda</h2></header><div className="sc-editor-body"><p>Controlla i dati e le dichiarazioni. La segreteria riceverà la domanda solo dopo la conferma.</p>{testMode&&<Alert tone="warning">COLLAUDO — invio simulato.</Alert>}<dl className="sc-review-list">{reviewRows.map(([label,content])=><div key={label}><dt>{label}</dt><dd>{content||'Non indicato'}</dd></div>)}</dl><div className="sc-form-actions"><button ref={reviewButton} className="sc-button sc-button-secondary" type="button" disabled={pending} onClick={closeReview}>Torna a modificare</button><Button type="button" disabled={pending} onClick={()=>{if(formRef.current&&review)void persist(formRef.current,review);}}>{pending?'Invio in corso…':'Conferma e invia alla segreteria'}</Button></div></div></div></dialog>}</>;
}
