import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireAdmin} from '@/lib/security';
import {accountUuid} from '@/lib/admin-accounts';
import {modules} from '@/lib/modules';
export default async function Dependencies({params}:{params:Promise<{tabella:string;id:string}>}){
 const {supabase}=await requireAdmin();const {tabella,id}=await params;
 const module=Object.values(modules).find(m=>m.table===tabella);
 if(!module||!accountUuid.test(id))notFound();
 const {data,error}=await supabase.rpc('admin_fk_dipendenze',{p_schema:'public',p_tabella:tabella,p_id:id});
 return <><Link href={`/gestionale/moduli/${module.name}?edit=${id}`}>← Torna alla modifica</Link><div className="page-intro"><h1>Dati collegati · {module.label}</h1><p>Le dipendenze sono conteggiate in base ai vincoli del database. Alcune regole applicative possono impedire la rimozione anche in assenza di riferimenti.</p></div><section className="panel">{error?<p className="notice error">Controllo non disponibile.</p>:data?.length?<ul>{data.map((d:{tabella:string;vincolo:string;numero:number})=>{const child=Object.values(modules).find(m=>m.table===d.tabella);return <li key={`${d.tabella}:${d.vincolo}`}>{child?<Link href={`/gestionale/moduli/${child.name}`}>{child.label}</Link>:d.tabella}: {d.numero} · {d.vincolo}</li>;})}</ul>:<p>Nessuna dipendenza diretta rilevata.</p>}</section></>;
}
