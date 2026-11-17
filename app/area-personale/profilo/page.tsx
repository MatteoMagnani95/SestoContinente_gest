import Link from 'next/link';
import {requireUser} from '@/lib/security';
import {updateContact} from './actions';
export default async function MyProfile({searchParams}:{searchParams:Promise<{msg?:string}>}){
 const {supabase,user}=await requireUser();const {msg}=await searchParams;
 const {data:links}=await supabase.from('collegamenti_persone').select('persona_id').eq('utente_id',user.id);
 const ids=links?.map(x=>x.persona_id)??[];
 const {data:people}=ids.length?await supabase.from('persone').select('id,nome,cognome,telefono,indirizzo,cap,comune').in('id',ids):{data:[]};
 return <div className="container narrow"><Link className="back-link" href="/area-personale">← Area personale</Link>
 <div className="page-intro"><p className="eyebrow">Profilo</p><h1>Aggiorna recapiti</h1><p>Puoi modificare i recapiti collegati alla tua anagrafica. Per nome, codice fiscale e dati anagrafici rivolgiti alla segreteria.</p></div>
 {msg==='ok'&&<p className="notice success">Recapiti salvati.</p>}{msg==='errore'&&<p className="notice error">Impossibile modificare i recapiti.</p>}
 {people?.map(p=><form action={updateContact} key={p.id} className="panel stack"><h2>{p.cognome} {p.nome}</h2><input type="hidden" name="persona_id" value={p.id}/>
 <label>Telefono<input name="telefono" defaultValue={p.telefono??''}/></label><label>Indirizzo di residenza<input name="indirizzo" defaultValue={p.indirizzo??''}/></label>
 <div className="form-grid"><label>CAP<input name="cap" defaultValue={p.cap??''}/></label><label>Comune di residenza<input name="comune" defaultValue={p.comune??''}/></label></div>
 <button className="button">Salva recapiti</button></form>)}
 </div>;
}
