import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
function load(name,imports={}){
 const source=readFileSync(new URL('../'+name,import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const exports={};new Function('exports','require',js)(exports,id=>imports[id]??require(id));return exports;
}
const {tipoCertificato,certificatoAmmesso}=load('lib/file-certificato.ts');
test('PDF e JPEG sono verificati per dimensione, estensione, MIME e contenuto',async()=>{
 const {PDFDocument}=require('pdf-lib'),pdf=await PDFDocument.create();pdf.addPage();
 const bytes=Buffer.from(await pdf.save());
 assert.equal(tipoCertificato('prova.PDF','application/pdf',bytes.length),'pdf');
 assert.equal(certificatoAmmesso(bytes,'pdf'),true);
 assert.equal(tipoCertificato('prova.JPEG','image/jpeg',100),'jpg');
 assert.equal(tipoCertificato('prova.png','image/png',100),null);
 assert.equal(tipoCertificato('prova.pdf','image/jpeg',100),null);
 assert.equal(tipoCertificato('prova.pdf','application/pdf',10485761),null);
 assert.equal(certificatoAmmesso(bytes,'jpg'),false);
 assert.equal(certificatoAmmesso(Buffer.from('%PDF-1.5 file troncato'),'pdf'),false);
});
for(const autorizzato of [true,false])test('Route certificato con accesso '+(autorizzato?'autorizzato':'negato'),async()=>{
 const bytes=Buffer.from('%PDF-1.7\ncontenuto fittizio\n%%EOF');
 let download=0;
 const query={select:()=>query,eq:()=>query,maybeSingle:async()=>({data:{percorso_storage:'test',mime:'application/pdf'}})};
 const db={from:()=>query,rpc:async(name)=>({data:name==='documento_sanitario'||autorizzato})};
 const admin={storage:{from:()=>({download:async()=>{download++;return {data:new Blob([bytes])};}})}};
 const {GET}=load('app/documenti/[id]/route.ts',{'@/lib/security':{requireUser:async()=>({supabase:db})},'@/lib/supabase/admin':{createAuthAdmin:()=>admin},'next/server':{}});
 const response=await GET(new Request('https://example.invalid/documenti/prova'),{params:Promise.resolve({id:'33333333-3333-4333-8333-333333333333'})});
 assert.equal(response.status,autorizzato?200:404);
 assert.equal(download,autorizzato?1:0);
 if(autorizzato){assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);assert.match(response.headers.get('Cache-Control'),/no-store/);}
});
