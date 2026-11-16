import Link from 'next/link';
import { registerAction } from '@/app/actions';
import { queryMessage } from '@/lib/security';
export default async function Register({searchParams}:{searchParams:Promise<{msg?:string,ok?:string}>}){
  const {msg,ok}=await searchParams;
  return <div className="auth-shell"><div className="panel auth-panel"><p className="eyebrow">Nuovo account</p><h1>Inizia da qui</h1><p className="muted">Crea il tuo accesso personale. La domanda di adesione si compila dopo la verifica dell'email.</p>
    {msg && <p className="notice error" role="alert">{queryMessage(msg)}</p>}
    {ok && <div className="notice success" role="status"><strong>Controlla la tua email.</strong> Se l'indirizzo è valido, riceverai un link di conferma. Dopo averlo aperto potrai compilare la domanda.</div>}
    <form action={registerAction} className="stack">
      <label>Email<input name="email" type="email" autoComplete="email" required/></label>
      <label>Password <span className="muted tiny">(minimo 10 caratteri)</span><input name="password" type="password" minLength={10} autoComplete="new-password" required/></label>
      <label>Conferma password<input name="confirm" type="password" minLength={10} autoComplete="new-password" required/></label>
      <button className="button" type="submit">Crea account</button>
    </form>
    <p className="auth-bottom">Hai già un account? <Link href="/accedi">Accedi</Link></p>
  </div></div>;
}
