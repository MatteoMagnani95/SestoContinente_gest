import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {PDFDocument,StandardFonts} from 'pdf-lib';
const require=createRequire(import.meta.url),ts=require('typescript');
function load(path,dependencies={}){
 const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 const exports={};new Function('exports','require',js)(exports,id=>dependencies[id]??require(id));return exports;
}
test('CSV italiano: punto e virgola, BOM, campi quotati e intestazioni non ambigue',async()=>{
 const {parseHistoricalFile}=load('lib/import-file.ts'),columns=['nome','cognome'];
 const parse=s=>parseHistoricalFile(Buffer.from(s),'test.csv',columns);
 const result=await parse('\uFEFFnome;cognome;extra\r\n"Anna; Maria";"Rossi, Test";ignora\r\n');
 assert.equal(result.error,null);assert.deepEqual(result.rows,[{nome:'Anna; Maria',cognome:'Rossi, Test'}]);
 assert.equal((await parse('nome;nome;cognome\nA;B;C')).error,'intestazioni');
 assert.equal((await parse('nome;altro\nA;B')).error,'intestazioni');
 assert.equal((await parse('nome;cognome\n'+'A;B\n'.repeat(1001))).error,'righe');
 const comma=await parse('nome,cognome\n"A; B","C, D"');assert.equal(comma.error,null);assert.equal(comma.rows[0].nome,'A; B');
 assert.notEqual((await parse('nome;cognome\n"A;B')).error,null);
});
test('Registro PDF: titoli e parole lunghe rispettano margini reali a entrambe le dimensioni',async()=>{
 const {wrapRegisterText,makeRegister}=load('lib/pdf-registro.ts');
 const pdf=await PDFDocument.create();
 for(const [name,size] of [[StandardFonts.Helvetica,9],[StandardFonts.HelveticaBold,12]]){
  const font=await pdf.embedFont(name),long='W'.repeat(180);
  const wrapped=wrapRegisterText(long,font,size);
  assert.ok(wrapped.length>1);assert.equal(wrapped.join(''),long);
  assert.ok(wrapped.every(x=>font.widthOfTextAtSize(x,size)<=499.28));
  assert.deepEqual(wrapRegisterText('Prima\nSeconda',font,size),['Prima','Seconda']);
 }
 const bytes=await makeRegister('W'.repeat(180),Array.from({length:100},()=>({text:'W'.repeat(200),large:true})));
 assert.ok((await PDFDocument.load(bytes)).getPageCount()>1);
});
test('Notifiche: risposta RPC persa, esito persistito e proprietà verificati',async()=>{
 let owned={id:'notification'},ownershipError=null,row={letta_il:'2026-11-28T15:00:00Z'},readError=null,rpcCalls=0;
 const predicates=[];
 const query={field:'',select(f){this.field=f;return this;},eq(k,v){predicates.push([k,v]);return this;},async maybeSingle(){return this.field==='id'?{data:owned,error:ownershipError}:{data:row,error:readError};}};
 const {markAccountNotification}=load('app/notifiche/actions.ts',{
  'next/navigation':{redirect:href=>{throw Error('REDIRECT '+href);}},'next/cache':{revalidatePath:()=>{}},
  '@/lib/security':{requireUser:async()=>({user:{id:'owner'},supabase:{from:()=>query,rpc:async()=>{rpcCalls++;return {error:{code:'NETWORK'}};}}})}
 });
 const f=new FormData();f.set('id','00000000-0000-4000-8000-000000000001');
 await assert.rejects(markAccountNotification(f),/msg=letta$/);
 assert.equal(rpcCalls,1);assert.equal(predicates.filter(([k,v])=>k==='utente_id'&&v==='owner').length,2);
 row={letta_il:null};await assert.rejects(markAccountNotification(f),/msg=errore$/);
 row={letta_il:'2026-11-28'};readError={code:'NETWORK'};await assert.rejects(markAccountNotification(f),/msg=errore$/);
 owned=null;const before=rpcCalls;await assert.rejects(markAccountNotification(f),/msg=errore$/);assert.equal(rpcCalls,before);
});
test('Cron: oltre 50 destinatari non idonei non bloccano i successivi; keyset con date uguali',async()=>{
 const vars=['CRON_SECRET','VERCEL_ENV','SESTO_TEST_MODE','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','RESEND_API_KEY','EMAIL_FROM','EMAIL_NOTIFICATIONS_SINCE','EMAIL_AUTOMATIC_NOTIFICATIONS'];
 const old=Object.fromEntries(vars.map(k=>[k,process.env[k]]));
 const stamp=new Date().toISOString(),ids=Array.from({length:52},(_,i)=>'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'));
 const rows=ids.map((id,i)=>({id,utente_id:String(i),tipo:'test',riferimento:null,titolo:'Titolo',messaggio:'Test',creata_il:stamp}));
 const sent=[],updated=[],cursors=[];
 const db={rpc:async()=>({data:0,error:null}),auth:{admin:{getUserById:async id=>({data:{user:{email:'test@example.test',email_confirmed_at:Number(id)<51?null:stamp}},error:null})}},from(table){
  assert.equal(table,'notifiche');
  let after=-1,limit=50;
  const q={select:()=>q,is:()=>q,gte:()=>q,order:()=>q,limit:n=>{limit=n;return q;},or:filter=>{cursors.push(filter);const id=filter.match(/id\.gt\.([0-9a-f-]+)/)[1];after=ids.indexOf(id);assert.ok(after>=0);return q;},then:resolve=>Promise.resolve({data:rows.slice(after+1,after+1+limit),error:null}).then(resolve),update:()=>({eq:async(k,id)=>{updated.push(id);return {error:null};}})};
  return q;
 }};
 const {GET}=load('app/api/cron/promemoria/route.ts',{'next/server':{NextResponse:{json:(data,options)=>Response.json(data,options)}},'@supabase/supabase-js':{createClient:()=>db},'@/lib/email-service':{currentMailMode:()=>'live',deliverMail:async input=>{sent.push(input);return {mode:'live',accepted:1};}},'@/lib/email-tools':{validEmail:x=>x}});
 try{
  Object.assign(process.env,{CRON_SECRET:'synthetic-secret',VERCEL_ENV:'production',SESTO_TEST_MODE:'false',NEXT_PUBLIC_SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'fake',RESEND_API_KEY:'fake',EMAIL_FROM:'sender@example.test',EMAIL_NOTIFICATIONS_SINCE:new Date(Date.now()-86400000).toISOString(),EMAIL_AUTOMATIC_NOTIFICATIONS:'true'});
  const response=await GET(new Request('http://localhost/api/cron/promemoria',{headers:{authorization:'Bearer synthetic-secret'}})),body=await response.json();
  assert.equal(response.status,200);assert.equal(body.emailSkipped,51);assert.equal(body.emailScanned,52);assert.equal(body.emailSent,1);
  assert.equal(sent.length,1);assert.deepEqual(updated,[ids[51]]);assert.equal(cursors.length,1);assert.ok(cursors[0].includes(ids[49]));
 }finally{for(const k of vars){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}}
});
