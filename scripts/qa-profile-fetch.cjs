// Separate diagnostic servers only; never preload into the measured benchmark.
const {appendFileSync}=require('node:fs');
const {join,resolve,dirname}=require('node:path');
const {performance}=require('node:perf_hooks');
const env=process.env;
if(env.QA_PROFILE_FETCH==='true'){
 if(env.QA_ISOLATED_ENV!=='true'||env.SESTO_TEST_MODE!=='true'||env.SESTO_EMAIL_MODE!=='simulate')throw Error('Profile requires isolated QA');
 const api=new URL(env.NEXT_PUBLIC_SUPABASE_URL);
 if(api.protocol!=='http:'||!['127.0.0.1','localhost'].includes(api.hostname)||api.port!=='54321')throw Error('Profile requires loopback');
 if(!['baseline','candidate'].includes(env.QA_PROFILE_VERSION))throw Error('Profile version required');
 const work=resolve(env.QA_WORK_DIR),file=join(work,'fetch-profile-'+env.QA_PROFILE_VERSION+'.ndjson');
 if(!work.startsWith(resolve(env.RUNNER_TEMP)+'/sesto-qa.')||dirname(file)!==work)throw Error('Profile path not isolated');
 const original=globalThis.fetch;
 globalThis.fetch=async function(input,...rest){
  let target;try{target=new URL(typeof input==='string'||input instanceof URL?input:input.url);}catch{}
  const match=target?.origin===api.origin?target.pathname.match(/^\/(auth|rest)\/v1(?:\/(rpc\/)?([a-zA-Z_]+))?$/):null;
  if(!match)return original.call(this,input,...rest);
  const category=match[1]==='auth'?'auth':match[2]?'rpc':'rest';
  // Static endpoint names only; no query, headers, body, IDs or token.
  const endpoint=match[1]==='auth'?'auth':match[3]||'other';
  const start=performance.now();let status=0;
  try{const response=await original.call(this,input,...rest);status=response.status;return response;}
  finally{appendFileSync(file,JSON.stringify({category,endpoint,status,ms:Math.round((performance.now()-start)*100)/100})+'\n');}
 };
}
