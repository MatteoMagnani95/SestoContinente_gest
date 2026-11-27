import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Marine private layer is presentation-only and excluded from approved public routes',()=>{
 const shell=read('components/AppShell.tsx'),css=read('app/marine-premium-private.css');
 assert.match(shell,/const marinePrivate=access.enabled&&\['\/gestionale'/);
 const line=shell.split('\n').find(l=>l.includes('const marinePrivate='));
 assert.doesNotMatch(line,/\/richiesta|\/accedi|\/registrati|\/nuova-password/);
 assert.match(shell,/marinePrivate\?' sc-marine-private':''/);
 assert.match(read('app/layout.tsx'),/import '\.\/marine-premium-private\.css'/);
 assert.doesNotMatch(css,/@import|:root\s*\{|url\([^)]*\.svg|https?:\/\//i);
 assert.ok(Buffer.byteLength(css)<12000);
 assert.equal([...css.matchAll(/url\(/g)].length,1);
 assert.match(css,/marine-paint-reef-240\.webp/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('Marine private visual QA runs only on synthetic loopback with RPC OFF and preserves public QA',()=>{
 const qa=read('scripts/qa-marine-private.mjs'),wf=read('.github/workflows/marine-premium-off.yml');
 assert.match(qa,/QA_ISOLATED_ENV/);assert.match(qa,/SC_STRUCTURAL_RPC_RELEASE/);
 assert.match(qa,/127\.0\.0\.1:3314/);assert.match(qa,/320,390,768,1024,1440/);
 for(const role of ['staff','secretary','member','instructor','board'])assert.ok(qa.includes("'"+role+"'"));
 assert.match(wf,/qa-marine-private\.mjs/);assert.match(wf,/qa-local-supabase\.mjs auth/);
 assert.match(wf,/qa-performance-compare\.mjs/);assert.match(wf,/SC_STRUCTURAL_RPC: 'false'/);
});
