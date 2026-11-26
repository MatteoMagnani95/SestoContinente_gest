import {applicationLegalConfig,isTestApplication} from '@/lib/application-config';
import {versioneImmagini} from '@/lib/scelte';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import ApplicationForm from '@/components/ApplicationForm';
import { queryMessage, requireUser } from '@/lib/security';
export default async function NewRequest({searchParams}:{searchParams:Promise<{msg?:string}>}) {
  const { msg } = await searchParams;
  const {supabase,user} = await requireUser();
  if (!user.email_confirmed_at) return <div className="container narrow"><h1>Verifica prima la tua email</h1><p>Per presentare la richiesta devi confermare l'indirizzo utilizzato nella registrazione.</p><Link href="/accedi">Torna all'accesso</Link></div>;
  const {data:request,error:requestError} = await supabase.from('richieste').select('*').eq('utente_id',user.id).maybeSingle();
  if(requestError)return <div className="container narrow"><h1>Domanda non disponibile</h1><p>Impossibile leggere la pratica. Riprova o contatta la segreteria.</p></div>;
  if (request && !['bozza','integrazione_richiesta'].includes(request.stato)) redirect('/richiesta/stato');
  const legal=applicationLegalConfig(user.id);
  const {data:scelta,error:sceltaError}=await supabase.from('scelte_iscrizione').select('scelta').eq('utente_id',user.id).eq('tipo','immagini').eq('versione',legal.testMode?'TEST-COLLAUDO-1':versioneImmagini).order('id',{ascending:false}).limit(1).maybeSingle();
  if(sceltaError)return <div className="container narrow"><h1>Scelte non disponibili</h1><p>Non è possibile leggere le dichiarazioni già registrate. Riprova prima di modificare la domanda.</p><Link href="/richiesta/stato">Torna alla domanda</Link></div>;
  if(request&&(request.versione_statuto||request.versione_privacy)&&isTestApplication(request)!==legal.testMode)return <div className="container narrow"><h1>Modalità della pratica non disponibile</h1><p>Non è possibile convertire una pratica reale in collaudo o viceversa. Contatta la segreteria.</p><Link href="/richiesta/stato">Torna alla pratica</Link></div>;
  return <div className="container narrow sc-applicant-page"><div className="page-intro"><p className="eyebrow">Adesione all'associazione</p><h1>{request?.stato==='integrazione_richiesta'?'Completa la tua domanda':'Richiedi l’adesione'}</h1><p>Compila i dati richiesti. La domanda sarà esaminata dalla segreteria.</p></div>
    
    {request?.stato==='integrazione_richiesta' && <div className="notice"><strong>Informazioni richieste dalla segreteria:</strong> {request.nota_pubblica}</div>}
    {msg && <div className="notice error" role="alert">{queryMessage(msg)}</div>}
    <ApplicationForm saved={request?{...request,flag_statuto:request.versione_statuto===legal.statutoVersion&&request.flag_statuto,flag_privacy:request.versione_privacy===legal.privacyVersion&&request.flag_privacy}:null} sceltaRegistrata={scelta?.scelta??null} legalConfigured={legal.configured} testMode={legal.testMode} statutoUrl={legal.configured?legal.statutoUrl:''} privacyUrl={legal.configured?legal.privacyUrl:''} statutoVersion={legal.statutoVersion} privacyVersion={legal.privacyVersion} />
  </div>;
}
