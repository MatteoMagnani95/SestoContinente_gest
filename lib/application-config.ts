// Server-only global switch. Off unless explicitly enabled by the deployment owner.
const TEST_VERSION = 'TEST-COLLAUDO-1';
const validUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function applicationLegalConfig(userId: string, env: Record<string,string|undefined> = process.env) {
 const testMode = validUUID.test(userId) && env.SESTO_TEST_MODE?.trim().toLowerCase() === 'true';
 if(testMode)return {configured:true,testMode:true,statutoVersion:TEST_VERSION,privacyVersion:TEST_VERSION,statutoUrl:'/richiesta/documenti-test?tipo=statuto',privacyUrl:'/richiesta/documenti-test?tipo=privacy'};
 const version=(v:string|undefined)=>Boolean(v?.trim()&&v.trim()!=='DA_CONFIGURARE'&&!v.trim().toUpperCase().startsWith('TEST-'));
 const link=(v:string|undefined)=>{try{const u=new URL(v??'');return ['https:','http:'].includes(u.protocol);}catch{return false;}};
 const statutoVersion=env.STATUTO_VERSION?.trim()??'',privacyVersion=env.PRIVACY_VERSION?.trim()??'';
 const statutoUrl=env.NEXT_PUBLIC_STATUTO_URL?.trim()??'',privacyUrl=env.NEXT_PUBLIC_PRIVACY_URL?.trim()??'';
 return {configured:version(statutoVersion)&&version(privacyVersion)&&link(statutoUrl)&&link(privacyUrl),testMode:false,statutoVersion,privacyVersion,statutoUrl,privacyUrl};
}
export function isTestApplication(r:{versione_statuto?:string|null;versione_privacy?:string|null}){
 return [r.versione_statuto,r.versione_privacy].some(v=>v?.startsWith('TEST-COLLAUDO-'));
}
