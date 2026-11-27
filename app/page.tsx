import {queryMessage} from '@/lib/security';
import {getNavigationAccess} from '@/lib/navigation-access';
import {ButtonLink,Alert} from '@/components/ui/Primitives';
import {Icon} from '@/components/ui/Icon';
import {AssociationLogo,NereiaProject} from '@/components/ui/BrandLogo';
const steps=[['Crea il tuo account','Registrati con il tuo indirizzo email.'],['Verifica l’email','Apri il collegamento ricevuto nella tua casella.'],['Compila la domanda','Inserisci i dati e leggi le dichiarazioni.'],['Attendi la verifica','La segreteria ti comunica l’esito della richiesta.']];
export default async function Home({searchParams}:{searchParams:Promise<{msg?:string}>}){
 const [{msg},access]=await Promise.all([searchParams,getNavigationAccess()]);
 return <div className="sc-public-home">
 <section className="sc-home-hero sc-home-hero-3"><div><p className="eyebrow">Sesto Continente · Associazione subacquea</p><h1>Il mare ci unisce.</h1><p className="sc-home-lead">La tua associazione, in un unico posto.</p><p>Segui la domanda di adesione, consulta le attività e gestisci le informazioni della tua area riservata.</p>
 {msg&&queryMessage(msg)&&<Alert tone="danger" announce>{queryMessage(msg)}</Alert>}
 <div className="sc-home-actions">{!access.signedIn?<><ButtonLink href="/accedi">Accedi</ButtonLink><ButtonLink href="/registrati" variant="secondary">Richiedi adesione</ButtonLink></>:access.enabled?<>{access.personal&&<ButtonLink href="/area-personale">Vai alla mia area personale</ButtonLink>}{access.staff&&<ButtonLink href="/gestionale">Accedi al gestionale</ButtonLink>}{access.instructor&&<ButtonLink href="/istruttore">Area istruttori</ButtonLink>}{access.board&&<ButtonLink href="/organi-sociali" variant="secondary">Organi sociali</ButtonLink>}{access.member&&<ButtonLink href="/area-soci" variant="secondary">Area soci</ButtonLink>}{!access.staff&&!access.instructor&&!access.board&&!access.personal&&<ButtonLink href="/smista">Continua la mia domanda</ButtonLink>}</>:<ButtonLink href="/accedi">Accedi nuovamente</ButtonLink>}</div></div>
 <aside className="sc-home-identity"><AssociationLogo/><span>Gestionale associativo</span></aside></section>
 {!access.signedIn?<section className="sc-home-process"><h2>Come diventare socio</h2><ol>{steps.map(([title,description],i)=><li key={title}><span className="sc-process-number">{i+1}</span><div><h3>{title}</h3><p>{description}</p></div></li>)}</ol><p className="sc-home-note"><Icon name="info"/> Creare un account non significa essere già socio. L’adesione richiede la verifica associativa.</p></section>:access.enabled&&<section className="sc-home-process"><h2>Le tue informazioni</h2><div className="sc-home-actions"><ButtonLink variant="secondary" href="/area-personale/profilo">Profilo e consensi</ButtonLink><ButtonLink variant="secondary" href="/richiesta/stato">Stato della domanda</ButtonLink><ButtonLink variant="secondary" href="/documenti">Documenti</ButtonLink></div></section>}
 <NereiaProject/>
 </div>;
}
