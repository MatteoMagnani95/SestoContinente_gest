import Link from 'next/link';
import {requireAdmin} from '@/lib/security';
import {grantRole,linkPersonToAccount,createAccount} from './actions';
import {accountMessages,accountState,accountRoles,type AccountRow} from '@/lib/admin-accounts';
import {authAdminConfigured} from '@/lib/supabase/admin';
// Existing removeRole is used inside each account's edit page, not the list.
export default async function Users({searchParams}:{searchParams:Promise<{msg?:string;q?:string;p?:string}>}){
 const {supabase,user}=await requireAdmin();const {msg,q='',p='1'}=await searchParams;
 const page=Math.max(1,Math.min(10000,Number.parseInt(p,10)||1)),perPage=50;
 const [{data,error},{data:people}]=await Promise.all([
  supabase.rpc('admin_elenco_account',{p_q:q.slice(0,150),p_offset:(page-1)*perPage,p_limit:perPage,p_id:null}),
  supabase.from('persone').select('id,nome,cognome').order('cognome').order('nome').limit(1000)]);
 const {data:pending}=await supabase.from('eliminazioni_account_pendenti').select('utente_id,avviata_il').order('avviata_il');
 const rows=(data??[]) as AccountRow[];const total=Number(rows[0]?.totale??0),maxPage=Math.max(1,Math.ceil(total/perPage));const configured=authAdminConfigured();
 const link=(n:number)=>`/gestionale/utenti?${new URLSearchParams({q,p:String(n)})}`;
 return <><div className="page-intro"><p className="eyebrow">Amministratore</p><h1>Gestione utenti</h1><p>Tutti gli account di accesso, anche quelli senza ruolo o anagrafica. Per eliminare anche i dati associativi, apri la scheda account e scegli Eliminazione completa.</p></div>
 {msg&&<p className="notice" role="status">{accountMessages[msg]??accountMessages.errore}</p>}
 {!configured&&<p className="notice warning">Per creare, modificare o rimuovere account configura SUPABASE_SERVICE_ROLE_KEY su Vercel (solo server).</p>}
 {Boolean(pending?.length)&&<section className="panel"><h2>Eliminazioni da completare</h2>{pending?.map(x=><p key={x.utente_id}><Link href={`/gestionale/utenti/${x.utente_id}/elimina`}>Completa eliminazione · {x.utente_id}</Link></p>)}</section>}
 <details className="panel"><summary><strong>+ Nuovo account</strong></summary><form action={createAccount} className="stack"><label>Email<input type="email" name="email" required maxLength={254}/></label><label>Password iniziale<input name="password" type="password" minLength={10} maxLength={128} autoComplete="new-password" required/></label><label>Conferma password<input name="password_confirm" type="password" minLength={10} maxLength={128} autoComplete="new-password" required/></label><label><input name="email_verificata" type="checkbox"/> Conferma manualmente l’email (solo se verificata o casella di collaudo sotto il tuo controllo)</label><label><input type="checkbox" name="conferma" required/> Confermo la creazione dell’account senza invito email automatico.</label><button className="button" disabled={!configured}>Crea account</button></form></details>
 <form className="panel buttons" method="get"><label>Cerca per cognome, nome o email<input name="q" defaultValue={q} maxLength={150}/></label><button className="button">Cerca</button><Link href="/gestionale/utenti">Azzera filtri</Link></form>
 {error?<p className="notice error">Non è possibile caricare l’elenco account. Verifica la migrazione 0015.</p>:<section className="panel table-panel"><table><thead><tr><th>Cognome e nome</th><th>Email</th><th>Ruoli</th><th>Stato</th><th>Azioni</th></tr></thead><tbody>{rows.map(a=><tr key={a.id}><td>{[a.cognome,a.nome].filter(Boolean).join(' ')||'Anagrafica non collegata'}{a.id===user.id&&<p className="tiny muted">Il tuo account</p>}</td><td>{a.email||'—'}</td><td>{a.ruoli.join(', ')||'Nessun ruolo assegnato'}</td><td>{accountState(a)}</td><td><Link href={`/gestionale/utenti/${a.id}`}>Modifica</Link></td></tr>)}{!rows.length&&<tr><td colSpan={5}>Nessun account trovato.</td></tr>}</tbody></table><div className="pager"><span>{rows.length?`${total} account · Pagina ${page} di ${maxPage}`:'Nessun risultato'}</span><div className="buttons">{page>1&&<Link href={link(page-1)}>Precedente</Link>}{page<maxPage&&<Link href={link(page+1)}>Successiva</Link>}</div></div></section>}
 <details className="panel"><summary>Assegna ruolo</summary><form action={grantRole} className="stack"><label>Email dell'account<input name="email" type="email" required/></label><label>Ruolo<select name="ruolo" required>{accountRoles.map(x=><option value={x} key={x}>{x}</option>)}</select></label><button className="button">Assegna ruolo</button></form></details>
 <details className="panel"><summary>Collega account a persona</summary><form action={linkPersonToAccount} className="stack"><label>Email dell'account<input name="email" type="email" required/></label><label>Persona<select name="persona_id" required><option value="">Seleziona persona</option>{people?.map(p=><option key={p.id} value={p.id}>{p.cognome} {p.nome}</option>)}</select></label><label>Relazione<select name="relazione"><option value="titolare">Titolare</option><option value="tutore">Tutore legale</option></select></label><button className="button">Collega account</button></form></details>
 </>;
}
