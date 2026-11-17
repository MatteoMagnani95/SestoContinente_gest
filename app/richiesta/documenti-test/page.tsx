import {notFound} from 'next/navigation';
import {requireUser} from '@/lib/security';
import {applicationLegalConfig} from '@/lib/application-config';
export const dynamic='force-dynamic';
export default async function TestDocument({searchParams}:{searchParams:Promise<{tipo?:string}>}){
 const {user}=await requireUser();
 if(!user.email_confirmed_at || !applicationLegalConfig(user.id).testMode)notFound();
 const {tipo}=await searchParams;
 if(tipo!=='statuto'&&tipo!=='privacy')notFound();
 return <main className="container narrow"><article className="panel"><p className="eyebrow">SESTO CONTINENTE – COLLAUDO</p><h1>{tipo==='statuto'?'Statuto di prova':'Informativa privacy di prova'}</h1><p className="notice warning"><strong>Documento fittizio — TEST-COLLAUDO-1.</strong> Non è uno statuto né un’informativa ufficiale. Non ha valore legale.</p><p>Questo documento serve unicamente per simulare la lettura e la conferma nel flusso di adesione. Utilizza esclusivamente identità e recapiti inventati. Le operazioni di collaudo possono essere registrate nel database utilizzato dal gestionale.</p><p>Nessun consenso reale relativo alle immagini o al trattamento dei dati è richiesto da questo documento di prova.</p><p>Chiudi questa scheda per tornare alla compilazione.</p></article></main>;
}
