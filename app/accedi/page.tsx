import Link from 'next/link';
import { loginAction, recoverAction } from '@/app/actions';
import { queryMessage } from '@/lib/security';
export default async function Login({searchParams}:{searchParams:Promise<{msg?:string}>}){
  const {msg}=await searchParams;
  return <div className="auth-shell"><div className="panel auth-panel"><p className="eyebrow">Accesso riservato</p><h1>Bentornato</h1><p className="muted">Accedi per seguire la tua domanda o lavorare nel gestionale.</p>
    {msg && <p role="status" className={`notice ${msg==='uscita'||msg==='recupero'||msg==='confermata'?'':'error'}`}>{queryMessage(msg)}</p>}
    <form action={loginAction} className="stack">
      <label>Email<input name="email" type="email" required autoComplete="email"/></label>
      <label>Password<input name="password" type="password" required autoComplete="current-password" /></label>
      <button className="button" type="submit">Accedi</button>
    </form>
    <details className="recovery"><summary>Password dimenticata?</summary><form className="stack" action={recoverAction}>
      <label>Email dell'account<input name="email" type="email" required/></label><button className="button ghost" type="submit">Invia link di recupero</button>
    </form></details>
    <p className="auth-bottom">Non hai un account? <Link href="/registrati">Registrati</Link></p>
  </div></div>;
}
