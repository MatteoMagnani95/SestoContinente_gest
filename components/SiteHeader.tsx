import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import { logoutAction } from '@/app/actions';
export default async function SiteHeader() {
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const access=user?await supabase.rpc('area_soci_accesso'):{data:false};
  return <header className="site-header">
    <Link href="/" className="brand"><span className="brand-symbol">≈</span><span><strong>SESTO CONTINENTE</strong><small>Gestionale associativo</small></span></Link>
    <nav className="topnav" aria-label="Navigazione principale">
      <Link href="/richiesta/stato">La mia domanda</Link>
      <Link href="/area-personale">Area personale</Link>{access.data===true&&<Link href="/area-soci">Area soci</Link>}<Link href="/istruttore">Istruttori</Link><Link href="/documenti">Documenti</Link><Link href="/smista">Home</Link>
      <form action={logoutAction}><button className="link-button" type="submit">Esci</button></form>
    </nav>
  </header>;
}
