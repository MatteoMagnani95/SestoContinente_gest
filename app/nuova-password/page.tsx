import {newPasswordAction} from '@/app/actions';
import {requireUser,queryMessage} from '@/lib/security';
import {Alert} from '@/components/ui/Primitives';
import AuthForm from '@/components/AuthForm';
import PasswordField from '@/components/PasswordField';
export default async function PasswordPage({searchParams}:{searchParams:Promise<{msg?:string}>}){
 await requireUser();const {msg}=await searchParams;
 return <div className="sc-auth-shell"><section className="sc-card sc-auth-panel"><p className="eyebrow">Sicurezza account</p><h1>Imposta una nuova password</h1><p>Scegli almeno 10 caratteri. Gli spazi sono significativi.</p>{msg&&queryMessage(msg)&&<Alert tone="danger" announce>{queryMessage(msg)}</Alert>}<AuthForm action={newPasswordAction} label="Salva password" pendingLabel="Salvataggio in corso…"><PasswordField label="Nuova password" newPassword/><PasswordField name="confirm" label="Conferma password" newPassword/></AuthForm></section></div>;
}
