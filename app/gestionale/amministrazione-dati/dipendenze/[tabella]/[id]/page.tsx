import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireAdmin} from '@/lib/security';
import {accountUuid} from '@/lib/admin-accounts';
import {dependencyLabel} from '@/lib/account-ui';
import {modules} from '@/lib/modules';
import {PageHeader,Alert,ButtonLink} from '@/components/ui/Primitives';

export default async function Dependencies({params}:{params:Promise<{tabella:string;id:string}>}){
  const {supabase}=await requireAdmin();
  const {tabella,id}=await params;
  const catalog=Object.values(modules);
  const module=catalog.find(m=>m.table===tabella);
  if(!module||!accountUuid.test(id))notFound();
  const {data,error}=await supabase.rpc('admin_fk_dipendenze',{p_schema:'public',p_tabella:tabella,p_id:id});

  return <>
    <PageHeader area="system" icon="archive" marine title={'Dati collegati · '+module.label}
      description="Consulta i collegamenti prima di rimuovere un elemento. Possono applicarsi anche regole di conservazione."
      actions={<ButtonLink href={`/gestionale/moduli/${module.name}?edit=${id}`} variant="secondary">Torna alla modifica</ButtonLink>}/>
    <section className="sc-card">
      {error?<Alert tone="danger">Impossibile verificare i collegamenti.</Alert>:data?.length?<ul>
        {data.map((row:{tabella:string;vincolo:string;numero:number})=>{
          const child=catalog.find(m=>m.table===row.tabella);
          return <li key={row.tabella+':'+row.vincolo}>
            {child?<Link href={'/gestionale/moduli/'+child.name}>{child.label}</Link>:dependencyLabel(row.tabella,row.vincolo)}
            {' · '}{row.numero} {Number(row.numero)===1?'collegamento':'collegamenti'}
          </li>;
        })}
      </ul>:<p>Nessun collegamento diretto rilevato.</p>}
    </section>
  </>;
}
