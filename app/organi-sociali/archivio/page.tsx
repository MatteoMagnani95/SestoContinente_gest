import {PageHeader,ButtonLink,StatusBadge,Alert} from '@/components/ui/Primitives';
import {Pagination} from '@/components/ui/DataTable';
import {Drawer,ConfirmDialog} from '@/components/ui/Drawer';
import ActionForm from '@/components/ui/ActionForm';
import EditForm from '@/components/EditForm';
import RemoveRecord from '@/components/RemoveRecord';
import CancelEditButton from '@/components/CancelEditButton';
import Link from 'next/link';
import {requireBoard,formatDate} from '@/lib/security';
import {tipiVerbale} from '@/lib/cda-documenti';
import {modificaBozza} from '../actions';
const stati={sostituito:'Versione sostituita',bozza:'Bozza',in_approvazione:'In approvazione',approvato:'Approvato'} as const;
const messages:Record<string,string>={eliminato:'Bozza rimossa dall’elenco corrente. File e versioni conservati.',elimina_collegati:'Bozza non rimovibile.',elimina_conferma:'Conferma la rimozione.',database:'Rimozione non riuscita.',bozza_ok:'Bozza e anteprima PDF salvate nell’archivio.',modificata:'Bozza aggiornata. Versione precedente conservata nello storage.',approvato:'Verbale definitivo approvato e archiviato.',conflitto:'Modifica non completata: la bozza potrebbe essere cambiata o non essere più modificabile. Riapri la versione corrente.',documento:'Documento Word non valido o non disponibile.',storage:'Salvataggio dei file non completato.',conversione:'Impossibile convertire il Word in PDF. Controlla che sia un DOCX leggibile.'};
type Verbale={id:string;data_consiglio:string;oggetto:string;tipo:string;stato:keyof typeof stati;percorso_docx:string;percorso_pdf:string|null;approvato_il:string|null;rimosso_il:string|null};
export default async function ArchivioCda({searchParams}:{searchParams:Promise<{q?:string;stato?:string;p?:string;msg?:string;edit?:string;tipo?:string;ordine?:string}>}){
 const {supabase,isStaff}=await requireBoard();const params=await searchParams;
 const q=(params.q??'').trim().slice(0,100),stato=isStaff&&params.stato==='rimosse'?'rimosse':Object.keys(stati).includes(params.stato??'')?params.stato!:'';
 const tipo=tipiVerbale.find(t=>t===params.tipo)??'',ordine=params.ordine==='asc'?'asc':'desc';
 const direct=/^[0-9a-f-]{36}$/i.test(params.edit??'')?params.edit:'';
 const page=Math.max(1,Math.min(10000,parseInt(params.p??'1',10)||1)),perPage=25;
 let query=supabase.from('cda_verbali').select('id,data_consiglio,oggetto,tipo,stato,percorso_docx,percorso_pdf,approvato_il,rimosso_il',{count:'exact'});
 if(direct)query=query.eq('id',direct);else if(q)query=query.ilike('oggetto',`%${q.replace(/[\\%_]/g,'')}%`);
 if(tipo&&!direct)query=query.eq('tipo',tipo);
 if(direct){if(!isStaff)query=query.is('rimosso_il',null);}else if(stato==='rimosse')query=query.not('rimosso_il','is',null);else{query=query.is('rimosso_il',null);if(stato)query=query.eq('stato',stato);}
 const {data,error,count}=await query.order('data_consiglio',{ascending:ordine==='asc'}).order('id',{ascending:false}).range(direct?0:(page-1)*perPage,direct?0:page*perPage-1);
 const rows=(data??[]) as Verbale[];
 const href=(p:number)=>`?${new URLSearchParams({q,stato,tipo,ordine,p:String(p)})}`;
 return <div className="container"><div className="page-intro"><p className="eyebrow">Organi sociali · CdA</p><h1>Archivio verbali e PDF</h1><p>Consulta tutti i documenti delle sedute. Le bozze sono modificabili dalla segreteria; i verbali in approvazione e quelli approvati non possono essere alterati.</p><Link href="/organi-sociali" className="button ghost">Torna al Consiglio</Link></div>
 {params.msg&&messages[params.msg]&&<p role="status" className={`notice ${['bozza_ok','modificata','approvato'].includes(params.msg)?'success':'warning'}`}>{messages[params.msg]}</p>}
 <form method="get" className="panel form-grid"><label>Cerca per oggetto<input name="q" type="search" defaultValue={q}/></label><label>Stato<select name="stato" defaultValue={stato}><option value="">Tutti</option>{Object.entries(stati).map(([k,v])=><option key={k} value={k}>{v}</option>)}{isStaff&&<option value="rimosse">Bozze rimosse</option>}</select></label><label>Tipologia<select name="tipo" defaultValue={tipo}><option value="">Tutte</option>{tipiVerbale.map(t=><option key={t}>{t}</option>)}</select></label><label>Ordina per data<select name="ordine" defaultValue={ordine}><option value="desc">Più recenti</option><option value="asc">Meno recenti</option></select></label><div className="form-actions"><button className="button">Cerca</button><Link className="button ghost" href="/organi-sociali/archivio">Azzera filtri</Link></div></form>
 {error?<p className="notice error">Impossibile leggere l’archivio. Verifica autorizzazioni e connessione.</p>:<section className="panel"><h2>Documenti ({count??0})</h2>{!rows.length&&<p>Nessun verbale corrispondente.</p>}{rows.map(v=>{
 const base=`/organi-sociali/documento/${v.id}`,pdfType=v.stato==='approvato'?'pdf':'anteprima';
 return <article className="timeline-item" key={v.id}><h3>{formatDate(v.data_consiglio)} · {v.oggetto}</h3><p>{v.tipo} · <StatusBadge tone={v.stato==='approvato'?'success':v.stato==='in_approvazione'?'warning':'neutral'}>{v.rimosso_il?'Bozza rimossa':stati[v.stato]??v.stato}</StatusBadge>{v.approvato_il&&` · Approvato il ${formatDate(v.approvato_il)}`}</p>
 <div className="buttons"><a className="button ghost" href={`${base}?tipo=${pdfType}`} target="_blank" rel="noopener noreferrer">{v.stato==='approvato'?'Visualizza PDF definitivo':'Visualizza PDF bozza'}</a><a className="button ghost" href={`${base}?tipo=${pdfType}&download=1`}>Scarica PDF</a><a className="button ghost" href={`${base}?tipo=docx&download=1`}>Scarica Word</a><Link className="button ghost" href={`/organi-sociali/archivio/${v.id}`}>Versioni precedenti</Link></div>
 {isStaff&&v.stato==='bozza'&&!v.rimosso_il&&<Drawer title={'Modifica bozza · '+v.oggetto} trigger="Modifica bozza / sostituisci Word" initialOpen={params.edit===v.id&&!['salvato','modificata'].includes(params.msg??'')}><EditForm action={modificaBozza} className="stack"><h3>Modifica verbale · {v.oggetto}</h3><input type="hidden" name="verbale_id" value={v.id}/><input type="hidden" name="percorso_docx" value={v.percorso_docx}/><div className="form-grid"><label>Data CdA<input type="date" name="data_consiglio" required defaultValue={v.data_consiglio}/></label><label>Oggetto<input name="oggetto" required maxLength={500} defaultValue={v.oggetto}/></label><label>Tipologia<select name="tipo" defaultValue={v.tipo}>{tipiVerbale.map(t=><option key={t}>{t}</option>)}</select></label><label>Nuovo DOCX (facoltativo, max 3 MB)<input type="file" name="documento" accept=".docx"/></label></div><p className="tiny muted">Il PDF di bozza viene rigenerato; la precedente versione resta conservata. Dopo l’avvio della votazione la bozza è bloccata.</p><div className="form-actions"><button type="submit" className="button">Salva modifiche</button><CancelEditButton/></div></EditForm><RemoveRecord moduleKey="cda_verbali" id={v.id} back="cda_archivio" label={v.oggetto}/></Drawer>}
 </article>;})}{direct?<ButtonLink variant="secondary" href="/organi-sociali/archivio">Torna a tutto l’archivio</ButtonLink>:<Pagination page={page} size={perPage} count={count} href={href}/>}</section>}
 <p className="tiny muted">Archivio riservato: l'anteprima è una trascrizione del Word, non una copia fedele dell’impaginazione. I file definitivi sono conservati nel bucket privato CdA.</p></div>;
}
