import {requireStaff} from '@/lib/security';
export default async function Members(){
  const {supabase}=await requireStaff();
  const {data:people,error}=await supabase.from('persone').select('id,nome,cognome,codice_fiscale,email,telefono,creato_il').order('cognome',{ascending:true}).limit(200);
  const ids=people?.map(p=>p.id)??[];
  const {data:memberships}=ids.length?await supabase.from('adesioni').select('persona_id,stato').in('persona_id',ids):{data:[]};
  const members=people?.filter(p=>memberships?.some(m=>m.persona_id===p.id))??[];
  return <><div className="page-intro"><p className="eyebrow">Segreteria</p><h1>Anagrafica soci</h1><p>Le persone vengono create una sola volta e collegate alle adesioni della stagione.</p></div>
    <div className="notice">In questa prima versione i soci vengono inseriti tramite l'approvazione di una domanda. La modifica diretta delle anagrafiche verrà aggiunta in una fase successiva, con tracciamento delle rettifiche.</div>
    {error?<div className="notice error">Non è stato possibile caricare l'anagrafica.</div>:<div className="panel table-panel"><table><thead><tr><th>Socio</th><th>Codice fiscale</th><th>Contatto</th><th>Stato adesione</th></tr></thead><tbody>
      {members.map(p=><tr key={p.id}><td><strong>{p.cognome} {p.nome}</strong></td><td>{p.codice_fiscale??'—'}</td><td>{p.email??p.telefono??'—'}</td><td><span className="status status-bozza">{memberships?.find(m=>m.persona_id===p.id)?.stato.replaceAll('_',' ')}</span></td></tr>)}
      {members.length===0 && <tr><td colSpan={4} className="empty-cell">Ancora nessun socio approvato.</td></tr>}
    </tbody></table></div>}
    <p className="tiny muted">Visualizzazione limitata ai primi 200 record. È una vista iniziale, non l'archivio completo definitivo.</p>
  </>;
}
