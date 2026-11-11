import Link from 'next/link';
import { logoutAction } from '@/app/actions';
export default function SiteHeader() {
  return <header className="site-header">
    <Link href="/" className="brand"><span className="brand-symbol">≈</span><span><strong>SESTO CONTINENTE</strong><small>Gestionale associativo</small></span></Link>
    <nav className="topnav" aria-label="Navigazione principale">
      <Link href="/richiesta/stato">La mia domanda</Link>
      <Link href="/gestionale">Segreteria</Link>
      <form action={logoutAction}><button className="link-button" type="submit">Esci</button></form>
    </nav>
  </header>;
}
