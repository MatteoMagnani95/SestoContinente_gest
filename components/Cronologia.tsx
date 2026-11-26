import {createClient} from '@/lib/supabase/server';
import {dataOra} from '@/lib/scelte';
type Evento={id:number;registrata_il:string;autore:string;azione:string;campi:string[]|null};
const etichette:Record<string,string>={direttore_id:'direttore del corso',massimo_partecipanti:'capienza',programma_versione_id:'programma',corso_id:'attività di catalogo',stagione_id:'stagione'};
export default async function Cronologia({tipo,id,expanded=false}:{expanded?:boolean;tipo:'socio'|'corso'|'verbale'|'certificato';id:string}){
 const db=await createClient();
 const {data,error}=await db.rpc('cronologia_scheda',{p_tipo:tipo,p_id:id});
 return <details className="panel" open={expanded||undefined}><summary><strong>Cronologia</strong></summary>{error?<p>Impossibile leggere la cronologia.</p>:data?.length?<ol>{(data as Evento[]).map(e=><li key={e.id}><strong>{e.azione}</strong>{e.campi?.length?' · '+e.campi.map(k=>etichette[k]??k.replaceAll('_',' ')).join(', '):''}<br/>{e.autore} · <time dateTime={e.registrata_il}>{dataOra(e.registrata_il)}</time></li>)}</ol>:<p>Nessuna operazione registrata.</p>}</details>;
}
