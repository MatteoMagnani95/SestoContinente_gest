import Link from 'next/link';
export default function StaffNav(){return <nav className="staff-nav" aria-label="Menu segreteria">
  <Link href="/gestionale">Panoramica</Link>
  <Link href="/gestionale/richieste">Domande di adesione</Link>
  <Link href="/gestionale/soci">Anagrafica soci</Link>
</nav>}
