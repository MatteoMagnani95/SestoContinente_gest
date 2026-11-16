import Link from 'next/link';
import {requireStaff} from '@/lib/security';
export default async function ProgrammiDidattici(){
 const {supabase}=await requireStaff();const {data,error}=await supabase.from('moduli_didattici').select('pre_id,tipo,codice,titolo,descrizione').order('pre_id');
 return <><div className="page-intro"><p className="eyebrow">Corsi e Didattica</p><h1>Programmi Didattici · Archivio Moduli</h1>
 <p>Moduli precaricati dal file di specifiche. Dalla scheda di ciascun corso puoi combinarli e stamparli nei registri delle lezioni.</p>
 <Link href="/gestionale/corsi">Torna ai corsi</Link></div>
 {error&&<p className="notice error">Archivio non disponibile: controlla le migrazioni 0008 e 0009.</p>}
 <div className="panel table-panel"><table><thead><tr><th>Codice</th><th>Tipo</th><th>Titolo</th><th>Descrizione</th></tr></thead><tbody>
 {(data??[]).map(m=><tr key={m.pre_id}><td>{m.codice}<p className="tiny muted">{m.pre_id}</p></td><td>{m.tipo}</td><td>{m.titolo}</td><td>{m.descrizione}</td></tr>)}
 </tbody></table></div></>;
}
