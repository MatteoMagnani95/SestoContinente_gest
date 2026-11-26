import Link from 'next/link';
import {UUID_RE} from '@/lib/course-tools';
import ModulePage from '../[modulo]/page';
import {requireStaff} from '@/lib/security';
import Courses from '../../corsi/page';
export default async function Iscrizioni({searchParams}:{searchParams:Promise<{edit?:string;q?:string;p?:string;stato?:string;stagione?:string;msg?:string;persona?:string;nuovo?:string;vista?:string;filtro_modulo?:string;ordine?:string;dir?:string}>}){
 const p=await searchParams;
 if(p.edit&&UUID_RE.test(p.edit)){const {supabase}=await requireStaff();const {data}=await supabase.from('iscrizioni_corsi').select('edizione_id').eq('id',p.edit).maybeSingle();if(data)return <><Link className="back-link" href={`/gestionale/corsi/${data.edizione_id}#allievi`}>Torna alle iscrizioni del corso</Link><ModulePage params={Promise.resolve({modulo:'iscrizioni'})} searchParams={Promise.resolve(p)}/></>;}
 if(p.vista==='elenco'||p.nuovo==='1'||(p.persona&&UUID_RE.test(p.persona)))return <><Link className="back-link" href="/gestionale/moduli/iscrizioni">Torna alla selezione del corso</Link><ModulePage params={Promise.resolve({modulo:'iscrizioni'})} searchParams={Promise.resolve(p)}/></>;
 return <Courses searchParams={Promise.resolve({...p,area:'iscrizioni'})}/>;
}
