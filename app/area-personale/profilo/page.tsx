import EditForm from '@/components/EditForm';
import SceltaImmagini from '@/components/SceltaImmagini';
import {applicationLegalConfig} from '@/lib/application-config';
import {consentStatus} from '@/lib/application-input';
import {versioneImmagini,dataOra} from '@/lib/scelte';
import {cambiaScelta} from './immagini';
import Link from 'next/link';
import {requireUser} from '@/lib/security';
import {updateContact} from './actions';
export default async function MyProfile({searchParams}:{searchParams:Promise<{msg?:string}>}){
 const {supabase,user}=await requireUser();const {msg}=await searchParams;
 const {data:links}=await supabase.from('collegamenti_persone').select('persona_id').eq('utente_id',user.id);
 const legal=applicationLegalConfig(user.id),version=legal.testMode?'TEST-COLLAUDO-1':versioneImmagini;
 const {data:scelta,error:sceltaError}=await supabase.from('scelte_iscrizione').select('id,scelta,versione,registrata_il').eq('utente_id',user.id).eq('tipo','immagini').eq('versione',version).order('id',{ascending:false}).limit(1).maybeSingle();
 const previous=scelta?.scelta===false?await supabase.from('scelte_iscrizione').select('id',{head:true,count:'exact'}).eq('utente_id',user.id).eq('tipo','immagini').eq('versione',version).eq('scelta',true).lt('id',scelta.id):null;
 const ids=links?.map(x=>x.persona_id)??[];
 const {data:people}=ids.length?await supabase.from('persone').select('id,nome,cognome,telefono,indirizzo,cap,comune').in('id',ids):{data:[]};
 return <div className="container narrow"><Link className="back-link" href={ids.length?'/area-personale':'/richiesta/stato'}>{ids.length?'← Area personale':'← La mia domanda'}</Link>
 <div className="page-intro"><p className="eyebrow">Profilo</p><h1>Profilo e consensi</h1><p>Gestisci le tue dichiarazioni e i recapiti collegati alla tua anagrafica. Per nome, codice fiscale e dati anagrafici rivolgiti alla segreteria.</p></div>
 {msg==='ok'&&<p className="notice success">Recapiti salvati.</p>}{msg==='errore'&&<p className="notice error">Impossibile modificare i recapiti.</p>}
 <section className="panel"><h2>Consenso foto e video</h2>{legal.testMode&&<p className="notice warning">COLLAUDO — scelta simulata.</p>}{sceltaError?<p role="alert">Scelta non disponibile. Riprova prima di modificare il consenso.</p>:<><p role="status">{previous?.error?'Stato storico non verificabile':consentStatus(scelta?.scelta,(previous?.count??0)>0)}{scelta?.versione?' · '+scelta.versione:''} {dataOra(scelta?.registrata_il)}</p><EditForm key={String(scelta?.id??'new')} action={cambiaScelta}><SceltaImmagini value={scelta?.scelta} test={legal.testMode}/><button type="submit" className="button">Salva scelta</button></EditForm></>}</section>
 {people?.map(p=><form action={updateContact} key={p.id} className="panel stack"><h2>{p.cognome} {p.nome}</h2><input type="hidden" name="persona_id" value={p.id}/>
 <label>Telefono<input name="telefono" defaultValue={p.telefono??''}/></label><label>Indirizzo di residenza<input name="indirizzo" defaultValue={p.indirizzo??''}/></label>
 <div className="form-grid"><label>CAP<input name="cap" defaultValue={p.cap??''}/></label><label>Comune di residenza<input name="comune" defaultValue={p.comune??''}/></label></div>
 <button className="button">Salva recapiti</button></form>)}
 </div>;
}
