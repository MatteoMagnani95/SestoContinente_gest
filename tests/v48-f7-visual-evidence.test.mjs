import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('F7: script sintatticamente valido, solo loopback e artifact separato',()=>{
 const path=new URL('../scripts/qa-local-visual.mjs',import.meta.url);
 const r=spawnSync(process.execPath,['--check',path.pathname],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 const s=read('scripts/qa-local-visual.mjs'),w=read('.github/workflows/qa-supabase.yml');
 assert.match(s,/QA_ISOLATED_ENV==='true'/);assert.match(s,/SESTO_EMAIL_MODE==='simulate'/);
 assert.match(s,/\[app,api,db\]\.every\(loopback\)/);assert.match(s,/!out.startsWith\(work\+'\/'\)/);
 assert.match(s,/\[app.origin,api.origin\]\.includes\(u.origin\)\?route.continue\(\):route.abort\(\)/);
 assert.match(s,/headCommit:env.QA_HEAD_SHA/);assert.match(s,/checkoutCommit:execFileSync\('git'/);
 assert.match(w,/name: visual-f7/);assert.match(w,/sesto-visual-\$\{\{ github.run_id \}\}\/\*\.png/);
 assert.match(w,/sesto-visual-\$\{\{ github.run_id \}\}\/visual-manifest.json/);
 assert.match(w,/QA_HEAD_SHA: \$\{\{ github.event.pull_request.head.sha \|\| github.sha \}\}/);
});
test('F7: tutti i 16 riferimenti coperti senza importare immagini di riferimento',()=>{
 const s=read('scripts/qa-local-visual.mjs');
 for(let i=1;i<=16;i++)assert.ok(s.includes("['"+String(i).padStart(2,'0')), 'Riferimento '+i+' mancante');
 assert.match(s,/\['chromium',chromium\],\['webkit',webkit\]/);
 for(const width of [320,390,768,844,1024,1440,1920])assert.ok(s.includes('width:'+width));
 assert.match(s,/if\(report.errors.length\)process.exitCode=1/);
 const m=read('components/MailContextPage.tsx');assert.match(m,/<PageHeader/);assert.match(m,/<AssociationMailForm/);assert.match(m,/contextKey\(context\)/);
});
