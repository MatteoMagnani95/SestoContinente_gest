import EditForm from '@/components/EditForm';
import SceltaImmagini from '@/components/SceltaImmagini';
import {applicationLegalConfig} from '@/lib/application-config';
import {versioneImmagini,sceltaLabel,dataOra} from '@/lib/scelte';
import {cambiaScelta} from './immagini';
import Link from 'next/link';
import {requireUser} from '@/lib/security';
import {updateContact,updateEmergencyContact} from './actions';
export default async function MyProfile({searchParams}:{searchParams:Promise<{msg?:string}>}){
 const {supabase,user}=await requireUser();const {msg}=await searchParams;
 const {data:links}=await supabase.from('collegamenti_persone').select('persona_id').eq('utente_id',user.id);
 const {data:scelta}=await supabase.from('scelte_iscrizione').select('scelta,versione,registrata_il').eq('utente_id',user.id).eq('tipo','immagini').eq('versione',applicationLegalConfig(user.id).testMode?'TEST-COLLAUDO-1':versioneImmagini).order('id',{ascending:false}).limit(1).maybeSingle();
 const ids=links?.map(x=>x.persona_id)??[];
 const {data:people}=ids.length?await supabase.from('persone').select('id,nome,cognome,telefono,indirizzo,cap,comune').in('id',ids):{data:[]};
 const {data:contacts,error:contactsError}=ids.length?await supabase.from('contatti_emergenza').select('persona_id,nominativo,telefono').in('persona_id',ids):{data:[],error:null};
 return <div className="container narrow"><Link className="back-link" href="/area-personale">← Area personale</Link>
 <div className="page-intro"><p className="eyebrow">Profilo</p><h1>Impostazioni personali</h1><p>Gestisci i tuoi recapiti, i contatti di emergenza e le preferenze privacy. Per nome, codice fiscale e dati anagrafici rivolgiti alla segreteria.</p></div>
 {msg==='ok'&&<p className="notice success">Recapiti salvati.</p>}{msg==='errore'&&<p className="notice error">Impossibile modificare i recapiti.</p>}
 <section className="panel"><h2>Consenso foto e video</h2><p role="status">{sceltaLabel(scelta?.scelta)} · {scelta?.versione} {dataOra(scelta?.registrata_il)}</p><EditForm action={cambiaScelta}><SceltaImmagini value={scelta?.scelta}/><button className="button">Salva scelta</button></EditForm></section>
 {people?.map(p=><div key={p.id}><EditForm action={updateContact} className="panel stack"><h2>{p.cognome} {p.nome}</h2><input type="hidden" name="persona_id" value={p.id}/>
 <label>Telefono<input name="telefono" defaultValue={p.telefono??''}/></label><label>Indirizzo di residenza<input name="indirizzo" defaultValue={p.indirizzo??''}/></label>
 <div className="form-grid"><label>CAP<input name="cap" defaultValue={p.cap??''}/></label><label>Comune di residenza<input name="comune" defaultValue={p.comune??''}/></label></div>
 <button className="button">Salva recapiti</button></EditForm>
 <section className="panel"><h2>Contatto di emergenza · {p.nome} {p.cognome}</h2><p className="muted">Aggiorna il recapito della persona da contattare in caso di necessità.</p>
 {contactsError?<p role="alert">Impossibile caricare il contatto. Riprova prima di modificarlo.</p>:<EditForm action={updateEmergencyContact} className="stack"><input type="hidden" name="persona_id" value={p.id}/><label>Nome e cognome<input name="emergenza_nome" required minLength={2} maxLength={160} defaultValue={contacts?.find(c=>c.persona_id===p.id)?.nominativo??''}/></label><label>Numero di telefono<input type="tel" name="emergenza_telefono" required minLength={5} maxLength={32} defaultValue={contacts?.find(c=>c.persona_id===p.id)?.telefono??''}/></label><button className="button">Salva contatto di emergenza</button></EditForm>}
 </section></div>)}
 {msg==='emergenza_ok'&&<p role="status" className="notice success">Contatto di emergenza salvato.</p>}{msg==='emergenza_dati'&&<p role="alert" className="notice warning">Inserisci nome e numero di telefono validi.</p>}{msg==='emergenza_errore'&&<p role="alert" className="notice error">Impossibile salvare il contatto di emergenza.</p>}
 </div>;
}
