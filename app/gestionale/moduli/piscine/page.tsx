import Link from '@/components/ui/PrivateLink';
import {requireStaff} from '@/lib/security';
import {tutteLePagine} from '@/lib/pagine';
import {UUID_RE} from '@/lib/course-tools';
import {pageNumber,listHref} from '@/lib/module-ui';
import {searchTerms} from '@/lib/secretariat';
import {PageHeader,ButtonLink,Alert,EmptyState} from '@/components/ui/Primitives';
import {DataTable,FilterBar,SearchBar,Pagination} from '@/components/ui/DataTable';
import {Drawer} from '@/components/ui/Drawer';
import EditForm from '@/components/EditForm';
import CancelEditButton from '@/components/CancelEditButton';
import RemoveRecord from '@/components/RemoveRecord';
import {saveModuleRecord} from '@/app/module-actions';
type Pool={id:string;nome:string;indirizzo:string|null;orari_disponibili:string|null;limitazioni:string|null;note:string|null};
function PoolEditor({pool}:{pool?:Pool}){
 return <><EditForm action={saveModuleRecord} className="stack"><input type="hidden" name="modulo" value="piscine"/>{pool&&<input type="hidden" name="id" value={pool.id}/>}
 <label>Nome<input name="nome" required defaultValue={pool?.nome??''} maxLength={200}/></label>
 <label>Indirizzo<input name="indirizzo" defaultValue={pool?.indirizzo??''} maxLength={500}/></label>
 <label>Orari dichiarati<textarea name="orari_disponibili" rows={3} defaultValue={pool?.orari_disponibili??''} maxLength={8000}/></label>
 <label>Limitazioni<textarea name="limitazioni" rows={3} defaultValue={pool?.limitazioni??''} maxLength={8000}/></label>
 <label>Note<textarea name="note" rows={3} defaultValue={pool?.note??''} maxLength={8000}/></label>
 <p className="tiny muted">Gli orari e le limitazioni sono informazioni testuali. Non costituiscono una conferma automatica della disponibilità delle corsie.</p>
 <div className="form-actions"><button className="button" type="submit">{pool?'Salva modifiche':'Aggiungi piscina'}</button><CancelEditButton/></div></EditForm>
 {pool&&<RemoveRecord moduleKey="piscine" id={pool.id} label={pool.nome}/>}</>;
}
export default async function PoolsPage({searchParams}:{searchParams:Promise<{q?:string;p?:string;ordine?:string;edit?:string;msg?:string;nuovo?:string}>}){
 const {supabase}=await requireStaff();
 const s=await searchParams,edit=s.edit&&UUID_RE.test(s.edit)?s.edit:'',page=edit?1:pageNumber(s.p),size=30,order=s.ordine==='desc'?'desc':'asc';
 let query=supabase.from('piscine').select('id,nome,indirizzo,orari_disponibili,limitazioni,note',{count:'exact'});
 if(edit)query=query.eq('id',edit);else for(const term of searchTerms(s.q??''))query=query.or('nome.ilike.%'+term+'%,indirizzo.ilike.%'+term+'%');
 const result=await query.order('nome',{ascending:order==='asc'}).order('id').range((page-1)*size,page*size-1);
 const pools=(result.data??[]) as Pool[],ids=pools.map(p=>p.id);
 const lanes=ids.length?await tutteLePagine((da,a)=>supabase.from('corsie').select('id,piscina_id,numero,note').in('piscina_id',ids).order('numero').order('id').range(da,a)):{data:[],error:null};
 const msg:Record<string,string>={salvato:'Piscina salvata.',eliminato:'Piscina rimossa.',elimina_collegati:'Rimozione non consentita: sono presenti corsie, lezioni o altri dati collegati.',database:'Operazione non riuscita.',elimina_conferma:'Conferma la rimozione.'};
 return <>
 <PageHeader area="pool" icon="nuoto" marine eyebrow="Impianti e calendario" title="Piscine" description="Consulta gli impianti, le condizioni dichiarate e le corsie configurate." actions={<><Drawer title="Aggiungi piscina" trigger="Aggiungi piscina" primary initialOpen={s.nuovo==='1'&&!s.msg}><PoolEditor/></Drawer><ButtonLink variant="secondary" icon="calendar" href="/gestionale/calendario-visivo">Calendario</ButtonLink></>}/>
 {s.msg&&Object.hasOwn(msg,s.msg)&&<Alert announce tone={['salvato','eliminato'].includes(s.msg)?'success':'warning'}>{msg[s.msg]}</Alert>}
 <FilterBar><SearchBar query={s.q??''} placeholder="Cerca nome o indirizzo" resetHref="/gestionale/moduli/piscine"><label>Ordina per nome<select name="ordine" defaultValue={order}><option value="asc">A–Z</option><option value="desc">Z–A</option></select></label></SearchBar><ButtonLink href="/gestionale/esporta/piscine" variant="secondary">Esporta archivio CSV</ButtonLink></FilterBar>
 {edit&&<p><Link href="/gestionale/moduli/piscine">Torna a tutte le piscine</Link></p>}
 <Alert tone="info">Gli orari e le limitazioni dell’impianto devono essere verificati separatamente. Le prenotazioni nel gestionale non attestano disponibilità contrattuale.</Alert>
 {lanes.error&&<Alert tone="warning">Elenco delle corsie non disponibile.</Alert>}
 {result.error?<Alert tone="danger" announce>Impossibile leggere le piscine. Riprova.</Alert>:!pools.length?<EmptyState title="Nessuna piscina trovata" description="Modifica i filtri o aggiungi un impianto."/>:<DataTable label="Piscine" mobileCards><thead role="rowgroup"><tr role="row">{['Piscina','Indirizzo','Orari dichiarati','Limitazioni','Corsie','Azioni'].map(l=><th key={l} role="columnheader" scope="col">{l}</th>)}</tr></thead><tbody role="rowgroup">{pools.map(pool=>{const children=(lanes.data??[]).filter(l=>l.piscina_id===pool.id);return <tr key={pool.id} role="row">
 <td role="cell" data-label="Piscina"><strong>{pool.nome}</strong></td><td role="cell" data-label="Indirizzo">{pool.indirizzo||'Non acquisito'}</td>
 <td role="cell" data-label="Orari dichiarati" className="sc-prewrap">{pool.orari_disponibili||'Non acquisiti'}</td><td role="cell" data-label="Limitazioni" className="sc-prewrap">{pool.limitazioni||'Non acquisite'}</td>
 <td role="cell" data-label="Corsie">{lanes.error?'Non disponibili':children.length?children.length+' corsie':'Nessuna corsia'}<div className="sc-row-actions"><Drawer title={'Corsie · '+pool.nome} trigger="Consulta corsie">{lanes.error?<Alert tone="warning">Elenco non disponibile.</Alert>:children.length?<ul>{children.map(l=><li key={l.id}><Link href={'/gestionale/moduli/corsie?edit='+l.id+'&piscina='+pool.id}>Corsia {l.numero}</Link>{l.note&&<p className="sc-prewrap">{l.note}</p>}</li>)}</ul>:<p>Nessuna corsia configurata.</p>}<ButtonLink href={'/gestionale/moduli/corsie?piscina='+pool.id+'&nuovo=1'}>Aggiungi corsia</ButtonLink><ButtonLink href={'/gestionale/moduli/corsie?piscina='+pool.id} variant="secondary">Gestisci corsie</ButtonLink></Drawer></div></td>
 <td role="cell" data-label="Azioni"><div className="sc-row-actions"><Drawer key={pool.id+'-'+s.msg} title={'Modifica '+pool.nome} trigger="Modifica" initialOpen={edit===pool.id&&s.msg!=='salvato'}><PoolEditor pool={pool}/></Drawer><ButtonLink href={'/gestionale/calendario-visivo?piscina='+pool.id} variant="secondary">Occupazione</ButtonLink><Link href={'/gestionale/moduli/prenotazioni?piscina='+pool.id}>Prenotazioni</Link></div></td></tr>;})}</tbody></DataTable>}
 {!edit&&<Pagination page={page} size={size} count={result.error?null:result.count} label="piscine" href={p=>listHref({q:s.q,ordine:order,p:String(p)})}/>}
 <p className="tiny muted">Una corsia senza prenotazioni nel gestionale non è necessariamente disponibile. Verifica gli orari, le limitazioni e gli accordi con l’impianto.</p>
 </>;
}
