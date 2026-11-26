import SceltaImmagini from '@/components/SceltaImmagini';
import {informativaRegistrazione} from '@/lib/registrazione';
import Link from 'next/link';
import { registerAction } from '@/app/actions';
import { queryMessage } from '@/lib/security';
export default async function Register({searchParams}:{searchParams:Promise<{msg?:string,ok?:string}>}){
  const legal=informativaRegistrazione();
  const {msg,ok}=await searchParams;
  return <div className="auth-shell"><div className="panel auth-panel"><p className="eyebrow">Nuovo account</p><h1>Inizia da qui</h1><p className="muted">Crea il tuo accesso personale. La domanda di adesione si compila dopo la verifica dell'email.</p>
    {msg && <p className="notice error" role="alert">{queryMessage(msg)}</p>}
    {ok && <div className="notice success" role="status"><strong>Controlla la tua email.</strong> Se l'indirizzo è valido, riceverai un link di conferma. Dopo averlo aperto potrai compilare la domanda.</div>}
    <form action={registerAction} className="stack">
      <label>Email<input name="email" type="email" autoComplete="email" required/></label>
      <label>Password <span className="muted tiny">(minimo 10 caratteri)</span><input name="password" type="password" minLength={10} autoComplete="new-password" required/></label>
      <label>Conferma password<input name="confirm" type="password" minLength={10} autoComplete="new-password" required/></label>
      {legal.url?<label className="check-label"><input required type="checkbox" name="presa_visione"/><span>{legal.test?'Simulo la presa visione':'Confermo la presa visione'} dell’<a target="_blank" rel="noopener noreferrer" href={legal.url}>informativa sul trattamento dei dati personali</a> · {legal.versione}</span></label>:<p role="alert">La segreteria deve configurare l’informativa privacy.</p>}
      <SceltaImmagini test={legal.test}/><button className="button" type="submit" disabled={!legal.url}>Crea account</button>
    </form>
    <p className="auth-bottom">Hai già un account? <Link href="/accedi">Accedi</Link></p>
  </div></div>;
}
