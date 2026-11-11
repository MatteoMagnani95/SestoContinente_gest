import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'Sesto Continente | Gestionale', template: '%s | Sesto Continente' },
  description: 'Area riservata del gestionale associativo Sesto Continente.',
  robots: { index: false, follow: false },
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="it"><body><SiteHeader/><main>{children}</main><footer className="footer">Sesto Continente · Gestionale indipendente · Progetto tecnico Fase 1</footer></body></html>;
}
