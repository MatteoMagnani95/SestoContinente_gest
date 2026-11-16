import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('v12: l’albero sorgente completo ha tutti i moduli ed export richiesti dalle pagine',()=>{
 const r=spawnSync(process.execPath,['scripts/check-v12-build-integrity.mjs'],{cwd:root,encoding:'utf8'});
 assert.equal(r.status,0,`${r.stdout}\n${r.stderr}`);
 assert.match(r.stdout,/[0-9]+ import locali controllati/);
});
test('v12: prima della build vengono verificati i percorsi del repository',()=>{
 const p=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
 assert.equal(p.scripts.prebuild,'npm run check:source');
 assert.ok(p.scripts['check:source'].includes('check-v12-build-integrity.mjs'));
});
