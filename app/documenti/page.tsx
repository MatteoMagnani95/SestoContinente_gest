import {DataTable,FilterBar,SearchBar,Pagination} from '@/components/ui/DataTable';
import {cleanSearch,pageNumber,listHref} from '@/lib/module-ui';
import {Drawer,ConfirmDialog} from '@/components/ui/Drawer';
import ActionForm from '@/components/ui/ActionForm';
import Link from 'next/link';
import {requireUser} from '@/lib/security';
import {uploadDocument,deleteDocument,editDocumentMetadata} from './actions';
export default async function Documenti({searchParams}:{searchParams:Promise<{msg?:string;pubblica?:string;q?:string;p?:string;ambito?:string}>}){
 const {supabase,user}=await requireUser();
 const {data:roles}=await supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id);
 const isStaff=roles?.some(r=>r.ruolo==='amministratore'||r.ruolo==='segreteria')??false;
 const isAdmin=roles?.some(r=>r.ruolo==='amministratore')??false;
 const {msg,pubblica,q='',p,ambito=''}=await searchParams;
 const page=pageNumber(p),size=30,search=cleanSearch(q);
 let query=supabase.from('gest_elenco_documenti').select('id,nome,categoria,ambito,visibilita,caricato_il,dimensione_bytes,scadenza_conservazione,sort_cognome,sort_nome',{count:'exact'});
 if(search)query=query.or('nome.ilike.%'+search+'%,categoria.ilike.%'+search+'%');
 if(['associazione','personale','didattica','amministrativo'].includes(ambito))query=query.eq('ambito',ambito);
 const [{data:docs,error,count},{data:people},{data:users},{data:editions},{data:versions}]=await Promise.all([
  query.order('sort_cognome',{nullsFirst:false}).order('sort_nome').order('nome').order('id').range((page-1)*size,page*size-1),
  isStaff?supabase.from('persone').select('id,nome,cognome').order('cognome').order('nome').limit(300):Promise.resolve({data:[]}),
  isStaff?supabase.from('collegamenti_persone').select('utente_id,persona_id').limit(500):Promise.resolve({data:[]}),
  isStaff?supabase.from('edizioni_corsi').select('id,nome').order('inizio',{ascending:false}).limit(200):Promise.resolve({data:[]}),
  isStaff?supabase.from('versioni_programmi').select('id,programma_id,versione').limit(200):Promise.resolve({data:[]}),
 ]);
 return <div className="container"><div className="page-intro"><p className="eyebrow">Archivio riservato</p><h1>Documenti</h1><p>File privati: scaricabili soltanto da utenti autorizzati. PDF, JPG, PNG e WEBP, massimo 10 MB.</p></div>
 {msg==='modificato'&&<p className="notice success">Documento aggiornato.</p>}{msg==='ok'&&<p className="notice success">Documento caricato.</p>}{msg==='eliminato'&&<p className="notice success">Documento eliminato.</p>}{msg&&msg!=='ok'&&msg!=='eliminato'&&msg!=='modificato'&&<p className="notice warning">{msg==='storage_residuo'?'Documento rimosso dall’elenco; file residuo nel deposito privato da verificare con l’amministratore.':msg==='collegato'?'Rimozione non consentita: verifica i dati collegati.':msg==='conferma'?'Conferma la rimozione.':'Operazione non completata: verifica file, dati e autorizzazioni.'}</p>}
 <Drawer primary title="Carica documento" trigger="Carica documento" initialOpen={isAdmin&&pubblica==='soci'&&!msg}>
 <p className="tiny muted">Per pubblicare nell’Area soci, seleziona Associazione e Soci attivi, senza collegare il file a un singolo socio o corso.</p><ActionForm className="stack" action={uploadDocument} encType="multipart/form-data">
 <div className="form-grid"><label>Nome documento<input name="nome" placeholder="Facoltativo: nome originale"/></label>
 <label>Categoria<input name="categoria" placeholder="Es. Statuto, brevetto, materiale didattico" required/></label>
 {isStaff&&<><label>Ambito<select name="ambito"><option value="associazione">Associazione</option><option value="personale">Personale</option><option value="didattica">Didattica</option><option value="amministrativo">Amministrativo</option></select></label>
 <label>Visibilità<select name="visibilita" defaultValue={isAdmin&&pubblica==='soci'?'soci':'staff'}><option value="staff">Solo segreteria</option><option value="proprietario">Intestatario</option>{isAdmin&&<option value="soci">Soci attivi (documenti associativi)</option>}<option value="istruttori">Istruttori autorizzati</option></select></label>
 <label>Intestatario account<select name="utente_id"><option value="">Nessuno</option>{users?.map(u=><option key={`${u.utente_id}-${u.persona_id}`} value={u.utente_id}>{people?.find(p=>p.id===u.persona_id)?.cognome??u.utente_id.slice(0,8)} {people?.find(p=>p.id===u.persona_id)?.nome??''}</option>)}</select></label>
 <label>Persona collegata<select name="persona_id"><option value="">Nessuna</option>{people?.map(p=><option key={p.id} value={p.id}>{p.cognome} {p.nome}</option>)}</select></label>
 <label>Edizione corso<select name="edizione_id"><option value="">Nessuna</option>{editions?.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}</select></label>
 <label>Versione programma didattico<select name="programma_versione_id"><option value="">Nessuna</option>{versions?.map(v=><option key={v.id} value={v.id}>{v.programma_id.slice(0,8)} · Versione {v.versione}</option>)}</select></label></>}
 <label>Scadenza conservazione (facoltativa)<input type="date" name="scadenza_conservazione"/></label><label>File<input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png,.webp" required/></label></div>
 <button className="button" type="submit">Carica documento</button></ActionForm></Drawer>
 <FilterBar><SearchBar query={q} placeholder="Cerca nome o categoria del documento" resetHref="/documenti"><label>Ambito<select name="ambito" defaultValue={ambito}><option value="">Tutti</option><option value="associazione">Associazione</option><option value="personale">Personale</option><option value="didattica">Didattica</option><option value="amministrativo">Amministrativo</option></select></label></SearchBar></FilterBar>
 {error?<p className="notice error">Impossibile caricare l’archivio. Riprova o contatta la segreteria.</p>:
 <DataTable label="Documenti"><thead><tr><th>Documento</th><th>Categoria</th><th>Ambito</th><th>Caricato il</th><th>Dimensione</th><th>Da riesaminare</th><th>Azioni</th></tr></thead><tbody>
 {docs?.map(d=><tr key={d.id}><td>{d.nome}{d.sort_cognome&&<p className="tiny muted">{d.sort_cognome} {d.sort_nome}</p>}</td><td>{d.categoria}</td><td>{d.ambito}</td><td>{new Date(d.caricato_il).toLocaleDateString('it-IT')}</td><td>{Math.round(d.dimensione_bytes/1024)} KB</td><td>{d.scadenza_conservazione??"—"}</td><td><div className="sc-row-actions"><Link href={`/documenti/${d.id}`} prefetch={false}>Scarica</Link>{isAdmin&&<><Drawer title={'Modifica documento · '+d.nome} trigger="Modifica"><ActionForm action={editDocumentMetadata} className="stack"><input type="hidden" name="id" value={d.id}/><label>Nome<input name="nome" defaultValue={d.nome} maxLength={150} required/></label><label>Categoria<input name="categoria" defaultValue={d.categoria} maxLength={80} required/></label><button className="button" type="submit">Salva modifiche</button></ActionForm></Drawer><ConfirmDialog title={'Elimina documento · '+d.nome} trigger="Elimina"><p>Elimina il documento selezionato soltanto se consentito. Eventuali collegamenti protetti impediscono la rimozione.</p><ActionForm action={deleteDocument} style={{marginTop:8}}><input type="hidden" name="id" value={d.id}/><label><input type="checkbox" name="conferma" required/> Confermo la rimozione</label><button className="button danger" type="submit">Rimuovi</button></ActionForm></ConfirmDialog></>}</div></td></tr>)}
 {!docs?.length&&<tr><td className="empty-cell" colSpan={7}>Nessun documento visibile al tuo account.</td></tr>}</tbody></DataTable>}
 <Pagination page={page} size={size} count={error?null:count} href={page=>listHref({q,ambito,p:String(page)})}/>
 <p className="muted tiny">Non inserire dati sanitari nel titolo dei file. Per i certificati si consiglia di conservare solo quanto necessario e definire un periodo di conservazione.</p>
 </div>;
}
