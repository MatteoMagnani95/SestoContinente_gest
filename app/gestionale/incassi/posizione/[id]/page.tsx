import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireStaff,formatDate} from '@/lib/security';
import {UUID_RE} from '@/lib/course-tools';
import {money,methodLabel} from '@/lib/finance-ui';
import {pageNumber} from '@/lib/module-ui';
import {PageHeader,Alert,StatusBadge,ButtonLink} from '@/components/ui/Primitives';
import {DataTable,Pagination} from '@/components/ui/DataTable';
export default async function DebtPayments({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{tab?:string;p?:string}>}){
 const {id}=await params;if(!UUID_RE.test(id))notFound();
 const {supabase}=await requireStaff(),s=await searchParams,tab=s.tab==='corso'?'corso':'quota',page=pageNumber(s.p),size=30;
 const {data:debt,error}=await supabase.from(tab==='quota'?'gest_elenco_saldi_quote':'gest_elenco_saldi_corsi').select('*').eq('id',id).maybeSingle();
 if(error)return <Alert tone="danger">Posizione non disponibile.</Alert>;if(!debt)notFound();
 const [payments,admin]=await Promise.all([supabase.from('pagamenti').select('id,data_pagamento,importo,metodo,riferimento,note',{count:'exact'}).eq(tab==='quota'?'quota_id':'addebito_corso_id',id).order('data_pagamento',{ascending:false}).order('id').range((page-1)*size,page*size-1),supabase.rpc('is_admin')]);
 return <><PageHeader eyebrow="Incassi e saldi" title="Versamenti della posizione" description={debt.sort_cognome+' '+debt.sort_nome} actions={<ButtonLink href={'/gestionale/incassi?tab='+tab+'&stagione='+debt.stagione_id+'&debito='+id} variant="secondary">Torna alla posizione</ButtonLink>}/><p>Dovuto: {money(debt.importo_dovuto)} · Versato: {money(debt.versato)} · Residuo: {money(debt.residuo)}</p>{payments.error?<Alert tone="danger">Versamenti non disponibili.</Alert>:<DataTable label="Storico della posizione" mobileCards><thead><tr>{['Data','Importo','Metodo','Riferimento','Note','Azioni'].map(l=><th key={l}>{l}</th>)}</tr></thead><tbody>{payments.data?.map(p=><tr key={p.id}><td data-label="Data">{formatDate(p.data_pagamento)}</td><td data-label="Importo">{money(p.importo)}</td><td data-label="Metodo">{methodLabel(p.metodo)}</td><td data-label="Riferimento">{p.riferimento||'—'}</td><td data-label="Note">{p.note||'—'}</td><td data-label="Azioni">{admin.data===true?<Link href={'/gestionale/incassi/'+p.id}>Rettifica</Link>:'Sola lettura'}</td></tr>)}{!payments.data?.length&&<tr><td colSpan={6}>Nessun versamento.</td></tr>}</tbody></DataTable>}<Pagination page={page} size={size} count={payments.error?null:payments.count} href={p=>'?tab='+tab+'&p='+p}/></>;
}
