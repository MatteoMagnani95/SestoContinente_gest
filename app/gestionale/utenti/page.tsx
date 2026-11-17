import {redirect} from 'next/navigation';
import {requireStaff} from '@/lib/security';
import {grantRole,linkPersonToAccount,removeRole} from './actions';
export default async function Users({searchParams}:{searchParams:Promise<{msg?:string}>}){
 const {supabase,user}=await requireStaff();
 const {data:admin}=await supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id).eq('ruolo','amministratore').maybeSingle();
 if(!admin)redirect('/gestionale?msg=permessi');
 const {data:roles}=await supabase.from('ruoli_utente').select('utente_id,ruolo,assegnato_il').order('assegnato_il',{ascending:false}).limit(150);
 const {msg}=await searchParams;
 const {data:people}=await supabase.from('persone').select('id,nome,cognome').order('cognome').order('nome').limit(500);
 const {data:links}=roles?.length?await supabase.from('collegamenti_persone').select('utente_id,persona_id').in('utente_id',[...new Set(roles.map(r=>r.utente_id))]):{data:[]};
 const linkedName=(uid:string)=>{const ids=(links??[]).filter(l=>l.utente_id===uid).map(l=>l.persona_id);const linked=(people??[]).filter(p=>ids.includes(p.id));return linked.map(p=>`${p.cognome} ${p.nome}`).join(' / ');};
 const sortedRoles=[...(roles??[])].sort((a,b)=>(linkedName(a.utente_id)||'\uffff').localeCompare(linkedName(b.utente_id)||'\uffff','it')||a.utente_id.localeCompare(b.utente_id)||a.ruolo.localeCompare(b.ruolo,'it'));
 return <><div className="page-intro"><p className="eyebrow">Amministratore</p><h1>Permessi utenti</h1><p>Assegna un ruolo solo a un account già registrato e con email verificata.</p></div>
 {msg==='ok'&&<p className="notice success">Ruolo assegnato.</p>}{msg==='collegato'&&<p className="notice success">Account collegato all'anagrafica.</p>}{msg==='rimosso'&&<p className="notice success">Ruolo rimosso, account conservato.</p>}{msg==='rimozione_negata'&&<p className="notice warning">Rimozione negata: ruolo protetto, quorum in corso o permessi insufficienti.</p>}{msg&& !['ok','collegato','rimosso','rimozione_negata'].includes(msg)&&<p className="notice warning">Impossibile assegnare: verifica email registrata, ruolo e autorizzazioni.</p>}
 <section className="panel"><h2>Assegna ruolo</h2><form action={grantRole} className="stack"><div className="form-grid">
 <label>Email dell'account <input name="email" type="email" required/></label>
 <label>Ruolo <select name="ruolo" required>{['istruttore','segreteria','socio','tutore','consigliere_cda','amministratore'].map(x=><option value={x} key={x}>{x}</option>)}</select></label></div><button className="button">Assegna ruolo</button></form>
 <p className="muted tiny">L'assegnazione di «amministratore» concede il controllo dell'applicazione: usarla solo per persone autorizzate.</p></section>
 <section className="panel"><h2>Collega account a persona</h2><p className="muted">Utile per gli istruttori creati dalla segreteria: dopo aver registrato l'account e assegnato il ruolo, collegalo alla sua anagrafica.</p><form action={linkPersonToAccount} className="stack"><label>Email dell'account<input name="email" type="email" required/></label><label>Persona<select name="persona_id" required><option value="">Seleziona persona</option>{people?.map(p=><option key={p.id} value={p.id}>{p.cognome} {p.nome}</option>)}</select></label><label>Relazione<select name="relazione"><option value="titolare">Titolare</option><option value="tutore">Tutore legale</option></select></label><button className="button">Collega account</button></form></section>
 <section className="panel table-panel"><table><thead><tr><th>Utente / anagrafica</th><th>Ruolo</th><th>Assegnato il</th><th>Azioni</th></tr></thead><tbody>{sortedRoles.map(r=><tr key={`${r.utente_id}:${r.ruolo}`}><td>{linkedName(r.utente_id)||'Anagrafica non collegata'}<p className="tiny muted">{r.utente_id.slice(0,12)}…</p></td><td>{r.ruolo}</td><td>{new Date(r.assegnato_il).toLocaleDateString('it-IT')}</td><td>{!(r.utente_id===user.id&&r.ruolo==='amministratore')&&<details><summary>Modifica ruolo</summary><form action={removeRole} className="stack"><input type="hidden" name="utente_id" value={r.utente_id}/><input type="hidden" name="ruolo" value={r.ruolo}/><label><input type="checkbox" name="conferma" required/> Confermo la revoca del ruolo</label><button className="button danger" type="submit">Rimuovi</button></form></details>}</td></tr>)}</tbody></table></section>
 </>;
}
