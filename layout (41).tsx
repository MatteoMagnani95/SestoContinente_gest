import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import GlobalCancelButtons from '@/components/GlobalCancelButtons';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'Sesto Continente | Gestionale', template: '%s | Sesto Continente' },
  description: 'Area riservata del gestionale associativo Sesto Continente.',
  robots: { index: false, follow: false },
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="it"><body><SiteHeader/><GlobalCancelButtons/><main>{children}</main><footer className="footer">Sesto Continente · Gestionale indipendente · Gestionale associativo</footer></body></html>;
}
