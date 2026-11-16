import Link from 'next/link';
import {requireUser} from '@/lib/security';
import {caricaCertificato} from './actions';
export default async function CertificateUpload({searchParams}:{searchParams:Promise<{msg?:string}>}){
 const {supabase,user}=await requireUser();const {msg}=await searchParams;
 const {data:links}=await supabase.from('collegamenti_persone').select('persona_id').eq('utente_id',user.id);
 const ids=(links??[]).map(x=>x.persona_id);
 const {data:people}=ids.length?await supabase.from('persone').select('id,nome,cognome').in('id',ids):{data:[]};
 return <div className="container narrow"><Link className="back-link" href="/area-personale">← Area personale</Link>
 <div className="page-intro"><p className="eyebrow">Documenti personali</p><h1>Carica certificato medico</h1>
 <p>Il certificato resta privato. La data di scadenza e l'idoneità saranno verificate dalla segreteria: il caricamento non implica idoneità convalidata.</p></div>
 {msg==='ok'&&<p className="notice success">Documento ricevuto, in attesa di verifica amministrativa.</p>}
 {msg&&msg!=='ok'&&<p className="notice error">Invio non riuscito: controlla data, documento, permessi e configurazione.</p>}
 <form action={caricaCertificato} className="panel stack">
 <label>Persona<select name="persona_id" required><option value="">Seleziona...</option>{(people??[]).map(p=><option value={p.id} key={p.id}>{p.cognome} {p.nome}</option>)}</select></label>
 <div className="form-grid"><label>Rilasciato il<input name="rilasciato_il" type="date" required/></label><label>Scadenza<input name="scade_il" type="date" required/></label></div>
 <label>Certificato privato (PDF, JPG o PNG, massimo 10 MB)<input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png" required/></label>
 <div className="form-actions"><button className="button">Carica certificato</button><Link className="button ghost" href="/area-personale">Annulla / Torna indietro</Link></div>
 </form></div>;
}
