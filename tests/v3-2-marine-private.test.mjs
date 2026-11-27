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
 assert.doesNotMatch(css,/url\(/,'operational CSS must not load decorative images');
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

test('Dashboard has a compact unboxed heading, real season and unchanged warning',()=>{
 const dashboard=read('app/gestionale/page.tsx'),css=read('app/marine-premium-private.css');
 assert.match(dashboard,/<header className="sc-dashboard-compact-heading"><h1>Centro operativo<\/h1>/);
 assert.doesNotMatch(dashboard,/eyebrow="Gestione associativa"|<PageHeader/);
 assert.match(dashboard,/season\.nome/);assert.match(dashboard,/Stagione attiva non disponibile/);
 assert.match(css,/\.sc-dashboard-compact-heading\{[^}]*background:none;border:0;box-shadow:none/);
 assert.match(read('scripts/qa-marine-private.mjs'),/dashboard-compact-heading/);
});

test('Operational headers remain unboxed and member counts preserve readable compact layout',()=>{
 const css=read('app/marine-premium-private.css'),qa=read('scripts/qa-marine-private.mjs');
 assert.match(css,/\.sc-marine-private \.sc-page-header\.sc-page-header-marine\{\s*background:none;border:0;border-radius:0;box-shadow:none/);
 assert.match(css,/\.sc-member-list-metrics \.sc-metric-label\{[^}]*font-size:14px/);
 assert.match(qa,/15-scheda-socio/);assert.match(qa,/16-anagrafiche/);assert.match(qa,/decorative header/);
});
