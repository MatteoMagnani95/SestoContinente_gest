import {NereiaProject} from './BrandLogo';
import {Icon} from './Icon';
/** Informational panel only; authentication remains in the original forms. */
export default function AuthIdentity(){
 return <aside className="sc-auth-identity" aria-label="La tua associazione"><div className="sc-auth-identity-copy"><p className="eyebrow">Sesto Continente</p><h2>Il mare ci unisce.</h2><p>Un unico accesso per la tua domanda, le attività e i documenti riservati dell’associazione.</p><div className="sc-auth-private"><Icon name="lock"/><span>Informazioni accessibili secondo il tuo ruolo.</span></div></div><NereiaProject/></aside>;
}
