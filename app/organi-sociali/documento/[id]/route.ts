import {NextRequest,NextResponse} from 'next/server';
import {requireBoard} from '@/lib/security';
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[a-f0-9-]{36}$/i.test(id))return new NextResponse('Non trovato',{status:404});
 const {supabase}=await requireBoard();const tipo=req.nextUrl.searchParams.get('tipo')==='pdf'?'pdf':'docx';
 const {data:doc}=await supabase.from('cda_verbali').select('stato,percorso_docx,percorso_pdf').eq('id',id).maybeSingle();
 const path=tipo==='pdf'?doc?.stato==='approvato'?doc.percorso_pdf:null:doc?.percorso_docx;
 if(!path)return new NextResponse('Non trovato',{status:404});
 const {data,error}=await supabase.storage.from('sesto-cda').createSignedUrl(path,60);
 if(error||!data?.signedUrl)return new NextResponse('Non disponibile',{status:404});
 return NextResponse.redirect(data.signedUrl);
}
