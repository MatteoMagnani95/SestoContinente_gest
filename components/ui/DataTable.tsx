import Link from 'next/link';
import {Children,Fragment,cloneElement,isValidElement,type ReactElement,type ReactNode} from 'react';
import {Button,ButtonLink} from './Primitives';

// Some WebKit versions remove implicit table semantics when CSS switches
// rows and cells to block layout. Only annotate native table elements.
const tableRoles:Record<string,string>={thead:'rowgroup',tbody:'rowgroup',tfoot:'rowgroup',tr:'row',th:'columnheader',td:'cell'};
function preserveTableRoles(nodes:ReactNode):ReactNode{
 return Children.map(nodes,node=>{
  if(!isValidElement(node))return node;
  const element=node as ReactElement<{children?:ReactNode;role?:string;scope?:string}>;
  if(element.type===Fragment)return cloneElement(element,{},preserveTableRoles(element.props.children));
  if(typeof element.type!=='string'||!Object.hasOwn(tableRoles,element.type))return node;
  const role=element.props.role??(element.type==='th'&&['row','rowgroup'].includes(element.props.scope??'')?'rowheader':tableRoles[element.type]);
  return cloneElement(element,{role},['thead','tbody','tfoot','tr'].includes(element.type)?preserveTableRoles(element.props.children):element.props.children);
 });
}

export function DataTable({label,children,mobileCards=false}:{label:string;children:ReactNode;mobileCards?:boolean}){
 return <div className={'sc-data-table table-panel'+(mobileCards?' sc-mobile-cards':'')} role="region" aria-label={label} tabIndex={0}><table role="table" aria-label={label}>{mobileCards?preserveTableRoles(children):children}</table></div>;
}
export function FilterBar({children}:{children:ReactNode}){return <div className="sc-filter-bar">{children}</div>;}
export function SearchBar({query='',placeholder='Cerca',action,children,resetHref,hideSearch=false}:{query?:string;placeholder?:string;action?:string;children?:ReactNode;resetHref?:string;hideSearch?:boolean}){
 return <form method="get" action={action} className="sc-search-bar" data-dirty-ignore>
  {!hideSearch&&<label className="sc-search-field"><span>{placeholder}</span><input type="search" name="q" defaultValue={query} placeholder={placeholder} maxLength={80}/></label>}
  {children}<Button type="submit" icon="search">{hideSearch?'Applica':'Cerca'}</Button>{resetHref&&<ButtonLink href={resetHref} variant="secondary">Azzera filtri</ButtonLink>}
 </form>;
}
export function Pagination({page,size,count,href,additionalCount=0,label='risultati'}:{page:number;size:number;count:number|null;href:(page:number)=>string;additionalCount?:number;label?:string}){
 const total=count===null?null:Math.max(count,additionalCount);
 const last=total===null?null:Math.max(1,Math.ceil(total/size));
 // An obsolete bookmark or an empty range must never trap the user
 // behind thousands of consecutive "Previous" clicks.
 if(page>1&&(last===null||page>last))return <nav className="sc-pagination" aria-label="Paginazione"><span role="status">{last===null?'Pagina o totale non disponibile.':'La pagina richiesta non è più disponibile.'}</span><div className="sc-row-actions"><Link className="sc-button sc-button-secondary" href={href(1)}>Prima pagina</Link>{last!==null&&last>1&&<Link className="sc-button sc-button-secondary" href={href(last)}>Ultima pagina disponibile</Link>}</div></nav>;

 return <nav className="sc-pagination" aria-label="Paginazione"><span>{count===null?'Totale non disponibile':count+' '+label} · Pagina {page}{total!==null?' di '+Math.max(1,Math.ceil(total/size)):''}</span><div className="sc-row-actions">
 {page>1&&<Link className="sc-button sc-button-secondary" href={href(page-1)}>Precedente</Link>}
 {total!==null&&page*size<total&&<Link className="sc-button sc-button-secondary" href={href(page+1)}>Successiva</Link>}
 </div></nav>;
}
