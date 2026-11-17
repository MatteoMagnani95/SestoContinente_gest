import {editTeachingModule} from './actions';
import RemoveRecord from '@/components/RemoveRecord';
import Link from 'next/link';
import {requireStaff} from '@/lib/security';
export default async function ProgrammiDidattici({searchParams}:{searchParams:Promise<{msg?:string}>}){
 const {msg}=await searchParams;
 const {supabase}=await requireStaff();const {data,error}=await supabase.from('moduli_didattici').select('id,pre_id,tipo,codice,titolo,descrizione').order('pre_id');
 return <><div className="page-intro"><p className="eyebrow">Corsi e Didattica</p><h1>Programmi Didattici · Archivio Moduli</h1>
 <p>Moduli precaricati dal file di specifiche. Dalla scheda di ciascun corso puoi combinarli e stamparli nei registri delle lezioni.</p>
 <Link href="/gestionale/corsi">Torna ai corsi</Link></div>
 {msg&&<p className="notice">{msg==='eliminato'?'Modulo rimosso.':msg==='salvato'?'Modulo aggiornato.':'Operazione non consentita o modulo collegato a lezioni.'}</p>}
 {error&&<p className="notice error">Archivio non disponibile: controlla le migrazioni 0008 e 0009.</p>}
 <details className="panel"><summary><strong>+ Nuovo modulo</strong></summary><form action={editTeachingModule} className="stack"><label>Identificativo (max 6 caratteri)<input name="pre_id" maxLength={6} required pattern="[A-Za-z0-9-]{1,6}"/></label><label>Tipo<select name="tipo"><option>Piscina</option><option>Teoria</option></select></label><label>Codice<input name="codice" maxLength={100} required/></label><label>Titolo<input name="titolo" maxLength={250} required/></label><label>Descrizione<textarea name="descrizione" maxLength={15000} rows={4} required/></label><button className="button">Crea modulo</button></form></details>
 <div className="panel table-panel"><table><thead><tr><th>Codice</th><th>Tipo</th><th>Titolo</th><th>Descrizione</th><th>Azioni</th></tr></thead><tbody>
 {(data??[]).map(m=><tr key={m.pre_id}><td>{m.codice}<p className="tiny muted">{m.pre_id}</p></td><td>{m.tipo}</td><td>{m.titolo}</td><td>{m.descrizione}</td><td><details className="row-editor"><summary>Modifica</summary><div className="row-editor-pop"><form action={editTeachingModule} className="stack"><input type="hidden" name="id" value={m.id}/><label>Tipo<select name="tipo" defaultValue={m.tipo}><option>Piscina</option><option>Teoria</option></select></label><label>Codice<input name="codice" defaultValue={m.codice} maxLength={100} required/></label><label>Titolo<input name="titolo" defaultValue={m.titolo} maxLength={250} required/></label><label>Descrizione<textarea name="descrizione" defaultValue={m.descrizione} maxLength={15000} required/></label><button className="button" type="submit">Salva modifiche</button></form><RemoveRecord moduleKey="moduli_didattici" id={m.id} back="didattica"/></div></details></td></tr>)}
 </tbody></table></div></>;
}
