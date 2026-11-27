import {PageHeader,Alert} from '@/components/ui/Primitives';
import {Pagination} from '@/components/ui/DataTable';
import {pageNumber} from '@/lib/module-ui';
import ActionForm from '@/components/ui/ActionForm';
import {formatDate,requireUser} from '@/lib/security';
import {markAccountNotification} from './actions';

export default async function AccountNotifications({searchParams}:{searchParams:Promise<{p?:string;msg?:string}>}){
 const {supabase,user}=await requireUser();
 const {p,msg}=await searchParams;
 const page=pageNumber(p),size=30;
 const {data,error,count}=await supabase.from('notifiche').select('id,titolo,messaggio,creata_il',{count:'exact'}).eq('utente_id',user.id).is('letta_il',null).order('creata_il',{ascending:false}).order('id').range((page-1)*size,page*size-1);
 return <div className="container narrow">
 <PageHeader area="calendar" icon="bell" marine eyebrow="Account" title="Le mie notifiche" description="Consulta le comunicazioni destinate al tuo account."/>
 {msg==='letta'&&<Alert tone="success" announce>Notifica segnata come letta.</Alert>}
 {msg==='errore'&&<Alert tone="warning" announce>Impossibile aggiornare la notifica.</Alert>}
 <section className="sc-card"><h2>Notifiche da leggere</h2>
 {error?<Alert tone="warning">Notifiche non disponibili. Riprova.</Alert>:data?.length?data.map(n=><article className="timeline-item" key={n.id}><strong>{n.titolo}</strong><p className="sc-prewrap">{n.messaggio}</p><p className="tiny muted">{formatDate(n.creata_il)}</p><ActionForm action={markAccountNotification}><input type="hidden" name="id" value={n.id}/><button type="submit" className="button ghost">Segna come letta</button></ActionForm></article>):<p>Nessuna nuova notifica.</p>}
 <Pagination page={page} size={size} count={error?null:count} href={p=>'/notifiche?p='+p} label="notifiche"/>
 </section></div>;
}
