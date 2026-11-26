import Link from 'next/link';
import {tutteLePagine} from '@/lib/pagine';
import {ConfirmDialog} from '@/components/ui/Drawer';
import ActionForm from '@/components/ui/ActionForm';
import {requireStaff} from '@/lib/security';
import {commitImport,stageImport} from './actions';
const messages:Record<string,string>={tipo:'Tipo non valido',file:'File CSV/XLSX non valido o oltre 2 MB',
 formato:'Impossibile interpretare il documento',righe:'Numero righe non valido (1–1000)',
 intestazioni:'Le intestazioni non corrispondono al modello',database:'Errore di sicurezza o database',
 quarantena:'Non è possibile confermare: righe da correggere o duplicati presenti',importato:'Importazione conclusa correttamente'};
export default async function Importazione({searchParams}:{searchParams:Promise<{batch?:string;msg?:string;n?:string}>}){
 const {supabase}=await requireStaff();const p=await searchParams;
 const batchId=p.batch&&/^[a-f0-9-]{36}$/i.test(p.batch)?p.batch:null;
 const {data:batch}=batchId?await supabase.from('importazioni_batch').select('*').eq('id',batchId).maybeSingle():{data:null};
 const {data:preview,error:previewError}=batch?await tutteLePagine((da,a)=>supabase.from('importazioni_righe').select('id,numero,dati,errori').eq('batch_id',batch.id).order('numero').order('id').range(da,a)):{data:[],error:null};
 const quarantena=(preview??[]).filter(row=>(row.errori as string[]).length>0);
 return <><div className="page-intro"><p className="eyebrow">Documenti e Sistema · Riservato staff</p><h1>Importazione Dati</h1>
 <p>Tre passaggi: modello, caricamento, controllo in quarantena e conferma atomica. Nessuna riga viene importata prima della conferma.</p></div>
 {p.msg&&<p className={`notice ${p.msg==='importato'?'success':'warning'}`}>{messages[p.msg]??p.msg} {p.msg==='importato'?`(${p.n??'0'} righe)`:''}</p>}
 <section className="panel"><h2>1. Scarica il modello e prepara i dati</h2><p>I codici fiscali devono essere univoci; per i corsi storici si usa l’ID di un’edizione già presente, senza creare duplicati di persone.</p>
 <div className="buttons"><Link className="button ghost" href="/gestionale/importazione/modello?tipo=soci">Modello soci Excel</Link><Link className="button ghost" href="/gestionale/importazione/modello?tipo=corsi">Modello corsi Excel</Link></div></section>
 <section className="panel"><h2>2. Carica e valida</h2><form action={stageImport} className="stack">
 <label>Tipologia<select name="tipo" required><option value="soci">Soci storici</option><option value="corsi">Corsi e brevetti (storico Access)</option></select></label>
 <label>File Excel o CSV<input name="file" type="file" accept=".xlsx,.csv" required/></label>
 <label className="check-label"><input type="checkbox" name="base_documentale"/><span>Per i soci storici dichiaro di aver verificato la documentazione a supporto dell’accettazione dello Statuto e della consegna dell’informativa. Senza tale attestazione l’importazione definitiva sarà bloccata.</span></label>
 <div className="form-actions"><button className="button" type="submit">Carica e visualizza anteprima</button><Link className="button ghost" href="/gestionale">Annulla / Torna indietro</Link></div></form></section>
 {batch&&<section className="panel"><h2>3. Anteprima / quarantena</h2><p>{preview?.length??0} righe · {quarantena.length} con anomalie · Stato {batch.stato}</p>
 {quarantena.length>0&&<p className="notice warning">Correggi il file e ricaricalo: nessuna importazione parziale sarà eseguita.</p>}
 <div className="table-panel"><table><thead><tr><th>Riga</th><th>CF (parzialmente oscurato)</th><th>Riferimento</th><th>Verifica</th></tr></thead><tbody>
 {(preview??[]).map(row=>{const d=row.dati as Record<string,string>;return <tr key={row.id}><td>{row.numero}</td><td>{d.codice_fiscale?.slice(0,3)}••••••••••{d.codice_fiscale?.slice(-3)}</td><td>{batch.tipo==='soci'?`${d.cognome??''} ${d.nome??''}`:d.edizione_id}</td><td>{(row.errori as string[]).length?(row.errori as string[]).join(' · '):'Valida'}</td></tr>;})}
 </tbody></table></div>
 {previewError&&<p className="notice error">Anteprima non disponibile: conferma bloccata.</p>}{batch.stato==='anteprima'&&<ConfirmDialog title="Conferma importazione" trigger="Conferma importazione definitiva"><ActionForm action={commitImport}><p>Importa tutte le righe valide di questo lotto in un’unica operazione. Nessuna importazione parziale.</p><label><input type="checkbox" name="conferma" required/> Confermo di aver controllato l’anteprima e le anomalie.</label><input type="hidden" name="batch" value={batch.id}/><button className="button" disabled={Boolean(previewError)||!preview?.length||quarantena.length>0||(!batch.base_documentale_verificata&&batch.tipo==='soci')}>Importa definitivamente</button></ActionForm></ConfirmDialog>}
 </section>}
 </>;
}
