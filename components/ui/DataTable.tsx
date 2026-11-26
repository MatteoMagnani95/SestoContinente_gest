import Link from 'next/link';
import type {ReactNode} from 'react';
import {Button,ButtonLink} from './Primitives';

export function DataTable({label,children}:{label:string;children:ReactNode}){
 return <div className="sc-data-table table-panel" role="region" aria-label={label} tabIndex={0}><table>{children}</table></div>;
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
 return <nav className="sc-pagination" aria-label="Paginazione"><span>{count===null?'Totale non disponibile':count+' '+label} · Pagina {page}{total!==null?' di '+Math.max(1,Math.ceil(total/size)):''}</span><div className="sc-row-actions">
 {page>1&&<Link className="sc-button sc-button-secondary" href={href(page-1)}>Precedente</Link>}
 {total!==null&&page*size<total&&<Link className="sc-button sc-button-secondary" href={href(page+1)}>Successiva</Link>}
 </div></nav>;
}
