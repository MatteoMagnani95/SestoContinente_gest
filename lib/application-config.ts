// Server-side only: legal-version values must never be fabricated as a fallback.
export function applicationLegalConfigured(){
 const version=(v:string|undefined)=>Boolean(v?.trim()&&v.trim()!=='DA_CONFIGURARE');
 const link=(v:string|undefined)=>{try{const u=new URL(v??'');return ['https:','http:'].includes(u.protocol);}catch{return false;}};
 return version(process.env.STATUTO_VERSION)&&version(process.env.PRIVACY_VERSION)&&link(process.env.NEXT_PUBLIC_STATUTO_URL)&&link(process.env.NEXT_PUBLIC_PRIVACY_URL);
}
