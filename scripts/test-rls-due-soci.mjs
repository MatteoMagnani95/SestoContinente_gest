/*
 * Prova E2E SOLA LETTURA su un progetto SUPABASE DI TEST, con dati fittizi.
 * NON passa chiavi privilegiate e NON inserisce/modifica dati.
 * Credenziali via variabili ambiente locali (MAI nel repository):
 * NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 * TEST_SOCIO_A_EMAIL, TEST_SOCIO_A_PASSWORD, TEST_SOCIO_A_PERSONA_ID,
 * TEST_SOCIO_B_EMAIL, TEST_SOCIO_B_PASSWORD, TEST_SOCIO_B_PERSONA_ID.
 */
const required=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'TEST_SOCIO_A_EMAIL','TEST_SOCIO_A_PASSWORD','TEST_SOCIO_A_PERSONA_ID',
  'TEST_SOCIO_B_EMAIL','TEST_SOCIO_B_PASSWORD','TEST_SOCIO_B_PERSONA_ID'];
const absent=required.filter(k=>!process.env[k]);
if(absent.length){console.error(`Variabili richieste mancanti: ${absent.join(', ')}`);process.exit(2);}
const base=process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/,'');
const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
async function token(email,password){
 const response=await fetch(`${base}/auth/v1/token?grant_type=password`,{method:'POST',
 headers:{apikey:anon,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
 if(!response.ok)throw new Error(`Login account di test fallito: HTTP ${response.status}`);
 const value=await response.json();return value.access_token;
}
async function readPerson(jwt,id){
 const response=await fetch(`${base}/rest/v1/persone?select=id&id=eq.${encodeURIComponent(id)}`,
  {headers:{apikey:anon,Authorization:`Bearer ${jwt}`,Accept:'application/json'}});
 if(!response.ok)throw new Error(`Lettura persone non riuscita: HTTP ${response.status}`);
 return response.json();
}
async function readCerts(jwt,id){
 const response=await fetch(`${base}/rest/v1/certificati_medici?select=id&persona_id=eq.${encodeURIComponent(id)}`,
  {headers:{apikey:anon,Authorization:`Bearer ${jwt}`,Accept:'application/json'}});
 if(!response.ok)throw new Error(`Lettura certificati non riuscita: HTTP ${response.status}`);
 return response.json();
}
try{
 const a=await token(process.env.TEST_SOCIO_A_EMAIL,process.env.TEST_SOCIO_A_PASSWORD);
 const b=await token(process.env.TEST_SOCIO_B_EMAIL,process.env.TEST_SOCIO_B_PASSWORD);
 const idA=process.env.TEST_SOCIO_A_PERSONA_ID,idB=process.env.TEST_SOCIO_B_PERSONA_ID;
 if(idA===idB)throw new Error('Usa due anagrafiche diverse');
 const [ownA,otherA,ownB,otherB,medicalAB,medicalBA]=await Promise.all([
  readPerson(a,idA),readPerson(a,idB),readPerson(b,idB),readPerson(b,idA),readCerts(a,idB),readCerts(b,idA)]);
 const tests=[
  ['A legge la propria anagrafica',ownA.length===1],
  ['B legge la propria anagrafica',ownB.length===1],
  ['A NON legge anagrafica B',otherA.length===0],
  ['B NON legge anagrafica A',otherB.length===0],
  ['A NON legge certificati B',medicalAB.length===0],
  ['B NON legge certificati A',medicalBA.length===0],
 ];
 for(const [label,pass] of tests)console.log(`${pass?'OK':'ERRORE'} — ${label}`);
 if(tests.some(([,pass])=>!pass))process.exitCode=1;
}catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1;}
