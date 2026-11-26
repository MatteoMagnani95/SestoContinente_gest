'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import SiteHeader,{AreaLinks,LogoutButton} from '@/components/SiteHeader';
import StaffNav,{staffGroups} from '@/components/StaffNav';
import { Icon } from '@/components/ui/Icon';
import { activeItem, areaLabel, backTarget, contextPath, listContext, restoredTarget, staffArea, greeting, mobileDestinations, type NavigationAccess } from '@/lib/navigation';
import GlobalCancelButtons from '@/components/GlobalCancelButtons';
import { NereiaProject } from '@/components/ui/BrandLogo';

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
 const [collapsed,setCollapsed]=useState(false);
 useEffect(()=>{try{setCollapsed(localStorage.getItem('sc-sidebar-collapsed')==='1');}catch{}},[]);
 function collapse(value:boolean){setCollapsed(value);try{localStorage.setItem('sc-sidebar-collapsed',value?'1':'0');}catch{}}
 const [title,setTitle]=useState({path:'',value:''});
 const [contexts,setContexts]=useState<Record<string,string>>({});
 const menu=useRef<HTMLDialogElement>(null),content=useRef<HTMLDivElement>(null),trigger=useRef<HTMLElement|null>(null);
 function closeMenu(restore=true){
  if(menu.current?.open)menu.current.close();setOpen(false);
  if(restore)trigger.current?.focus();
 }
 function navigateFromMenu(){
  closeMenu(false);
  document.getElementById('sc-main')?.focus({preventScroll:true});
 }
 function showMenu(){
  trigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
  if(menu.current&&!menu.current.open){menu.current.showModal();setOpen(true);}
 }
 useEffect(()=>{closeMenu(false);},[path]);
 useEffect(()=>{if(!access.enabled)setContexts({});},[access.enabled]);
 useEffect(()=>{
  const capture=()=>{const p=window.location.pathname;if(access.enabled&&contextPath(p)){const value=listContext(p,window.location.search);setContexts(old=>old[p]===value?old:{...old,[p]:value});}};
  capture();
  const onClick=(e:MouseEvent)=>{if(e.target instanceof Element&&e.target.closest('a[href]'))capture();};
  document.addEventListener('click',onClick,true);window.addEventListener('popstate',capture);
  return()=>{document.removeEventListener('click',onClick,true);window.removeEventListener('popstate',capture);};
 },[path,access.enabled]);
 useEffect(()=>{
  const read=()=>{const raw=content.current?.querySelector('h1')?.textContent?.trim()??'';const value=/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(raw)?'':raw;setTitle(old=>old.path===path&&old.value===value?old:{path,value});};
  read();const observer=new MutationObserver(read);if(content.current)observer.observe(content.current,{childList:true,subtree:true,characterData:true});return()=>observer.disconnect();
 },[path]);
 useEffect(()=>{
  const desktop=window.matchMedia('(min-width: 1001px)');const update=()=>{if(desktop.matches&&menu.current?.open)navigateFromMenu();};
  desktop.addEventListener('change',update);return()=>desktop.removeEventListener('change',update);
 },[]);
 // Safari e altri browser possono ridurre soltanto la visual viewport
 // quando appare la tastiera. Non limitare la viewport durante il pinch zoom.
 useEffect(()=>{
  const viewport=window.visualViewport;if(!viewport)return;
  const root=document.documentElement;
  const clear=()=>{root.style.removeProperty('--sc-visual-height');root.style.removeProperty('--sc-visual-top');root.removeAttribute('data-sc-keyboard');};
  const update=()=>{
   if(!window.matchMedia('(max-width: 1000px)').matches||Math.abs(viewport.scale-1)>.01){clear();return;}
   root.style.setProperty('--sc-visual-height',Math.max(1,Math.floor(viewport.height))+'px');
   root.style.setProperty('--sc-visual-top',Math.max(0,Math.floor(viewport.offsetTop))+'px');
   if(window.innerHeight-viewport.height>120)root.setAttribute('data-sc-keyboard','');else root.removeAttribute('data-sc-keyboard');
  };
  update();viewport.addEventListener('resize',update);viewport.addEventListener('scroll',update);window.addEventListener('resize',update);
  return()=>{viewport.removeEventListener('resize',update);viewport.removeEventListener('scroll',update);window.removeEventListener('resize',update);clear();};
 },[]);
 const back=backTarget(path,access),target=back?restoredTarget(back,contexts):null;
 const mobile=internal?mobileDestinations(path,access):[],mobileActive=activeItem(path,mobile.map(d=>({...d,exact:d.href==='/gestionale'||d.href==='/area-personale'})));
 const crumbs=internal&&<div className="sc-page-navigation"><Breadcrumb path={path} access={access} title={title.path===path?title.value:''} contexts={contexts}/>{target&&<Link className="sc-back-button" href={target.href}><Icon name="arrow-left"/>{target.label}</Link>}</div>;
 return <>
 <a href="#sc-main" className="sc-skip-link">Vai al contenuto</a>
 <SiteHeader access={access} onMenu={showMenu} menuOpen={open}/>
 <dialog ref={menu} id="sc-mobile-menu" className="sc-mobile-menu" aria-labelledby="sc-menu-title" onCancel={e=>{e.preventDefault();closeMenu();}} onClose={()=>setOpen(false)} onClick={e=>{if(e.target===e.currentTarget)closeMenu();}}>
  <div className="sc-mobile-menu-inner">
   <header className="sc-mobile-menu-heading"><div><h2 id="sc-menu-title">Menu</h2>{access.enabled&&<span>{greeting(access)}</span>}</div><button type="button" className="sc-icon-button" onClick={()=>closeMenu()} aria-label="Chiudi menu" autoFocus><Icon name="close"/></button></header>
   {staff&&<StaffNav isAdmin={access.admin} idPrefix="mobile" onNavigate={navigateFromMenu}/>}
   <nav className="sc-mobile-areas" aria-label="Aree e account"><AreaLinks access={access} onNavigate={navigateFromMenu}/>{access.enabled&&<Link href="/" onClick={navigateFromMenu}>Home pubblica</Link>}{access.enabled&&access.personal&&access.unread!==null&&<Link href="/area-personale?tab=notifiche" onClick={navigateFromMenu}>Notifiche ({access.unread})</Link>}{access.signedIn&&<LogoutButton/>}</nav>
  </div>
 </dialog>
 <GlobalCancelButtons/>
 <main id="sc-main" tabIndex={-1} className={(staff?'sc-main sc-main-staff':'sc-main')+(mobile.length?' sc-main-has-mobile-nav':'')}>
 {staff?<div className={'container staff-layout sc-staff-layout'+(collapsed?' sc-sidebar-collapsed':'')}><aside className="staff-sidebar sc-staff-sidebar"><div className="sc-sidebar-heading"><div className="sc-sidebar-label"><strong>{access.admin?'Amministrazione':'Segreteria'}</strong><span>Gestione associativa</span></div><button type="button" className="sc-icon-button sc-sidebar-toggle" aria-label={collapsed?'Espandi menu laterale':'Comprimi menu laterale'} aria-expanded={!collapsed} onClick={()=>collapse(!collapsed)}><Icon name={collapsed?'chevron-right':'arrow-left'}/></button></div><StaffNav isAdmin={access.admin} collapsed={collapsed} onExpand={()=>collapse(false)}/></aside><div className="staff-content sc-staff-content">{crumbs}<div ref={content} className="sc-route-content">{children}</div></div></div>:<>{crumbs&&<div className="sc-public-navigation">{crumbs}</div>}<div ref={content} className="sc-route-content">{children}</div></>}
 </main>
 {mobile.length>0&&<nav className="sc-bottom-navigation" aria-label="Navigazione rapida mobile">{mobile.map(d=><Link key={d.href} href={d.href} aria-current={mobileActive===d.href?'page':undefined}><Icon name={d.icon}/><span>{d.label}</span></Link>)}</nav>}
 <footer className={'footer sc-branded-footer'+(mobile.length?' sc-footer-has-mobile-nav':'')}><span>Sesto Continente · Gestionale associativo</span><NereiaProject compact/></footer>
 </>;
}
