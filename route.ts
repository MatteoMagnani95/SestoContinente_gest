import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret||request.headers.get('authorization')!==`Bearer ${secret}`)
  return new Response('Unauthorized',{status:401});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return new Response('Configurazione Supabase mancante',{status:503});
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const [{data:personal,error:err1},{data:organizational,error:err2},{data:cards,error:err3}]=await Promise.all([
  db.rpc('genera_promemoria'), db.rpc('genera_promemoria_organizzativi'), db.rpc('genera_promemoria_tessere')
 ]);
 if(err1||err2||err3)return NextResponse.json({ok:false,error:'Generazione notifiche non riuscita'},{status:500});
 let sent=0;let failed=0;
 const resendKey=process.env.RESEND_API_KEY;const from=process.env.EMAIL_FROM;
 if(resendKey&&from){
  const {data:notifications}=await db.from('notifiche')
   .select('id,utente_id,titolo,messaggio').is('email_inviata_il',null).order('creata_il',{ascending:true}).limit(50);
  for(const n of notifications??[]){
   const {data:account}=await db.auth.admin.getUserById(n.utente_id);
   const recipient=account.user?.email;
   if(!recipient)continue;
   try{
    const res=await fetch('https://api.resend.com/emails',{
     method:'POST',headers:{Authorization:`Bearer ${resendKey}`,'Content-Type':'application/json'},
     body:JSON.stringify({from,to:[recipient],subject:n.titolo,text:`${n.messaggio}\n\nAccedi al gestionale: ${process.env.NEXT_PUBLIC_SITE_URL||'https://sesto-continente-gest.vercel.app/'}`})
    });
    if(res.ok){await db.from('notifiche').update({email_inviata_il:new Date().toISOString()}).eq('id',n.id);sent++;}
    else failed++;
   }catch{failed++;}
  }
 }
 return NextResponse.json({ok:true,createPersonal:personal??0,createOrganizational:organizational??0,createCards:cards??0,emailSent:sent,emailFailed:failed,
  emailConfigured:Boolean(resendKey&&from)},{headers:{'Cache-Control':'no-store'}});
}
