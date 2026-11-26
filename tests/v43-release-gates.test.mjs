import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,relative,sep} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>readFileSync(join(root,p),'utf8');

test('Inventario finale: tutte le route e layout Next.js sono censiti',()=>{
 const inventory=read('docs/redesign/PAGE_REQUIREMENTS.md');
 const files=[];
 function walk(dir){
  for(const entry of readdirSync(dir,{withFileTypes:true})){
   const path=join(dir,entry.name);
   if(entry.isDirectory())walk(path);
   else if(/^(page|route|layout)\.tsx?$/.test(entry.name))files.push(relative(root,path).split(sep).join('/'));
  }
 }
 walk(join(root,'app'));
 const missing=files.filter(path=>!inventory.includes('| `'+path+'` |'));
 assert.deepEqual(missing,[],'Route non censite');
});

test('Migrazioni: timestamp canonici univoci e nuove migrazioni documentate',()=>{
 const files=readdirSync(join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql')).sort();
 const versions=files.map(f=>{assert.match(f,/^\d{14}_[a-zA-Z0-9_]+\.sql$/);return f.slice(0,14);});
 assert.equal(new Set(versions).size,versions.length,'Timestamp duplicato');
 const closure=read('docs/redesign/F5_CLOSURE.md');
 for(const f of files.filter(f=>f.slice(0,14)>'20261125223000'))assert.ok(closure.includes(f),f+' non documentata');
 assert.ok(files.includes('20261125223000_patch_0019.sql'));
});

test('RLS E2E: endpoint non locale bloccato prima dei login',()=>{
 const env={...process.env,QA_ISOLATED_ENV:'true',NEXT_PUBLIC_SUPABASE_URL:'https://example.invalid',NEXT_PUBLIC_SUPABASE_ANON_KEY:'synthetic',
 TEST_SOCIO_A_EMAIL:'a@example.invalid',TEST_SOCIO_A_PASSWORD:'synthetic',TEST_SOCIO_A_PERSONA_ID:'00000000-0000-4000-8000-000000000001',
 TEST_SOCIO_B_EMAIL:'b@example.invalid',TEST_SOCIO_B_PASSWORD:'synthetic',TEST_SOCIO_B_PERSONA_ID:'00000000-0000-4000-8000-000000000002'};
 const run=spawnSync(process.execPath,[join(root,'scripts/test-rls-due-soci.mjs')],{env,encoding:'utf8',timeout:5000});
 assert.equal(run.status,2);assert.match(run.stderr,/Supabase locale isolato/);
});
