// QA-only preload; no changes to application fetch implementation in production.
const {setTimeout:delay}=require('node:timers/promises');
const env=process.env,ms=Number(env.QA_DB_LATENCY_MS||0);
if(ms>0){
 if(env.QA_ISOLATED_ENV!=='true'||env.SESTO_TEST_MODE!=='true'||env.SESTO_EMAIL_MODE!=='simulate'||![40,80].includes(ms))throw Error('Latency injection requires isolated QA');
 const api=new URL(env.NEXT_PUBLIC_SUPABASE_URL);
 if(!['127.0.0.1','localhost'].includes(api.hostname)||api.port!=='54321'||api.protocol!=='http:')throw Error('Latency injection requires loopback Supabase');
 const fetchOriginal=globalThis.fetch;
 let reported=false;
 globalThis.fetch=async function(input,...rest){
  let target;try{target=new URL(typeof input==='string'||input instanceof URL?input:input.url);}catch{}
  if(target?.origin===api.origin&&(/^\/(rest|auth)\/v1(?:\/|$)/.test(target.pathname))){
   if(!reported){reported=true;console.log('QA_LATENCY_ACTIVE '+ms+'ms');}
   await delay(ms);
  }
  return fetchOriginal.call(this,input,...rest);
 };
}
