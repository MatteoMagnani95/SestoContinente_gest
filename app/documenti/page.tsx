import {PageHeader,StatusBadge,Alert} from '@/components/ui/Primitives';
import {Icon} from '@/components/ui/Icon';
import {tutteLePagine} from '@/lib/pagine';
import {scopeLabel,visibilityLabel,documentAudience} from '@/lib/document-ui';
import DocumentDestination from '@/components/DocumentDestination';
import {formatDate} from '@/lib/security';
import {UUID_RE} from '@/lib/course-tools';
import EditForm from '@/components/EditForm';
import {DataTable,FilterBar,SearchBar,Pagination} from '@/components/ui/DataTable';
import {cleanSearch,pageNumber,listHref} from '@/lib/module-ui';
import {Drawer,ConfirmDialog} from '@/components/ui/Drawer';
import ActionForm from '@/components/ui/ActionForm';
import Link from 'next/link';
import {requireUser} from '@/lib/security';
import {uploadDocument,deleteDocument,editDocumentMetadata} from './actions';
export default async function Documenti({searchParams}:{searchParams:Promise<{msg?:string;pubblica?:string;q?:string;p?:string;ambito?:string;persona?:string;visibilita?:string;ordine?:string}>}){
 const {supabase,user}=await requireUser();
 const {data:roles,error:roleError}=await supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id);
 if(roleError)return <Alert tone="danger">Autorizzazioni non verificabili. Riprova.</Alert>;
 const isStaff=roles?.some(r=>r.ruolo==='amministratore'||r.ruolo==='segreteria')??false;
 const isAdmin=roles?.some(r=>r.ruolo==='amministratore')??false;
 const {msg,pubblica,q='',p,ambito='',persona,visibilita='',ordine:rawOrder}=await searchParams;
 const ordine=['nome','categoria','recente','riesame'].includes(rawOrder??'')?rawOrder!:'recente';
 const personId=persona&&UUID_RE.test(persona)?persona:'';
 const page=pageNumber(p),size=30,search=cleanSearch(q);
 let query=supabase.from('gest_elenco_documenti').select('id,nome,categoria,ambito,visibilita,utente_id,mime,caricato_il,dimensione_bytes,scadenza_conservazione,sort_cognome,sort_nome',{count:'exact'});
 if(personId)query=query.eq('persona_id',personId);
 if(search)query=query.or('nome.ilike.%'+search+'%,categoria.ilike.%'+search+'%');
 if(['associazione','personale','didattica','amministrativo'].includes(ambito))query=query.eq('ambito',ambito);
 if(['staff','proprietario','soci','istruttori'].includes(visibilita))query=query.eq('visibilita',visibilita);
 const [{data:docs,error,count},{data:people,error:peopleError},{data:users,error:usersError},{data:editions,error:editionsError},{data:versions,error:versionsError}]=await Promise.all([
  query.order(ordine==='recente'?'caricato_il':ordine==='riesame'?'scadenza_conservazione':ordine,{ascending:ordine!=='recente',nullsFirst:false}).order('id').range((page-1)*size,page*size-1),
  isStaff?tutteLePagine((da,a)=>supabase.from('persone').select('id,nome,cognome').order('cognome').order('nome').order('id').range(da,a)):Promise.resolve({data:[],error:null}),
  isStaff?tutteLePagine((da,a)=>supabase.from('collegamenti_persone').select('utente_id,persona_id').order('utente_id').order('persona_id').range(da,a)):Promise.resolve({data:[],error:null}),
  isStaff?tutteLePagine((da,a)=>supabase.from('edizioni_corsi').select('id,nome').order('inizio',{ascending:false}).order('id').range(da,a)):Promise.resolve({data:[],error:null}),
  isStaff?tutteLePagine((da,a)=>supabase.from('versioni_programmi').select('id,programma_id,versione').order('id').range(da,a)):Promise.resolve({data:[],error:null}),
 ]);
 const programs=isStaff?await tutteLePagine((da,a)=>supabase.from('programmi_didattici').select('id,titolo').order('id').range(da,a)):{data:[],error:null};
 const referenceError=peopleError||usersError||editionsError||versionsError||programs.error;
 const accountOptions=[...new Set((users??[]).map(u=>u.utente_id))].map(id=>({value:id,label:(users??[]).filter(u=>u.utente_id===id).map(u=>people?.find(p=>p.id===u.persona_id)).filter(Boolean).map(p=>p!.cognome+' '+p!.nome).join(' / ')||'Intestatario non disponibile'}));
 return <>
 <PageHeader eyebrow="Archivio riservato" title={isStaff?'Archivio documenti':'Documenti del tuo account'} description="File privati, consultabili soltanto da utenti autorizzati. Per i certificati medici usa il percorso dedicato."/>
 {msg==='modificato'&&<p className="notice success">Documento aggiornato.</p>}{msg==='ok'&&<p className="notice success">Documento caricato.</p>}{msg==='eliminato'&&<p className="notice success">Documento eliminato.</p>}{msg&&msg!=='ok'&&msg!=='eliminato'&&msg!=='modificato'&&<p className="notice warning">{msg==='storage_residuo'?'Documento rimosso dall’elenco; file residuo nel deposito privato da verificare con l’amministratore.':msg==='collegato'?'Rimozione non consentita: verifica i dati collegati.':msg==='conferma'?'Conferma la rimozione.':'Operazione non completata: verifica file, dati e autorizzazioni.'}</p>}
 {personId&&<div className="sc-row-actions"><Link className="sc-button sc-button-secondary" href={'/gestionale/soci/'+personId+'?tab=documenti'}>Torna alla scheda socio</Link><span>Archivio limitato alla persona selezionata</span></div>}
 {referenceError?<Alert tone="warning">Collegamenti non disponibili. Caricamento sospeso.</Alert>:<Drawer primary title="Carica documento" trigger="Carica documento" initialOpen={isAdmin&&pubblica==='soci'&&!msg}><EditForm action={uploadDocument} className="stack"><DocumentDestination staff={isStaff} admin={isAdmin} publish={pubblica==='soci'} person={personId} people={(people??[]).map(p=>({value:p.id,label:p.cognome+' '+p.nome}))} accounts={accountOptions} editions={(editions??[]).map(e=>({value:e.id,label:e.nome}))} versions={(versions??[]).map(v=>({value:v.id,label:(programs.data?.find(p=>p.id===v.programma_id)?.titolo??'Programma non disponibile')+' · Versione '+v.versione}))}/></EditForm></Drawer>}
 <FilterBar><SearchBar query={q} placeholder="Cerca nome o categoria del documento" resetHref="/documenti">{personId&&<input type="hidden" name="persona" value={personId}/>}<label>Ambito<select name="ambito" defaultValue={ambito}><option value="">Tutti</option><option value="associazione">Associazione</option><option value="personale">Personale</option><option value="didattica">Didattica</option><option value="amministrativo">Amministrativo</option></select></label><label>Visibilità<select name="visibilita" defaultValue={visibilita}><option value="">Tutte</option>{Object.entries(visibilityLabel).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>Ordina per<select name="ordine" defaultValue={ordine}><option value="recente">Caricati di recente</option><option value="nome">Nome</option><option value="categoria">Categoria</option><option value="riesame">Data di riesame</option></select></label></SearchBar></FilterBar>
 {error?<p className="notice error">Impossibile caricare l’archivio. Riprova o contatta la segreteria.</p>:
 <DataTable label="Documenti" mobileCards><thead><tr><th>Documento</th><th>Categoria</th><th>Ambito</th><th>Visibilità</th><th>Caricato il</th><th>Dimensione</th><th>Da riesaminare</th><th>Azioni</th></tr></thead><tbody>
 {docs?.map(d=><tr key={d.id}><td data-label="Documento"><Icon name="document"/> {d.nome} <span className="tiny muted">{d.mime==='application/pdf'?'PDF':d.mime?.startsWith('image/')?'Immagine':'File'}</span>{d.sort_cognome&&<p className="tiny muted">{d.sort_cognome} {d.sort_nome}</p>}</td><td data-label="Categoria">{d.categoria}</td><td data-label="Ambito">{scopeLabel[d.ambito]??d.ambito}</td><td data-label="Visibilità"><StatusBadge>{visibilityLabel[d.visibilita]??d.visibilita}</StatusBadge><p className="tiny muted">{documentAudience(d.ambito,d.visibilita,Boolean(d.utente_id))}</p></td><td data-label="Caricato il">{formatDate(d.caricato_il)}</td><td data-label="Dimensione">{Math.ceil(d.dimensione_bytes/1024)} KB</td><td data-label="Riesame">{formatDate(d.scadenza_conservazione)}</td><td data-label="Azioni"><div className="sc-row-actions"><Link href={`/documenti/${d.id}`} prefetch={false}>Visualizza</Link><Link href={`/documenti/${d.id}?download=1`} prefetch={false}>Scarica</Link>{isAdmin&&<><Drawer title={'Modifica documento · '+d.nome} trigger="Modifica"><EditForm action={editDocumentMetadata} className="stack"><input type="hidden" name="id" value={d.id}/><label>Nome<input name="nome" defaultValue={d.nome} maxLength={150} required/></label><label>Categoria<input name="categoria" defaultValue={d.categoria} maxLength={80} required/></label><button className="button" type="submit">Salva modifiche</button></EditForm></Drawer><ConfirmDialog title={'Elimina documento · '+d.nome} trigger="Elimina"><p>Elimina il documento selezionato soltanto se consentito. Eventuali collegamenti protetti impediscono la rimozione.</p><ActionForm action={deleteDocument} style={{marginTop:8}}><input type="hidden" name="id" value={d.id}/><label><input type="checkbox" name="conferma" required/> Confermo la rimozione</label><button className="button danger" type="submit">Rimuovi</button></ActionForm></ConfirmDialog></>}</div></td></tr>)}
 {!docs?.length&&<tr><td className="empty-cell" colSpan={8}>Nessun documento visibile al tuo account.</td></tr>}</tbody></DataTable>}
 <Pagination page={page} size={size} count={error?null:count} href={page=>listHref({q,ambito,visibilita,ordine,persona:personId,p:String(page)})}/>
 <p className="muted tiny">Non inserire dati sanitari nel titolo dei file. Per i certificati si consiglia di conservare solo quanto necessario e definire un periodo di conservazione.</p>
 </>;
}
