import Link from 'next/link';
import {tutteLePagine} from '@/lib/pagine';
import {DataTable,Pagination} from '@/components/ui/DataTable';
import {pageNumber} from '@/lib/module-ui';
import {ConfirmDialog} from '@/components/ui/Drawer';
import ActionForm from '@/components/ui/ActionForm';
import {requireStaff} from '@/lib/security';
import {commitImport,stageImport} from './actions';
const messages:Record<string,string>={tipo:'Tipo non valido',file:'File CSV/XLSX non valido o oltre 2 MB',
 formato:'Impossibile interpretare il documento',righe:'Numero righe non valido (1–1000)',
 intestazioni:'Le intestazioni non corrispondono al modello',database:'Errore di sicurezza o database',
 quarantena:'Non è possibile confermare: righe da correggere o duplicati presenti',batch:'Lotto non valido',importato:'Importazione conclusa correttamente',esito:'Esito non confermato. Verifica lo stato del lotto prima di riprovare.'};
export default async function Importazione({searchParams}:{searchParams:Promise<{batch?:string;msg?:string;n?:string;p?:string;anomalie?:string}>}){
 const {supabase}=await requireStaff();const p=await searchParams;
 const batchId=p.batch&&/^[a-f0-9-]{36}$/i.test(p.batch)?p.batch:null;
 const {data:batch}=batchId?await supabase.from('importazioni_batch').select('*').eq('id',batchId).maybeSingle():{data:null};
 const {data:preview,error:previewError}=batch?await tutteLePagine((da,a)=>supabase.from('importazioni_righe').select('id,numero,dati,errori,importato_id').eq('batch_id',batch.id).order('numero').order('id').range(da,a)):{data:[],error:null};
 const quarantena=(preview??[]).filter(row=>(row.errori as string[]).length>0);
 const confirmed=!previewError&&batch?.stato==='importato'&&Boolean(preview?.length)&&preview!.every(row=>Boolean(row.importato_id));
 const filtered=p.anomalie==='1'?quarantena:(preview??[]),size=50;
 const page=Math.min(pageNumber(p.p),Math.max(1,Math.ceil(filtered.length/size)));
 const visible=filtered.slice((page-1)*size,page*size);
 const batchHref=(n:number,onlyErrors=p.anomalie==='1')=>'?batch='+batchId+'&p='+n+(onlyErrors?'&anomalie=1':'');
 const success=p.msg==='importato'&&confirmed;
 return <><div className="page-intro"><p className="eyebrow">Documenti e Sistema · Riservato staff</p><h1>Importazione Dati</h1>
 <p>Tre passaggi: modello, caricamento, controllo in quarantena e conferma atomica. Nessuna riga viene importata prima della conferma.</p></div>
 {p.msg&&<p role="status" className={`notice ${success?'success':'warning'}`}>{p.msg==='importato'?(success?messages.importato+' ('+preview!.length+' righe)':messages.esito):Object.hasOwn(messages,p.msg)?messages[p.msg]:'Controlla lo stato dell’operazione.'}</p>}
 <section className="panel"><h2>1. Scarica il modello e prepara i dati</h2><p>I codici fiscali devono essere univoci; per i corsi storici si usa l’ID di un’edizione già presente, senza creare duplicati di persone.</p>
 <div className="buttons"><Link className="button ghost" href="/gestionale/importazione/modello?tipo=soci">Modello soci Excel</Link><Link className="button ghost" href="/gestionale/importazione/modello?tipo=corsi">Modello corsi Excel</Link></div></section>
 <section className="panel"><h2>2. Carica e valida</h2><form action={stageImport} className="stack">
 <label>Tipologia<select name="tipo" required><option value="soci">Soci storici</option><option value="corsi">Corsi e brevetti (storico Access)</option></select></label>
 <label>File Excel o CSV<input name="file" type="file" accept=".xlsx,.csv" required/></label>
 <label className="check-label"><input type="checkbox" name="base_documentale"/><span>Per i soci storici dichiaro di aver verificato la documentazione a supporto dell’accettazione dello Statuto e della consegna dell’informativa. Senza tale attestazione l’importazione definitiva sarà bloccata.</span></label>
 <div className="form-actions"><button className="button" type="submit">Carica e visualizza anteprima</button><Link className="button ghost" href="/gestionale">Annulla / Torna indietro</Link></div></form></section>
 {batch&&<section className="panel"><h2>3. Anteprima / quarantena</h2><p>{preview?.length??0} righe · {quarantena.length} con anomalie · Stato {batch.stato}</p>
 {quarantena.length>0&&<p className="notice warning">Correggi il file e ricaricalo: nessuna importazione parziale sarà eseguita.</p>}
 <div className="sc-row-actions"><Link className="button ghost" aria-current={p.anomalie!=='1'?'page':undefined} href={batchHref(1,false)}>Tutte le righe</Link><Link className="button ghost" aria-current={p.anomalie==='1'?'page':undefined} href={batchHref(1,true)}>Solo anomalie ({quarantena.length})</Link></div>
 <DataTable label="Anteprima importazione" mobileCards><thead><tr><th>Riga</th><th>CF (parzialmente oscurato)</th><th>Riferimento</th><th>Verifica</th></tr></thead><tbody>
 {visible.map(row=>{const d=row.dati as Record<string,string>;return <tr key={row.id}><td data-label="Riga">{row.numero}</td><td data-label="Codice fiscale">{d.codice_fiscale?.slice(0,3)}••••••••••{d.codice_fiscale?.slice(-3)}</td><td data-label="Riferimento">{batch.tipo==='soci'?`${d.cognome??''} ${d.nome??''}`:d.edizione_id}</td><td data-label="Verifica">{(row.errori as string[]).length?(row.errori as string[]).join(' · '):'Valida'}</td></tr>;})}
 </tbody></DataTable>
 <Pagination page={page} size={size} count={previewError?null:filtered.length} href={batchHref} label="righe"/>
 {previewError&&<p className="notice error">Anteprima non disponibile: conferma bloccata.</p>}{batch.stato==='anteprima'&&<ConfirmDialog title="Conferma importazione" trigger="Conferma importazione definitiva"><ActionForm action={commitImport}><p>Importa tutte le righe valide di questo lotto in un’unica operazione. Nessuna importazione parziale.</p><label><input type="checkbox" name="conferma" required/> Confermo di aver controllato l’anteprima e le anomalie.</label><input type="hidden" name="batch" value={batch.id}/><button className="button" disabled={Boolean(previewError)||!preview?.length||quarantena.length>0||(!batch.base_documentale_verificata&&batch.tipo==='soci')}>Importa definitivamente</button></ActionForm></ConfirmDialog>}
 </section>}
 </>;
}
