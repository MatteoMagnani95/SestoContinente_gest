import Link from 'next/link';
import {requireStaff} from '@/lib/security';
import {formatValue} from '@/lib/format';
export default async function Dashboard(){
 const {supabase,user}=await requireStaff();
 const counts=await Promise.all([
  supabase.from('richieste').select('*',{head:true,count:'exact'}).in('stato',['inviata','in_verifica','integrazione_richiesta']),
  supabase.from('adesioni').select('*',{head:true,count:'exact'}),
  supabase.from('edizioni_corsi').select('*',{head:true,count:'exact'}).eq('stato','attivo'),
  supabase.from('iscrizioni_corsi').select('*',{head:true,count:'exact'}).eq('stato','iscritto'),
  supabase.from('attrezzature').select('*',{head:true,count:'exact'}),
  supabase.from('certificati_medici').select('*',{head:true,count:'exact'}),
  supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id).eq('ruolo','amministratore').maybeSingle(),
 ]);
 const titles=['Richieste da gestire','Adesioni registrate','Corsi attivi','Allievi iscritti','Attrezzature','Certificati registrati'];
 const {data:nextLessons}=await supabase.from('lezioni').select('id,titolo,inizio').is('annullata_il',null).gte('inizio',new Date().toISOString()).order('inizio').limit(8);
 return <><div className="page-intro"><p className="eyebrow">Segreteria · Panoramica</p><h1>Gestione Sesto Continente</h1><p>La situazione associativa, didattica e organizzativa in un'unica schermata.</p></div>
 <div className="kpi-grid">{titles.map((title,i)=><article className="kpi" key={title}><span>{title}</span><strong>{counts[i].count??'—'}</strong></article>)}</div>
 <div className="cards"><section className="panel"><h2>Azioni rapide</h2><div className="buttons">
 <Link className="button" href="/gestionale/richieste">Esamina domande</Link>
 <Link className="button ghost" href="/gestionale/moduli/anagrafiche">Anagrafiche</Link>
 <Link className="button ghost" href="/gestionale/corsi/nuovo">Crea un corso</Link>
 <Link className="button ghost" href="/gestionale/calendario-visivo">Calendario</Link>
 <Link className="button ghost" href="/gestionale/report">Scadenze e report</Link>
 <Link className="button ghost" href="/documenti">Documenti</Link>
 </div></section><section className="panel"><h2>Prossime lezioni</h2>{nextLessons?.map(l=><p key={l.id}>{formatValue(l.inizio)} · {l.titolo}</p>)}{!nextLessons?.length&&<p className="muted">Nessuna attività programmata.</p>}</section></div>
 {counts[6].data&&<section className="panel"><h2>Amministrazione</h2><p className="muted">Accesso riservato all'amministratore.</p><div className="buttons"><Link className="button" href="/gestionale/moduli/contabilita">Movimenti contabili</Link><Link className="button ghost" href="/gestionale/utenti">Ruoli utenti</Link><Link className="button ghost" href="/gestionale/moduli/stagioni">Stagioni</Link></div></section>}
 <p className="muted tiny">I dati vengono letti in tempo reale dal database, in base ai permessi dell'account.</p>
 </>;
}
