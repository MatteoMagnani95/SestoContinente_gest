import {createAuthAdmin} from '@/lib/supabase/admin';
import {NextResponse} from 'next/server';
import {requireUser} from '@/lib/security';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {supabase}=await requireUser();
 const download=new URL(_request.url).searchParams.get('download')==='1';
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))return new Response('Documento non trovato',{status:404});
 const {data:doc,error}=await supabase.from('documenti').select('percorso_storage,mime').eq('id',id).maybeSingle();
 if(error||!doc)return new Response('Documento non trovato o non autorizzato',{status:404});
 const {data:medico,error:tipoError}=await supabase.rpc('documento_sanitario',{p_id:id});
 if(tipoError)return new Response('File non disponibile',{status:503});
 if(medico){
  const {data:autorizzato}=await supabase.rpc('legge_certificato',{p_id:id});if(autorizzato!==true)return new Response('Non trovato',{status:404});
  const admin=createAuthAdmin();if(!admin)return new Response('Archivio non disponibile',{status:503});
  const {data:file,error:lettura}=await admin.storage.from('sesto-documenti').download(doc.percorso_storage);
  if(lettura||!file)return new Response('File non disponibile',{status:404});
  return new Response(file.stream(),{headers:{'Content-Type':doc.mime,'Content-Disposition':download?'attachment':'inline','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox"}});
 }
 const {data,error:signError}=await supabase.storage.from('sesto-documenti').createSignedUrl(doc.percorso_storage,60,download?{download:true}:undefined);
 if(signError||!data?.signedUrl)return new Response('File non disponibile',{status:404});
 return NextResponse.redirect(data.signedUrl,{headers:{'Cache-Control':'private, no-store'}});
}
