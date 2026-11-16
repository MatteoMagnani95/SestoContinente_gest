#!/usr/bin/env node
// Fail fast when a GitHub upload has flattened paths, duplicated filenames,
// or omitted source modules. Does not read secrets or access the network.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const problems=[];
const sources=[];
const dirs=['app','lib','components'];
function walk(dir){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const abs=path.join(dir,entry.name);
  if(entry.isDirectory())walk(abs);
  else if(/\.(tsx?|jsx?)$/.test(entry.name) && !entry.name.endsWith('.d.ts')){
   if(/\s\(\d+\)\.(tsx?|jsx?)$/.test(entry.name))problems.push(`File duplicato/rinominato: ${path.relative(root,abs)}`);
   sources.push(abs);
  }
 }
}
for(const d of dirs){const abs=path.join(root,d);if(!fs.existsSync(abs))problems.push(`Directory assente: ${d}`);else walk(abs);}
// TypeScript includes **/*.ts(x): root-level copies such as `page (45).tsx`
// are compiled even when outside app/, and can cause all the errors reported.
for(const name of fs.readdirSync(root)){
 const abs=path.join(root,name);
 if(fs.statSync(abs).isFile() && /\s\(\d+\)\.(tsx?|jsx?)$/.test(name))
  problems.push(`File duplicato alla radice (TS lo compilerà): ${name}`);
}
const mandatory={
 'lib/security.ts':['requireBoard','requireStaff','requireUser'],
 'app/istruttore/actions.ts':['recordAttendance'],
 'app/organi-sociali/actions.ts':['salvaComponente','caricaBozza','avviaApprovazione','approvaVerbale'],
 'app/area-personale/actions.ts':['markNotification'],
 'app/area-personale/profilo/actions.ts':['updateContact'],
 'lib/pdf-registro.ts':['makeRegister'],
 'lib/importazione.ts':['headings']
};
const nodes=new Map();
function parse(abs){
 if(nodes.has(abs))return nodes.get(abs);
 if(!fs.existsSync(abs))return null;
 const src=ts.createSourceFile(abs,fs.readFileSync(abs,'utf8'),ts.ScriptTarget.Latest,true,abs.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 for(const err of src.parseDiagnostics)problems.push(`Sintassi ${path.relative(root,abs)}: ${ts.flattenDiagnosticMessageText(err.messageText,' ')}`);
 nodes.set(abs,src);return src;
}
function exportsOf(abs){
 const src=parse(abs);const names=new Set();if(!src)return names;
 for(const node of src.statements){
  if(ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)){
   for(const el of node.exportClause.elements)names.add(el.name.text);
  }
  if(!node.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword))continue;
  if(node.name?.text)names.add(node.name.text);
  if(ts.isVariableStatement(node))for(const el of node.declarationList.declarations)if(el.name?.text)names.add(el.name.text);
  if(node.modifiers?.some(m=>m.kind===ts.SyntaxKind.DefaultKeyword))names.add('default');
 }
 return names;
}
function resolveLocal(from,request){
 let base=request.startsWith('@/')?path.join(root,request.slice(2)):path.resolve(path.dirname(from),request);
 for(const x of [base,base+'.ts',base+'.tsx',base+'.js',base+'.jsx',path.join(base,'index.ts'),path.join(base,'index.tsx')]) if(fs.existsSync(x)&&fs.statSync(x).isFile())return x;
 return null;
}
for(const [file,items] of Object.entries(mandatory)){
 const abs=path.join(root,file), names=exportsOf(abs);
 if(!fs.existsSync(abs))problems.push(`File obbligatorio assente: ${file}`);
 else for(const n of items)if(!names.has(n))problems.push(`Export assente: ${file} -> ${n}`);
}
let checked=0;
for(const abs of sources){
 const src=parse(abs);
 for(const node of src.statements){
  if(!ts.isImportDeclaration(node)||!ts.isStringLiteral(node.moduleSpecifier))continue;
  const request=node.moduleSpecifier.text;if(!request.startsWith('@/')&&!request.startsWith('.'))continue;
  const target=resolveLocal(abs,request);
  const from=path.relative(root,abs);
  if(!target){problems.push(`Import non risolto: ${from} -> ${request}`);continue;}
  const bindings=node.importClause?.namedBindings;
  if(bindings&&ts.isNamedImports(bindings)){
   const exported=exportsOf(target);
   for(const el of bindings.elements){
    if(el.isTypeOnly)continue;
    const n=(el.propertyName??el.name).text;
    if(!exported.has(n))problems.push(`Manca export: ${from} richiede ${n} da ${path.relative(root,target)}`);
   }
  }
  checked++;
 }
}
if(problems.length){console.error(`INTEGRITÀ SORGENTI: ${problems.length} problemi:\n${problems.map(x=>' - '+x).join('\n')}`);process.exitCode=1;}
else console.log(`INTEGRITÀ SORGENTI OK: ${sources.length} file sorgenti, ${checked} import locali controllati, 7 moduli critici.`);
