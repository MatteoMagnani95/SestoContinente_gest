import Link from 'next/link';
import {redirect} from 'next/navigation';
import {loginAction,recoverAction,resendVerificationAction} from '@/app/actions';
import {getNavigationAccess} from '@/lib/navigation-access';
import {queryMessage} from '@/lib/security';
import {Alert} from '@/components/ui/Primitives';
import AuthForm from '@/components/AuthForm';
import PasswordField from '@/components/PasswordField';
export default async function Login({searchParams}:{searchParams:Promise<{msg?:string}>}){
 const [{msg},access]=await Promise.all([searchParams,getNavigationAccess()]);
 if(access.enabled)redirect('/smista');
 return <div className="sc-auth-shell"><section className="sc-card sc-auth-panel"><p className="eyebrow">Accesso riservato</p><h1>Accedi</h1><p>Entra nella tua area personale o nel gestionale.</p>
 {msg&&queryMessage(msg)&&<Alert tone={['uscita','recupero','confermata'].includes(msg)?'info':'danger'} announce>{queryMessage(msg)}</Alert>}
 {access.signedIn&&!access.enabled&&<p className="notice warning">L’account non è abilitato. Puoi provare ad accedere con un altro account o contattare la segreteria.</p>}
 <AuthForm action={loginAction} label="Accedi" pendingLabel="Accesso in corso…"><label>Email<input name="email" type="email" required autoComplete="username" autoCapitalize="none" spellCheck={false}/></label><PasswordField/></AuthForm>
 <details className="sc-auth-recovery"><summary>Password dimenticata?</summary><p>Inserisci l’email del tuo account per richiedere un collegamento di recupero.</p><AuthForm action={recoverAction} label="Invia link di recupero" pendingLabel="Invio in corso…"><label>Email dell’account<input name="email" type="email" required autoComplete="email"/></label></AuthForm></details>
 <details className="sc-auth-recovery"><summary>Non hai ricevuto l’email di verifica?</summary><AuthForm action={resendVerificationAction} label="Richiedi nuova email" pendingLabel="Invio in corso…"><label>Email dell’account<input name="email" type="email" required autoComplete="email"/></label></AuthForm></details>
 <p className="auth-bottom">Non hai un account? <Link href="/registrati">Crea il tuo account</Link></p></section></div>;
}
