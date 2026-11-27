import {PageHeader} from '@/components/ui/Primitives';
import {singleSearchParams} from '@/lib/module-ui';
import {Pagination} from '@/components/ui/DataTable';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {formatDate,requireBoard} from '@/lib/security';
type Versione={id:string;data_consiglio:string;oggetto:string;tipo:string;archiviata_il:string};
export default async function VersioniCda({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{p?:string}>}){
 const {id}=await params;if(!/^[a-f0-9-]{36}$/i.test(id))notFound();
 const {supabase}=await requireBoard();const {p}=singleSearchParams(await searchParams);
 const page=Math.max(1,Math.min(10000,parseInt(p??'1',10)||1)),perPage=25;
 const {data:verbale}=await supabase.from('cda_verbali').select('id,oggetto,data_consiglio').eq('id',id).maybeSingle();if(!verbale)notFound();
 const {data,error,count}=await supabase.from('cda_versioni_bozze').select('id,data_consiglio,oggetto,tipo,archiviata_il',{count:'exact'}).eq('verbale_id',id).order('archiviata_il',{ascending:false}).order('id',{ascending:false}).range((page-1)*perPage,page*perPage-1);
 const rows=(data??[]) as Versione[];
 return <div className="container"><PageHeader area="secretariat" icon="archive" marine eyebrow="Organi sociali · Archivio" title="Versioni precedenti" description={formatDate(verbale.data_consiglio)+' · '+verbale.oggetto} actions={<Link className="button ghost" href="/organi-sociali/archivio">Torna all’archivio</Link>}/><section className="panel"><h2>Bozze storiche</h2><p>Le versioni sostituite sono di sola lettura. Non rappresentano verbali approvati.</p>{error?<p className="notice error">Archivio versioni non disponibile. Riprova.</p>:<>{!rows.length&&<p>Nessuna versione precedente registrata.</p>}{rows.map(v=>{const base=`/organi-sociali/documento/${id}?versione=${v.id}`;return <article className="timeline-item" key={v.id}><h3>{formatDate(v.data_consiglio)} · {v.oggetto}</h3><p>{v.tipo} · Sostituita il {formatDate(v.archiviata_il)}</p><div className="buttons"><a className="button ghost" target="_blank" rel="noopener noreferrer" href={`${base}&tipo=anteprima`}>Visualizza PDF bozza</a><a className="button ghost" href={`${base}&tipo=anteprima&download=1`}>Scarica PDF</a><a className="button ghost" href={`${base}&tipo=docx&download=1`}>Scarica Word</a></div></article>;})}<Pagination page={page} size={perPage} count={count} href={p=>'?p='+p}/></>}</section></div>;
}
