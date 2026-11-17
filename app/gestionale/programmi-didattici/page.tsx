import RemoveRecord from '@/components/RemoveRecord';
import Link from 'next/link';
import {requireStaff} from '@/lib/security';
export default async function ProgrammiDidattici({searchParams}:{searchParams:Promise<{msg?:string}>}){
 const {msg}=await searchParams;
 const {supabase}=await requireStaff();const {data,error}=await supabase.from('moduli_didattici').select('id,pre_id,tipo,codice,titolo,descrizione').order('pre_id');
 return <><div className="page-intro"><p className="eyebrow">Corsi e Didattica</p><h1>Programmi Didattici · Archivio Moduli</h1>
 <p>Moduli precaricati dal file di specifiche. Dalla scheda di ciascun corso puoi combinarli e stamparli nei registri delle lezioni.</p>
 <Link href="/gestionale/corsi">Torna ai corsi</Link></div>
 {msg&&<p className="notice">{msg==='eliminato'?'Modulo rimosso.':'Rimozione non consentita o modulo collegato a lezioni.'}</p>}
 {error&&<p className="notice error">Archivio non disponibile: controlla le migrazioni 0008 e 0009.</p>}
 <div className="panel table-panel"><table><thead><tr><th>Codice</th><th>Tipo</th><th>Titolo</th><th>Descrizione</th><th>Azioni</th></tr></thead><tbody>
 {(data??[]).map(m=><tr key={m.pre_id}><td>{m.codice}<p className="tiny muted">{m.pre_id}</p></td><td>{m.tipo}</td><td>{m.titolo}</td><td>{m.descrizione}</td><td><RemoveRecord moduleKey="moduli_didattici" id={m.id} back="didattica"/></td></tr>)}
 </tbody></table></div></>;
}
