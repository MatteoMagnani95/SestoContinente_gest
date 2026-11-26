import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const source=readFileSync(new URL('../app/area-personale/certificato/actions.ts',import.meta.url),'utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});

test('Il certificato originale è conservato quando la conferma del database è incerta',async()=>{
  const removed=[];
  let responseCode='',linked=null,lookupError=null;
  const storage={upload:async()=>({error:null}),remove:async paths=>{removed.push(...paths);return {error:null};}};
  const query={
    insert:()=>query,select:()=>query,eq:()=>query,single:async()=>({data:{id:'documento'}}),
    maybeSingle:async()=>({data:linked,error:lookupError}),
  };
  const supabase={
    from:()=>query,
    rpc:async name=>name==='registra_certificato_personale'?{error:{code:responseCode}}:{data:true,error:null},
  };
  const dependencies={
    '@/lib/security':{requireUser:async()=>({supabase,user:{id:'account'}})},
    '@/lib/course-tools':{UUID_RE:/^persona$/},
    '@/lib/supabase/admin':{createAuthAdmin:()=>({storage:{from:()=>storage}})},
    '@/lib/area-soci':{todayRome:()=>'2026-11-26'},
    '@/lib/payment-tools':{validPaymentDate:()=>true},
    '@/lib/file-certificato':{tipoCertificato:()=>'pdf',certificatoAmmesso:()=>true},
    'next/cache':{revalidatePath:()=>{}},
  };
  const actions={};
  new Function('exports','require',outputText)(actions,id=>dependencies[id]??require(id));
  const data=new FormData();
  data.set('persona_id','persona');data.set('rilasciato_il','2026-11-01');data.set('scade_il','2027-11-01');
  data.set('file',new File(['sintetico'],'test.pdf',{type:'application/pdf'}));
  assert.match((await actions.caricaCertificato(data)).error,/verificare/);
  responseCode='P0001';lookupError={code:'503'};
  assert.match((await actions.caricaCertificato(data)).error,/verificare/);
  linked={id:'certificato'};lookupError=null;
  assert.equal((await actions.caricaCertificato(data)).error,null);
  assert.equal(removed.length,0);
  linked=null;
  assert.match((await actions.caricaCertificato(data)).error,/non salvato/);
  assert.equal(removed.length,1);
});
