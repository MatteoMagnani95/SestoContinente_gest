'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/actions';
import { areaLabel, homeFor, type NavigationAccess } from '@/lib/navigation';
import { Icon } from '@/components/ui/Icon';

export function AreaLinks({access,onNavigate}:{access:NavigationAccess;onNavigate?:()=>void}){
 if(!access.signedIn)return <><Link href="/accedi" onClick={onNavigate}>Accedi</Link><Link href="/registrati" onClick={onNavigate}>Richiedi adesione</Link></>;
 if(!access.enabled)return <Link href="/accedi" onClick={onNavigate}>Accedi nuovamente</Link>;
 return <>
 <Link href={homeFor(access)} onClick={onNavigate}>La mia area iniziale</Link>
 {access.staff&&<Link href="/gestionale" onClick={onNavigate}>Gestionale</Link>}
 {access.personal&&<Link href="/area-personale" onClick={onNavigate}>Area personale</Link>}
 {access.member&&<Link href="/area-soci" onClick={onNavigate}>Area soci</Link>}
 {access.instructor&&<><Link href="/istruttore" onClick={onNavigate}>Area istruttori</Link>{!access.staff&&<Link href="/gestione-eventi" onClick={onNavigate}>Gestisci eventi</Link>}</>}
 {access.board&&<Link href="/organi-sociali" onClick={onNavigate}>Organi sociali</Link>}
 <Link href="/richiesta/stato" onClick={onNavigate}>La mia domanda</Link>
 <Link href="/documenti" onClick={onNavigate}>Documenti</Link>
 {access.personal&&<Link href="/area-personale/profilo" onClick={onNavigate}>Il mio profilo</Link>}
 </>;
}
export function LogoutButton(){return <form action={logoutAction} data-dirty-ignore><button type="submit" className="sc-header-logout"><Icon name="logout"/> Esci</button></form>;}
export default function SiteHeader({access,onMenu,menuOpen}:{access:NavigationAccess;onMenu:()=>void;menuOpen:boolean}){
 const path=usePathname()??'/';
 return <header className="site-header sc-site-header">
 <button type="button" className="sc-mobile-trigger" aria-label="Apri menu" aria-expanded={menuOpen} aria-controls="sc-mobile-menu" onClick={onMenu}><Icon name="menu"/><span>Menu</span></button>
 <Link href="/" className="brand"><span className="brand-symbol" aria-hidden="true">≈</span><span><strong>SESTO CONTINENTE</strong><small>Gestionale associativo</small></span></Link>
 <span className="sc-header-area">{areaLabel(path,access)}</span>
 <nav className="sc-header-nav" aria-label="Account e aree">
 {access.enabled&&access.personal&&access.unread!==null&&<Link className="sc-header-notifications" href="/area-personale#notifiche" aria-label={`Notifiche: ${access.unread} non lette`}><Icon name="bell"/><span>{access.unread}</span></Link>}
 {access.signedIn?<details className="sc-account-menu" key={path}><summary><Icon name="user"/>Account<Icon name="chevron-down"/></summary><div className="sc-account-panel"><AreaLinks access={access}/><LogoutButton/></div></details>:<div className="sc-guest-links"><AreaLinks access={access}/></div>}
 </nav></header>;
}
