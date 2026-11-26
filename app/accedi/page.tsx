import Link from 'next/link';
import {redirect} from 'next/navigation';
import {headers} from 'next/headers';
import {loginAction,recoverAction,resendVerificationAction} from '@/app/actions';
import {getNavigationAccess} from '@/lib/navigation-access';
import {queryMessage} from '@/lib/security';
import {Alert} from '@/components/ui/Primitives';
import AuthForm from '@/components/AuthForm';
import PasswordField from '@/components/PasswordField';
export default async function Login({searchParams}:{searchParams:Promise<{msg?:string;recupero?:string}>}){
 const [{msg,recupero},access,requestHeaders]=await Promise.all([searchParams,getNavigationAccess(),headers()]);
 if(access.enabled)redirect('/smista');
 // Il verifier PKCE rimane nei cookie del browser sull'host che avvia il recupero.
 // Dalle alias Vercel iniziamo il flusso sul dominio canonico, senza fidarci
 // dell'header Host per costruire un URL esterno.
 let canonicalRecoveryUrl:string|null=null;
 let recoveryConfigured=false;
 try {
   const configured=process.env.NEXT_PUBLIC_SITE_URL;
   if(!configured)throw new Error('missing-site-url');
   const site=new URL(configured);
   if(site.username||site.password||(site.protocol!=='https:'&&!(site.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(site.hostname))))throw new Error('invalid-site-url');
   recoveryConfigured=true;
   if(requestHeaders.get('host')?.toLowerCase()!==site.host.toLowerCase())canonicalRecoveryUrl=new URL('/accedi?recupero=1',site.origin).href;
 } catch {
   // Configurazione non valida: non presentare una richiesta impossibile.
 }
 return <div className="sc-auth-shell"><section className="sc-card sc-auth-panel"><p className="eyebrow">Accesso riservato</p><h1>Accedi</h1><p>Entra nella tua area personale o nel gestionale.</p>
 {msg&&queryMessage(msg)&&<Alert tone={['uscita','recupero','confermata'].includes(msg)?'info':'danger'} announce>{queryMessage(msg)}</Alert>}
 {access.signedIn&&!access.enabled&&<p className="notice warning">L’account non è abilitato. Puoi provare ad accedere con un altro account o contattare la segreteria.</p>}
 <AuthForm action={loginAction} label="Accedi" pendingLabel="Accesso in corso…"><label>Email<input name="email" type="email" required autoComplete="username" autoCapitalize="none" spellCheck={false}/></label><PasswordField/></AuthForm>
 <details className="sc-auth-recovery" open={recupero==='1'||undefined}><summary>Password dimenticata?</summary>
  {!recoveryConfigured?<Alert tone="danger">Recupero password temporaneamente non disponibile. Contatta la segreteria.</Alert>:canonicalRecoveryUrl?<><p>Per recuperare la password, apri la pagina sul dominio ufficiale del gestionale.</p><a className="button" href={canonicalRecoveryUrl}>Vai al recupero password</a></>:<><p>Inserisci l’indirizzo email con cui ti sei registrato. Apri il link ricevuto nello stesso browser e dispositivo.</p><AuthForm action={recoverAction} label="Invia link di recupero" pendingLabel="Invio in corso…"><label>Email dell’account<input name="email" type="email" maxLength={254} required autoComplete="email" autoCapitalize="none" spellCheck={false}/></label></AuthForm></>}
 </details>
 <details className="sc-auth-recovery"><summary>Non hai ricevuto l’email di verifica?</summary><AuthForm action={resendVerificationAction} label="Richiedi nuova email" pendingLabel="Invio in corso…"><label>Email dell’account<input name="email" type="email" required autoComplete="email"/></label></AuthForm></details>
 <p className="auth-bottom">Non hai un account? <Link href="/registrati">Crea il tuo account</Link></p></section></div>;
}
