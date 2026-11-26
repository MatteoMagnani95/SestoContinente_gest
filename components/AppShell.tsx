'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import SiteHeader,{AreaLinks,LogoutButton} from '@/components/SiteHeader';
import StaffNav,{staffGroups} from '@/components/StaffNav';
import { Icon } from '@/components/ui/Icon';
import { activeItem, areaLabel, backTarget, contextPath, listContext, restoredTarget, staffArea, type NavigationAccess } from '@/lib/navigation';
import GlobalCancelButtons from '@/components/GlobalCancelButtons';

function Breadcrumb({path,access,title,contexts}:{path:string;access:NavigationAccess;title:string;contexts:Record<string,string>}){
 const staff=staffArea(path,access),items=staff?staffGroups(access.admin).flatMap(g=>g.items):[];
 const active=activeItem(path,items),item=items.find(i=>i.href===active),back=backTarget(path,access);
 const leaf=title||item?.label||areaLabel(path,access);
 return <nav aria-label="Percorso di navigazione" className="sc-breadcrumb"><ol><li><Link href="/">Home</Link></li>
 {staff&&path!=='/gestionale'&&<li><Link href="/gestionale">Gestionale</Link></li>}
 {item&&active!==path&&active!=='/gestionale'&&<li><Link href={restoredTarget({href:item.href,label:item.label},contexts).href}>{item.label}</Link></li>}
 {!staff&&back&&back.href!=='/'&&back.href!==path&&<li><Link href={restoredTarget(back,contexts).href}>{back.label.replace(/^Torna (?:alla |agli |ai |al |all’)/,'')}</Link></li>}
 <li aria-current="page">{leaf}</li></ol></nav>;
}
export default function AppShell({access,children}:{access:NavigationAccess;children:ReactNode}){
 const path=usePathname()??'/',staff=staffArea(path,access),internal=path!=='/'&&path!=='/smista';
 const [open,setOpen]=useState(false);
 const [title,setTitle]=useState({path:'',value:''});
 const [contexts,setContexts]=useState<Record<string,string>>({});
 const menu=useRef<HTMLDialogElement>(null),content=useRef<HTMLDivElement>(null),trigger=useRef<HTMLElement|null>(null);
 function closeMenu(restore=true){
  if(menu.current?.open)menu.current.close();setOpen(false);
  if(restore)trigger.current?.focus();
 }
 function showMenu(){
  trigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
  if(menu.current&&!menu.current.open){menu.current.showModal();setOpen(true);}
 }
 useEffect(()=>{closeMenu(false);},[path]);
 useEffect(()=>{
  const capture=()=>{const p=window.location.pathname;if(contextPath(p)){const value=listContext(p,window.location.search);setContexts(old=>old[p]===value?old:{...old,[p]:value});}};
  capture();
  const onClick=(e:MouseEvent)=>{if(e.target instanceof Element&&e.target.closest('a[href]'))capture();};
  document.addEventListener('click',onClick,true);window.addEventListener('popstate',capture);
  return()=>{document.removeEventListener('click',onClick,true);window.removeEventListener('popstate',capture);};
 },[path]);
 useEffect(()=>{
  const read=()=>{const value=content.current?.querySelector('h1')?.textContent?.trim()??'';setTitle(old=>old.path===path&&old.value===value?old:{path,value});};
  read();const observer=new MutationObserver(read);if(content.current)observer.observe(content.current,{childList:true,subtree:true,characterData:true});return()=>observer.disconnect();
 },[path]);
 useEffect(()=>{
  const desktop=window.matchMedia('(min-width: 1001px)');const update=()=>{if(desktop.matches)closeMenu();};
  desktop.addEventListener('change',update);return()=>desktop.removeEventListener('change',update);
 },[]);
 const back=backTarget(path,access),target=back?restoredTarget(back,contexts):null;
 const crumbs=internal&&<div className="sc-page-navigation"><Breadcrumb path={path} access={access} title={title.path===path?title.value:''} contexts={contexts}/>{target&&<Link className="sc-back-button" href={target.href}><Icon name="arrow-left"/>{target.label}</Link>}</div>;
 return <>
 <a href="#sc-main" className="sc-skip-link">Vai al contenuto</a>
 <SiteHeader access={access} onMenu={showMenu} menuOpen={open}/>
 <dialog ref={menu} id="sc-mobile-menu" className="sc-mobile-menu" aria-labelledby="sc-menu-title" onCancel={e=>{e.preventDefault();closeMenu();}} onClose={()=>setOpen(false)} onClick={e=>{if(e.target===e.currentTarget)closeMenu();}}>
  <div className="sc-mobile-menu-inner">
   <header className="sc-mobile-menu-heading"><h2 id="sc-menu-title">Menu</h2><button type="button" className="sc-icon-button" onClick={()=>closeMenu()} aria-label="Chiudi menu" autoFocus><Icon name="close"/></button></header>
   {staff&&<StaffNav isAdmin={access.admin} idPrefix="mobile" onNavigate={()=>closeMenu(false)}/>}
   <nav className="sc-mobile-areas" aria-label="Aree e account"><AreaLinks access={access} onNavigate={()=>closeMenu(false)}/>{access.enabled&&access.personal&&access.unread!==null&&<Link href="/area-personale#notifiche" onClick={()=>closeMenu(false)}>Notifiche ({access.unread})</Link>}{access.signedIn&&<LogoutButton/>}</nav>
  </div>
 </dialog>
 <GlobalCancelButtons/>
 <main id="sc-main" tabIndex={-1} className={staff?'sc-main sc-main-staff':'sc-main'}>
 {staff?<div className="container staff-layout sc-staff-layout"><aside className="staff-sidebar sc-staff-sidebar"><div className="sc-sidebar-heading"><strong>{access.admin?'Amministrazione':'Segreteria'}</strong><span>Gestione associativa</span></div><StaffNav isAdmin={access.admin}/></aside><div className="staff-content sc-staff-content">{crumbs}<div ref={content} className="sc-route-content">{children}</div></div></div>:<>{crumbs&&<div className="sc-public-navigation">{crumbs}</div>}<div ref={content} className="sc-route-content">{children}</div></>}
 </main>
 <footer className="footer">Sesto Continente · Gestionale associativo</footer>
 </>;
}
