'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { ModuleKey } from '@/lib/modules';
import { moduleNavigation } from '@/lib/module-navigation';
import { activeItem, type NavItem } from '@/lib/navigation';
import { Icon, type IconName } from '@/components/ui/Icon';
export type NavGroup={id:string;label:string;icon:IconName;area:string;items:NavItem[]};
const item=(href:string,label:string,aliases?:string[]):NavItem=>({href,label,aliases});
function moduleItems(keys:ModuleKey[],isAdmin:boolean):NavItem[]{
 return keys.filter(key=>isAdmin||!moduleNavigation[key].adminOnly).map(key=>item('/gestionale/moduli/'+key,moduleNavigation[key].label));
}
export function staffGroups(isAdmin:boolean):NavGroup[]{
 return [
 {id:'overview',label:'Panoramica',icon:'home',area:'system',items:[{href:'/gestionale',label:'Panoramica',exact:true}]},
 {id:'members',label:'Soci e segreteria',icon:'users',area:'secretariat',items:[item('/gestionale/richieste','Domande di adesione'),item('/gestionale/soci','Schede soci',['/comunicazioni/soci']),...moduleItems(['anagrafiche','adesioni','tesseramenti','certificati','brevetti'],isAdmin)]},
 {id:'courses',label:'Corsi e didattica',icon:'course',area:'teaching',items:[item('/gestionale/corsi','Gestione corsi',['/comunicazioni/corsi']),item('/gestionale/programmi-didattici','Archivio moduli didattici'),...moduleItems(['corsi','edizioni','iscrizioni','istruttori','qualifiche','programmi','versioni','presenze'],isAdmin)]},
 {id:'calendar',label:'Calendario e piscine',icon:'calendar',area:'calendar',items:[item('/gestionale/calendario-visivo','Calendario visivo'),...moduleItems(['piscine','corsie','calendario','prenotazioni'],isAdmin)]},
 {id:'equipment',label:'Attrezzature',icon:'equipment',area:'equipment',items:moduleItems(['attrezzature','revisioni','consegne'],isAdmin)},
 {id:'finance',label:'Pagamenti e contabilità',icon:'wallet',area:'finance',items:[item('/gestionale/incassi','Incassi e saldi',['/gestionale/moduli/pagamenti']),...moduleItems(['quote','addebiti','listino','contabilita'],isAdmin),...(isAdmin?[item('/gestionale/economia','Rendiconto economico'),item('/gestionale/archivio-incassi','Archivio incassi')]:[])]},
 {id:'board',label:'Organi sociali',icon:'clipboard',area:'system',items:[item('/organi-sociali','Organi sociali')]},
 {id:'events',label:'Eventi e comunicazioni',icon:'calendar',area:'event',items:[item('/gestione-eventi','Eventi soci'),...moduleItems(['comunicazioni'],isAdmin)]},
 {id:'documents',label:'Documenti',icon:'document',area:'documents',items:[item('/documenti','Archivio documenti')]},
 {id:'alerts',label:'Scadenze e notifiche',icon:'clock',area:'system',items:[item('/gestionale/report','Scadenze e attività da gestire')]},
 {id:'settings',label:'Impostazioni e sistema',icon:'settings',area:'system',items:[item('/gestionale/importazione','Importazione dati'),...moduleItems(['stagioni','promemoria'],isAdmin),...(isAdmin?[item('/gestionale/utenti','Gestione utenti'),item('/gestionale/amministrazione-dati','Amministrazione dati')]:[])]},
 ].filter(g=>g.items.length) as NavGroup[];
}
export default function StaffNav({isAdmin=false,onNavigate,idPrefix='desktop',collapsed=false,onExpand}:{isAdmin?:boolean;onNavigate?:()=>void;idPrefix?:string;collapsed?:boolean;onExpand?:()=>void}){
 const pathname=usePathname()??'/';
 const groups=useMemo(()=>staffGroups(isAdmin),[isAdmin]);
 const active=useMemo(()=>activeItem(pathname,groups.flatMap(g=>g.items)),[pathname,groups]);
 const [expanded,setExpanded]=useState<{path:string;group:string}>({path:'',group:''});
 return <nav className="sc-staff-nav" aria-label="Menu gestionale">
 {groups.map(group=>{
  const current=group.items.some(i=>i.href===active),open=!collapsed&&(expanded.path===pathname?expanded.group===group.id:current);
  if(group.id==='overview')return <Link key={group.id} href="/gestionale" aria-current={active==='/gestionale'?'page':undefined} className={'sc-nav-link sc-area-system'+(active==='/gestionale'?' is-active':'')} title="Panoramica" onClick={onNavigate}><Icon name="home"/><span>Panoramica</span></Link>;
  const id=idPrefix+'-nav-'+group.id;
  return <section key={group.id} className={'sc-nav-group sc-area-'+group.area+(current?' is-current':'')}>
   <button type="button" className="sc-nav-group-toggle" aria-expanded={open} aria-controls={id} title={group.label} onClick={()=>{if(collapsed)onExpand?.();setExpanded({path:pathname,group:open?'':group.id});}}><Icon name={group.icon}/><span>{group.label}</span><Icon name={open?'chevron-down':'chevron-right'}/></button>
   <div id={id} hidden={!open} className="sc-nav-items">{group.items.map(i=><Link key={i.href} href={i.href} aria-current={active===i.href?(pathname===i.href?'page':'location'):undefined} className={'sc-nav-link'+(active===i.href?' is-active':'')} onClick={onNavigate}>{active===i.href&&<Icon name={group.icon}/>}<span>{i.label}</span></Link>)}</div>
  </section>;
 })}
 </nav>;
}
