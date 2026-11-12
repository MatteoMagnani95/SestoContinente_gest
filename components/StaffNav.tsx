import Link from 'next/link';
import {staffSections,modules,type Module} from '@/lib/modules';
export default function StaffNav({isAdmin=false}:{isAdmin?:boolean}){return <nav className="staff-nav" aria-label="Menu gestionale">
 <Link href="/gestionale">Panoramica</Link>
 <Link href="/gestionale/richieste">Domande di adesione</Link>
 <Link href="/gestionale/soci">Schede soci</Link><Link href="/gestionale/calendario-visivo">Calendario visivo</Link>
 {staffSections.map(section=><div className="staff-nav-section" key={section.title}><strong>{section.title}</strong>
 {section.items.filter(item=>isAdmin||!(modules[item] as Module).adminOnly).map(item=><Link key={item} href={`/gestionale/moduli/${item}`}>{modules[item].label}</Link>)}
 </div>)}
 <div className="staff-nav-section"><strong>Documenti e sistema</strong>
 <Link href="/documenti">Archivio documenti</Link>
 {isAdmin&&<Link href="/gestionale/utenti">Permessi utenti</Link>}
 <Link href="/gestionale/report">Report e scadenze</Link>
 </div>
 </nav>}
