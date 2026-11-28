import {statoSingolo} from '@/lib/certificati';
import {PageHeader,Alert,StatusBadge} from '@/components/ui/Primitives';
import Link from 'next/link';
import {requireUser} from '@/lib/security';
import CertificateUploadForm from '@/components/CertificateUploadForm';
export default async function CertificateUpload({searchParams}:{searchParams:Promise<{msg?:string;persona?:string;origine?:string}>}){
 const {supabase,user}=await requireUser();const {msg,persona,origine}=await searchParams;
 const {data:links,error:linkError}=await supabase.from('collegamenti_persone').select('persona_id').eq('utente_id',user.id);
 const ids=(links??[]).map(x=>x.persona_id);
 if(persona&&/^[a-f0-9-]{36}$/i.test(persona)&&!ids.includes(persona)&&(await supabase.rpc('is_staff')).data===true)ids.push(persona);
 const fromManagement=origine==='gestionale'&&(await supabase.rpc('is_staff')).data===true;
 const back=fromManagement?'/gestionale/moduli/certificati':'/area-personale';
 const {data:certs,error:certError}=ids.length?await supabase.from('stato_certificati').select('id,persona_id,documento_id,scade_il,stato_certificato').in('persona_id',ids).order('creato_il',{ascending:false}):{data:[],error:null};
 const {data:people,error:peopleError}=ids.length?await supabase.from('persone').select('id,nome,cognome').in('id',ids):{data:[],error:null};
 return <div className="container narrow"><Link className="back-link" href={back}>{fromManagement?'← Certificati medici':'← Area personale'}</Link>
 <PageHeader area="certificate" icon="certificate" marine eyebrow="Documenti personali" title="Carica certificato medico" description="Il certificato resta privato. La data di scadenza e l'idoneità saranno verificate dalla segreteria: il caricamento non implica idoneità convalidata."/>
 {msg==='ok'&&<p className="notice success">Documento ricevuto, in attesa di verifica amministrativa.</p>}
 {msg&&msg!=='ok'&&<p className="notice error">Invio non riuscito: controlla data, documento, permessi e configurazione.</p>}
 <section className="panel"><h2>Certificati caricati</h2>{certError||linkError||peopleError?<Alert tone="warning">Certificati o profili non verificabili.</Alert>:certs?.length?certs.map(c=><article key={c.id}><strong>{people?.find(p=>p.id===c.persona_id)?.cognome} · {statoSingolo(c.stato_certificato)}</strong> · Scadenza {c.scade_il} · {c.documento_id?<a href={'/documenti/'+c.documento_id}>Apri certificato</a>:<a href="#carica">Carica certificato</a>}</article>):<p>Documento mancante</p>}</section>
 {!linkError&&!peopleError&&<CertificateUploadForm fromManagement={fromManagement}>
 <label>Persona<select name="persona_id" defaultValue={persona??(ids.length===1?ids[0]:'')} required><option value="">Seleziona...</option>{(people??[]).map(p=><option value={p.id} key={p.id}>{p.cognome} {p.nome}</option>)}</select></label>
 <div className="form-grid"><label>Rilasciato il<input name="rilasciato_il" type="date" required/></label><label>Scadenza<input name="scade_il" type="date" required/></label></div>
 <label>Certificato privato (PDF o JPG/JPEG, massimo 10 MB)<input type="file" name="file" accept=".pdf,.jpg,.jpeg" required/></label>
 <div className="form-actions"><button className="button">Carica certificato</button><Link className="button ghost" href={back}>Annulla / Torna indietro</Link></div>
 </CertificateUploadForm>}</div>;
}
