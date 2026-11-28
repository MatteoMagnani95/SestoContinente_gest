import Link from '@/components/ui/PrivateLink';
import {secretariatLinks,displayName,personInitials} from '@/lib/secretariat';
import {Icon} from './Icon';
export function SecretariatNav({active}:{active:string}){
 return <nav className="sc-secretariat-context" aria-label="Sezioni della segreteria">{secretariatLinks.map(item=><Link key={item.href} href={item.href} aria-current={active===item.href?'page':undefined}><Icon name={item.icon}/><span>{item.label}</span></Link>)}</nav>;
}
export function PersonAvatar({nome,cognome,large=false}:{nome:string;cognome:string;large?:boolean}){
 return <span className={'sc-person-avatar'+(large?' sc-person-avatar-large':'')} aria-hidden="true">{personInitials(nome,cognome)||<Icon name="user"/>}</span>;
}
export function PersonName({nome,cognome,href}:{nome:string;cognome:string;href:string}){
 return <Link className="sc-person-link" href={href}><PersonAvatar nome={nome} cognome={cognome}/><strong>{displayName(cognome)} {displayName(nome)}</strong></Link>;
}
