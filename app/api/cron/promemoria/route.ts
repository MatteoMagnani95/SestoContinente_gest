import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {deliverMail,currentMailMode} from '@/lib/email-service';
import {validEmail} from '@/lib/email-tools';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret||request.headers.get('authorization')!==`Bearer ${secret}`)
  return new Response('Unauthorized',{status:401});
 // Le anteprime possono ereditare configurazioni non isolate: non scrivere nel DB.
 if((process.env.VERCEL_ENV&&process.env.VERCEL_ENV!=='production')||process.env.SESTO_TEST_MODE?.trim().toLowerCase()==='true')
  return NextResponse.json({ok:false,error:'Promemoria automatici disabilitati in collaudo'},{status:403,headers:{'Cache-Control':'no-store'}});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return new Response('Configurazione Supabase mancante',{status:503});
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const [{data:personal,error:err1},{data:organizational,error:err2},{data:cards,error:err3}]=await Promise.all([
  db.rpc('genera_promemoria'), db.rpc('genera_promemoria_organizzativi'), db.rpc('genera_promemoria_tessere')
 ]);
 if(err1||err2||err3)return NextResponse.json({ok:false,error:'Generazione notifiche non riuscita'},{status:500});
 let sent=0;let failed=0;let skipped=0;let scanned=0;let scanLimited=false;
 // Abilitazione separata: attivare solo dopo la bonifica dei dati di collaudo.
 const resendKey=process.env.RESEND_API_KEY,from=process.env.EMAIL_FROM;
 const since=process.env.EMAIL_NOTIFICATIONS_SINCE??'';
 const sinceValid=/^\d{4}-\d{2}-\d{2}T/.test(since)&&Number.isFinite(Date.parse(since));
 const automaticEnabled=process.env.EMAIL_AUTOMATIC_NOTIFICATIONS==='true'&&currentMailMode()==='live'&&Boolean(resendKey&&from)&&sinceValid;
 if(automaticEnabled){
  // Solo notifiche recenti, per impedire invii di arretrati dopo il collaudo.
  const recent=new Date(Math.max(Date.parse(since),Date.now()-7*86400000)).toISOString();
  // Use a stable keyset rather than OFFSET: successful sends disappear from
  // the pending result set, and skipped recipients must not occupy all 50 slots.
  const deadline=Date.now()+40000;
  const pageSize=50,maxScanned=500,maxAttempts=50;
  let attempted=0,stop=false;
  let cursor:{creata_il:string;id:string}|null=null;
  while(!stop&&scanned<maxScanned&&attempted<maxAttempts&&Date.now()<=deadline){
   let query=db.from('notifiche')
    .select('id,utente_id,tipo,riferimento,titolo,messaggio,creata_il').is('email_inviata_il',null).gte('creata_il',recent)
    .order('creata_il',{ascending:true}).order('id',{ascending:true}).limit(Math.min(pageSize,maxScanned-scanned));
   if(cursor)query=query.or(`creata_il.gt.${cursor.creata_il},and(creata_il.eq.${cursor.creata_il},id.gt.${cursor.id})`);
   const {data:notifications,error:readError}=await query;
   if(readError)return NextResponse.json({ok:false,error:'Lettura notifiche non riuscita'},{status:500});
   if(!notifications?.length)break;
   for(const n of notifications){
    if(Date.now()>deadline||attempted>=maxAttempts){stop=true;break;}
    scanned++;cursor={creata_il:n.creata_il,id:n.id};
   const {data:account,error:accountError}=await db.auth.admin.getUserById(n.utente_id);
   const u=account?.user,recipient=validEmail(u?.email);
   if(accountError||!u||!recipient||!u.email_confirmed_at||('deleted_at' in u&&u.deleted_at)||('banned_until' in u&&typeof u.banned_until==='string'&&Date.parse(u.banned_until)>Date.now())){skipped++;continue;}
   if(n.tipo==='quota_associativa'||n.tipo==='quota_corso'){
    const id=String(n.riferimento??'').split(':')[0];
    const {data:balance,error}=await db.from(n.tipo==='quota_associativa'?'saldi_quote':'saldi_corsi').select('residuo,persona_id').eq('id',id).maybeSingle();
    if(error||!balance||Number(balance.residuo)<=0){skipped++;continue;}
    const {data:linked,error:linkError}=await db.from('collegamenti_persone').select('persona_id').eq('utente_id',n.utente_id).eq('persona_id',balance.persona_id).maybeSingle();
    if(linkError||!linked){skipped++;continue;}
   }
   attempted++;
   const result=await deliverMail({recipients:[recipient],subject:n.titolo,body:`${n.messaggio}${process.env.NEXT_PUBLIC_SITE_URL?`\n\nAccedi al gestionale: ${process.env.NEXT_PUBLIC_SITE_URL}`:''}`,key:`notifica/${n.id}`});
   if(!result.error&&result.mode==='live'&&result.accepted===1){const {error}=await db.from('notifiche').update({email_inviata_il:new Date().toISOString()}).eq('id',n.id);if(error)failed++;else sent++;}
   else {failed++;if(result.error){stop=true;break;}}
   // Resend applica anche rate limit per richieste al secondo.
   await new Promise(resolve=>setTimeout(resolve,600));
   }
   if(notifications.length<pageSize)break;
  }
  scanLimited=scanned>=maxScanned||attempted>=maxAttempts||Date.now()>deadline;
 }
 return NextResponse.json({ok:true,createPersonal:personal??0,createOrganizational:organizational??0,createCards:cards??0,emailSent:sent,emailFailed:failed,
  emailConfigured:Boolean(resendKey&&from),automaticEnabled,emailSkipped:skipped,emailScanned:scanned,emailScanLimited:scanLimited},{headers:{'Cache-Control':'no-store'}});
}
