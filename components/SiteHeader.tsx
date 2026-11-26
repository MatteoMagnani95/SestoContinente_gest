'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {useEffect,useRef} from 'react';
import { logoutAction } from '@/app/actions';
import { areaLabel, homeFor, greeting, initials, searchVisible, type NavigationAccess } from '@/lib/navigation';
import { Icon } from '@/components/ui/Icon';
import { BrandMark } from '@/components/ui/BrandLogo';
import GlobalSearch from '@/components/GlobalSearch';

export function AreaLinks({access,onNavigate}:{access:NavigationAccess;onNavigate?:()=>void}){
 if(!access.signedIn)return <><Link href="/accedi" onClick={onNavigate}>Accedi</Link><Link href="/registrati" onClick={onNavigate}>Richiedi adesione</Link></>;
 if(!access.enabled)return <Link href="/accedi" onClick={onNavigate}>Accedi nuovamente</Link>;
 return <>
 {homeFor(access)==='/smista'&&<Link href={homeFor(access)} onClick={onNavigate}>Continua la domanda</Link>}
 {access.staff&&<Link href="/gestionale" onClick={onNavigate}>Gestionale</Link>}
 {access.personal&&<Link href="/area-personale" onClick={onNavigate}>Area personale</Link>}
 {access.member&&<Link href="/area-soci" onClick={onNavigate}>Area soci</Link>}
 {access.instructor&&<><Link href="/istruttore" onClick={onNavigate}>Area istruttori</Link>{!access.staff&&<Link href="/gestione-eventi" onClick={onNavigate}>Gestisci eventi</Link>}</>}
 {access.board&&<Link href="/organi-sociali" onClick={onNavigate}>Organi sociali</Link>}
 <Link href="/richiesta/stato" onClick={onNavigate}>La mia domanda</Link>
 <Link href="/documenti" onClick={onNavigate}>Documenti</Link>
 <Link href="/area-personale/profilo" onClick={onNavigate}>Il mio profilo e consensi</Link>
 </>;
}
export function LogoutButton(){return <form action={logoutAction} data-dirty-ignore><button type="submit" className="sc-header-logout"><Icon name="logout"/> Esci</button></form>;}
export default function SiteHeader({access,onMenu,menuOpen}:{access:NavigationAccess;onMenu:()=>void;menuOpen:boolean}){
 const path=usePathname()??'/';
 const authPage=['/accedi','/registrati','/nuova-password'].includes(path);
 const account=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{const outside=(e:MouseEvent)=>{if(account.current?.open&&e.target instanceof Node&&!account.current.contains(e.target))account.current.open=false;};const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&account.current?.open){account.current.open=false;account.current.querySelector('summary')?.focus();}};document.addEventListener('click',outside);document.addEventListener('keydown',key);return()=>{document.removeEventListener('click',outside);document.removeEventListener('keydown',key);};},[]);
 return <header className="site-header sc-site-header">
 <button type="button" className="sc-mobile-trigger" aria-label="Apri menu" aria-expanded={menuOpen} aria-controls="sc-mobile-menu" onClick={onMenu}><Icon name="menu"/><span>Menu</span></button>
 <Link href={access.enabled?homeFor(access):'/'} className="brand"><BrandMark/><span><strong>SESTO CONTINENTE</strong><small>Gestionale associativo</small></span></Link>
 <span className="sc-header-area">{areaLabel(path,access)}</span>
 {searchVisible(path,access)&&<GlobalSearch/>}
 {access.enabled&&<span className="sc-mobile-greeting">{greeting(access)}</span>}
 <nav className="sc-header-nav" aria-label="Account e aree">
 {access.enabled&&access.personal&&access.unread!==null&&<Link className="sc-header-notifications" href="/area-personale?tab=notifiche" aria-label={`Notifiche: ${access.unread} non lette`}><Icon name="bell"/><span>{access.unread}</span></Link>}
 {access.signedIn?<details className="sc-account-menu" key={path} ref={account}><summary aria-label={access.enabled?greeting(access)+' · Menu account':'Account'}><span className="sc-account-avatar" aria-hidden="true">{initials(access)||<Icon name="user"/>}</span><span>{access.enabled?greeting(access):'Account'}</span><Icon name="chevron-down"/></summary><div className="sc-account-panel"><div className="sc-account-heading"><strong>{access.enabled?greeting(access):'Account'}</strong><span>{areaLabel(path,access)}</span></div><AreaLinks access={access} onNavigate={()=>{if(account.current)account.current.open=false;}}/><Link href="/" onClick={()=>{if(account.current)account.current.open=false;}}>Home pubblica</Link><LogoutButton/></div></details>:<div className="sc-guest-links">{authPage?<Link href="/">Home</Link>:<AreaLinks access={access}/>}</div>}
 </nav></header>;
}
