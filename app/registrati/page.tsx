import AuthIdentity from '@/components/ui/AuthIdentity';
import {Icon} from '@/components/ui/Icon';
import SceltaImmagini from '@/components/SceltaImmagini';
import {informativaRegistrazione} from '@/lib/registrazione';
import {getNavigationAccess} from '@/lib/navigation-access';
import {redirect} from 'next/navigation';
import Link from 'next/link';
import {registerAction} from '@/app/actions';
import {queryMessage} from '@/lib/security';
import {Alert,ButtonLink} from '@/components/ui/Primitives';
import AuthForm from '@/components/AuthForm';
import PasswordField from '@/components/PasswordField';
export default async function Register({searchParams}:{searchParams:Promise<{msg?:string;ok?:string}>}){
 const [{msg,ok},access]=await Promise.all([searchParams,getNavigationAccess()]);
 if(access.enabled)redirect('/smista');
 const legal=informativaRegistrazione();
 return <div className="sc-auth-shell sc-register-shell"><section className="sc-card sc-auth-panel"><div className="sc-auth-decoration" aria-hidden="true"/><p className="eyebrow">Adesione · Account</p><div className="sc-auth-title"><span className="sc-heading-icon sc-area-secretariat"><Icon name="users"/></span><h1>Crea il tuo account</h1></div><p>Prima crea un accesso personale; dopo la verifica email potrai compilare la domanda di adesione.</p>
 <ol className="sc-registration-steps" aria-label="Passaggi per l’adesione">{['Creazione account','Verifica email','Domanda di adesione','Verifica associativa'].map((step,i)=><li key={step} aria-current={i===(ok==='verifica'?1:0)?'step':undefined}><span>{i+1}</span>{step}</li>)}</ol>
 {legal.test&&<Alert tone="warning" title="COLLAUDO" announce>Usa esclusivamente dati inventati. Le dichiarazioni sono simulate.</Alert>}
 {msg&&queryMessage(msg)&&<Alert tone="danger" announce>{queryMessage(msg)}</Alert>}
 {ok==='verifica'?<><Alert tone="info" title="Controlla la tua email" announce>Se la richiesta è valida, riceverai un collegamento di conferma. Controlla anche la posta indesiderata.</Alert><ButtonLink href="/accedi">Vai all’accesso</ButtonLink><p>Non è ancora arrivata? <Link href="/accedi">Richiedi una nuova email dalla pagina Accedi.</Link></p></>:<>
 {!legal.url&&<Alert tone="warning" announce>Registrazione non disponibile: la segreteria deve configurare l’informativa privacy ufficiale.</Alert>}
 <AuthForm action={registerAction} label="Crea account" pendingLabel="Creazione in corso…" disabled={!legal.url}><label>Email<input name="email" type="email" required autoComplete="email" autoCapitalize="none"/></label><PasswordField newPassword/><p className="sc-field-hint">Almeno 10 caratteri. Gli spazi fanno parte della password.</p><PasswordField name="confirm" label="Conferma password" newPassword/>
 <fieldset className="sc-form-section"><legend>Privacy e dichiarazioni</legend><input type="hidden" name="privacy_versione_vista" value={legal.versione}/>{legal.url&&<label className="check-label"><input required type="checkbox" name="presa_visione"/><span>{legal.test?'Simulo la presa visione':'Confermo la presa visione'} dell’<a target="_blank" rel="noopener noreferrer" href={legal.url}>informativa sul trattamento dei dati personali</a> · {legal.versione} (obbligatorio)</span></label>}<SceltaImmagini test={legal.test}/></fieldset></AuthForm></>}
 <p className="auth-bottom">Hai già un account? <Link href="/accedi">Accedi</Link></p></section><AuthIdentity/></div>;
}
