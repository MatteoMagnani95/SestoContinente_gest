import {NextRequest,NextResponse} from 'next/server';
import {requireBoard} from '@/lib/security';
import {convertVerbaleDocx} from '@/lib/cda-pdf';
import {nomeVerbale,percorsoAnteprima} from '@/lib/cda-documenti';
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[a-f0-9-]{36}$/i.test(id))return new NextResponse('Non trovato',{status:404});
 const {supabase}=await requireBoard();const requested=req.nextUrl.searchParams.get('tipo');const tipo=requested==='pdf'?'pdf':requested==='anteprima'?'anteprima':'docx';
 const {data:current}=await supabase.from('cda_verbali').select('stato,percorso_docx,percorso_pdf,data_consiglio,oggetto').eq('id',id).maybeSingle();
 if(!current)return new NextResponse('Non trovato',{status:404});
 let doc=current;
 const version=req.nextUrl.searchParams.get('versione');
 if(version){
  if(tipo==='pdf'||!/^[a-f0-9-]{36}$/i.test(version))return new NextResponse('Non trovato',{status:404});
  const {data:old}=await supabase.from('cda_versioni_bozze').select('data_consiglio,oggetto,percorso_docx').eq('id',version).eq('verbale_id',id).maybeSingle();
  if(!old)return new NextResponse('Non trovato',{status:404});
  doc={...current,...old,stato:'bozza',percorso_pdf:null};
 }
 const path=tipo==='pdf'?doc.stato==='approvato'?doc.percorso_pdf:null:tipo==='anteprima'?doc.stato!=='approvato'?percorsoAnteprima(doc.percorso_docx):null:doc.percorso_docx;
 if(!path)return new NextResponse('Non trovato',{status:404});
 const filename=nomeVerbale(doc.data_consiglio,version??id,tipo);const download=tipo==='docx'||req.nextUrl.searchParams.get('download')==='1';
 const bucket=supabase.storage.from('sesto-cda');
 // Existing final PDFs and original Word files remain private, with short-lived links.
 if(tipo!=='anteprima'){
  const {data,error}=await bucket.createSignedUrl(path,60,download?{download:filename}:undefined);
  if(error||!data?.signedUrl)return new NextResponse('Non disponibile',{status:404});
  const response=NextResponse.redirect(data.signedUrl);response.headers.set('Cache-Control','private, no-store');return response;
 }
 // Older drafts did not store an anteprima. Generate on demand without updating data.
 const {data:stored}=await bucket.download(path);
 let body:ArrayBuffer;
 if(stored)body=await stored.arrayBuffer();
 else{
  const {data:word,error}=await bucket.download(doc.percorso_docx);if(error||!word)return new NextResponse('Word non disponibile',{status:404});
  try{const pdf=await convertVerbaleDocx(Buffer.from(await word.arrayBuffer()),{data:doc.data_consiglio,oggetto:doc.oggetto,bozza:true});body=Uint8Array.from(pdf).buffer;}catch{return new NextResponse('Conversione non riuscita',{status:422});}
 }
 return new NextResponse(body,{headers:{'Content-Type':'application/pdf','Content-Disposition':`${download?'attachment':'inline'}; filename="${filename}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
