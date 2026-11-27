import {PageHeader,Alert} from '@/components/ui/Primitives';
import {Drawer} from '@/components/ui/Drawer';
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
 const {data:links,error:linkError}=await supabase.from('collegamenti_persone').select('persona_id').eq('utente_id',user.id);
 const legal=applicationLegalConfig(user.id),version=legal.testMode?'TEST-COLLAUDO-1':versioneImmagini;
 const {data:ultima,error:sceltaError}=await supabase.from('scelte_iscrizione').select('id,scelta,versione,registrata_il,origine').eq('utente_id',user.id).eq('tipo','immagini').order('id',{ascending:false}).limit(1).maybeSingle();
 const scelta=ultima?.versione===version?ultima:null;
 const previous=scelta?.scelta===false?await supabase.from('scelte_iscrizione').select('id',{head:true,count:'exact'}).eq('utente_id',user.id).eq('tipo','immagini').eq('versione',version).eq('scelta',true).lt('id',scelta.id):null;
 const ids=links?.map(x=>x.persona_id)??[];
 const {data:people,error:peopleError}=ids.length?await supabase.from('persone').select('id,nome,cognome,telefono,indirizzo,cap,comune').in('id',ids):{data:[],error:null};
 return <div className="container narrow"><Link className="back-link" href={ids.length?'/area-personale':'/richiesta/stato'}>{ids.length?'← Area personale':'← La mia domanda'}</Link>
 <PageHeader area="secretariat" icon="user" marine eyebrow="Profilo" title="Profilo e consensi" description="Gestisci le tue dichiarazioni e i recapiti collegati alla tua anagrafica. Per nome, codice fiscale e dati anagrafici rivolgiti alla segreteria."/>
 {msg==='ok'&&<p className="notice success">Recapiti salvati.</p>}{msg==='errore'&&<p className="notice error">Impossibile modificare i recapiti.</p>}
 <section className="sc-card"><h2>Consenso foto e video</h2>{legal.testMode&&<p className="notice warning">COLLAUDO — scelta simulata.</p>}{sceltaError?<p role="alert">Scelta non disponibile. Riprova prima di modificare il consenso.</p>:<><p role="status">{previous?.error?'Stato storico non verificabile':consentStatus(scelta?.scelta,(previous?.count??0)>0)}{scelta?.versione?' · '+scelta.versione:''} {dataOra(scelta?.registrata_il)}{scelta?.origine?' · Origine: '+scelta.origine:scelta?' · Origine non registrata':''}</p>{ultima&&!scelta&&<p className="tiny muted">La scelta precedente appartiene a un’altra versione: non è acquisita per quella corrente.</p>}<EditForm key={String(ultima?.id??'new')} action={cambiaScelta}><SceltaImmagini value={scelta?.scelta} test={legal.testMode} expectedId={ultima?String(ultima.id):null}/><button type="submit" className="button">Salva scelta</button></EditForm></>}</section>
 {(linkError||peopleError)&&<Alert tone="warning">Recapiti non disponibili.</Alert>}{people?.map(p=><section className="sc-card" key={p.id}><h2>{p.cognome} {p.nome}</h2><p>{p.telefono??'Telefono non indicato'} · {p.comune??'Comune non indicato'}</p><Drawer title={'Modifica recapiti · '+p.nome} trigger="Modifica recapiti"><EditForm action={updateContact} className="stack"><input type="hidden" name="persona_id" value={p.id}/>
 <label>Telefono<input name="telefono" defaultValue={p.telefono??''}/></label><label>Indirizzo di residenza<input name="indirizzo" defaultValue={p.indirizzo??''}/></label>
 <div className="form-grid"><label>CAP<input name="cap" defaultValue={p.cap??''}/></label><label>Comune di residenza<input name="comune" defaultValue={p.comune??''}/></label></div>
 <button className="button">Salva recapiti</button></EditForm></Drawer></section>)}
 </div>;
}
