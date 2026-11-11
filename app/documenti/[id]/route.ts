import {NextResponse} from 'next/server';
import {requireUser} from '@/lib/security';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {supabase}=await requireUser();
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))return new Response('Documento non trovato',{status:404});
 const {data:doc,error}=await supabase.from('documenti').select('percorso_storage').eq('id',id).maybeSingle();
 if(error||!doc)return new Response('Documento non trovato o non autorizzato',{status:404});
 const {data,error:signError}=await supabase.storage.from('sesto-documenti').createSignedUrl(doc.percorso_storage,60);
 if(signError||!data?.signedUrl)return new Response('File non disponibile',{status:404});
 return NextResponse.redirect(data.signedUrl,{headers:{'Cache-Control':'private, no-store'}});
}
