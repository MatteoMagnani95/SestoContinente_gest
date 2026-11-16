import { newPasswordAction } from '@/app/actions';
import { queryMessage } from '@/lib/security';
export default async function PasswordPage({ searchParams }: { searchParams: Promise<{ msg?:string }> }) {
  const { msg } = await searchParams;
  return <div className="auth-shell"><div className="panel auth-panel"><span className="eyebrow">Sicurezza account</span><h1>Imposta una nuova password</h1>
    {msg && <p className="notice error">{queryMessage(msg)}</p>}
    <form action={newPasswordAction} className="stack">
      <label>Nuova password<input name="password" type="password" minLength={10} required autoComplete="new-password" /></label>
      <label>Conferma<input name="confirm" type="password" minLength={10} required autoComplete="new-password" /></label>
      <button className="button" type="submit">Salva password</button>
    </form></div></div>;
}
