import {ButtonLink} from '@/components/ui/Primitives';
import {searchTerms} from '@/lib/secretariat';
import EditForm from '@/components/EditForm';
import {Drawer,ConfirmDialog} from '@/components/ui/Drawer';
import ActionForm from '@/components/ui/ActionForm';
import {DataTable,FilterBar,SearchBar,Pagination} from '@/components/ui/DataTable';
import {cleanSearch,pageNumber,listHref} from '@/lib/module-ui';
import {editTeachingModule} from './actions';
import RemoveRecord from '@/components/RemoveRecord';
import Link from 'next/link';
import {requireStaff} from '@/lib/security';
export default async function ProgrammiDidattici({searchParams}:{searchParams:Promise<{msg?:string;q?:string;tipo?:string;p?:string;ordine?:string}>}){
 const {msg,q='',tipo='',p,ordine:rawOrder}=await searchParams;
 const ordine=['codice','titolo','tipo'].includes(rawOrder??'')?rawOrder!:'pre_id';
 const page=pageNumber(p),size=30;
 const {supabase}=await requireStaff();let query=supabase.from('moduli_didattici').select('id,pre_id,tipo,codice,titolo,descrizione',{count:'exact'});
 const search=cleanSearch(q);if(search)for(const term of searchTerms(q))query=query.or(['codice','titolo','descrizione'].map(c=>c+'.ilike.%'+term+'%').join(','));
 if(['Piscina','Teoria'].includes(tipo))query=query.eq('tipo',tipo);
 const {data,error,count}=await query.order(ordine).order('id').range((page-1)*size,page*size-1);
 return <><div className="page-intro"><p className="eyebrow">Corsi e Didattica</p><h1>Archivio moduli didattici</h1>
 <p>Moduli precaricati dal file di specifiche. Dalla scheda di ciascun corso puoi combinarli e stamparli nei registri delle lezioni.</p>
 <div className="buttons"><ButtonLink href="/gestionale/corsi" variant="secondary">Corsi ed edizioni</ButtonLink><ButtonLink href="/gestionale/moduli/programmi" variant="secondary">Programmi didattici</ButtonLink><ButtonLink href="/gestionale/moduli/versioni" variant="secondary">Versioni dei programmi</ButtonLink></div></div>
 {msg&&<p className="notice">{msg==='eliminato'?'Modulo rimosso.':msg==='salvato'?'Modulo aggiornato.':'Operazione non consentita o modulo collegato a lezioni.'}</p>}
 {error&&<p className="notice error">Archivio non disponibile. Riprova o contatta la segreteria.</p>}
 <Drawer primary title="Nuovo modulo didattico" trigger="Nuovo modulo"><EditForm action={editTeachingModule} className="stack"><label>Identificativo (max 6 caratteri)<input name="pre_id" maxLength={6} required pattern="[A-Za-z0-9-]{1,6}"/></label><label>Tipo<select name="tipo"><option>Piscina</option><option>Teoria</option></select></label><label>Codice<input name="codice" maxLength={100} required/></label><label>Titolo<input name="titolo" maxLength={250} required/></label><label>Descrizione<textarea name="descrizione" maxLength={15000} rows={4} required/></label><button className="button">Crea modulo</button></EditForm></Drawer>
 <FilterBar><SearchBar query={q} placeholder="Cerca codice, titolo o descrizione" resetHref="/gestionale/programmi-didattici"><label>Tipologia<select name="tipo" defaultValue={tipo}><option value="">Tutte</option><option>Piscina</option><option>Teoria</option></select></label><label>Ordina per<select name="ordine" defaultValue={ordine}><option value="pre_id">Ordine archivio</option><option value="codice">Codice</option><option value="titolo">Titolo</option><option value="tipo">Tipologia</option></select></label></SearchBar></FilterBar><DataTable label="Archivio moduli didattici" mobileCards><thead role="rowgroup"><tr role="row">{['Codice','Tipo','Titolo','Descrizione','Azioni'].map(l=><th key={l} role="columnheader" scope="col">{l}</th>)}</tr></thead><tbody role="rowgroup">
 {(data??[]).map(m=><tr key={m.id} role="row"><td role="cell" data-label="Codice">{m.codice}<p className="tiny muted">{m.pre_id}</p></td><td role="cell" data-label="Tipo">{m.tipo}</td><td role="cell" data-label="Titolo">{m.titolo}</td><td role="cell" data-label="Descrizione" className="sc-table-description">{(m.descrizione??'').length>180?<>{(m.descrizione??'').slice(0,180)}… <Drawer title={m.titolo} trigger="Leggi descrizione"><p className="sc-prewrap">{m.descrizione}</p></Drawer></>:m.descrizione}</td><td role="cell" data-label="Azioni"><Drawer title={'Modifica modulo · '+m.titolo} trigger="Modifica"><EditForm action={editTeachingModule} className="stack"><input type="hidden" name="id" value={m.id}/><label>Tipo<select name="tipo" defaultValue={m.tipo}><option>Piscina</option><option>Teoria</option></select></label><label>Codice<input name="codice" defaultValue={m.codice} maxLength={100} required/></label><label>Titolo<input name="titolo" defaultValue={m.titolo} maxLength={250} required/></label><label>Descrizione<textarea name="descrizione" defaultValue={m.descrizione} maxLength={15000} required/></label><button className="button" type="submit">Salva modifiche</button></EditForm><RemoveRecord moduleKey="moduli_didattici" id={m.id} back="didattica" label={m.titolo}/></Drawer></td></tr>)}
 {!error&&!data?.length&&<tr><td colSpan={5}>Nessun modulo trovato.</td></tr>}</tbody></DataTable><Pagination page={page} size={size} count={error?null:count} href={page=>listHref({q,tipo,ordine,p:String(page)})}/></>;
}
