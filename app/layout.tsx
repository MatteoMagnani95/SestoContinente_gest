import type { Metadata, Viewport } from 'next';
import AppShell from '@/components/AppShell';
import {getNavigationAccess} from '@/lib/navigation-access';
import './globals.css';
import './design-tokens.css';
import './design-system.css';
import './navigation.css';
import './data-ui.css';
import './public-ui.css';
import './secretariat.css';
import './calendar-ui.css';
import './association-ui.css';
import './finance-ui.css';
import './personal-ui.css';
import './responsive-accessibility.css';
import './brand-ui.css';
import './shell-3.0.css';
import './secretariat-3.0.css';
import './teaching-3.0.css';
import './operations-3.0.css';
import './user-3.0.css';
import './visual-audit-3.0.css';
import './marine-premium-tokens.css';
import './marine-premium-public.css';
import './marine-premium-private.css';
import './marine-premium-operations.css';
import './marine-premium-members.css';
export const viewport: Viewport = {width:'device-width', initialScale:1, viewportFit:'cover'};
export const metadata: Metadata = {
  title: { default: 'Sesto Continente | Gestionale', template: '%s | Sesto Continente' },
  description: 'Area riservata del gestionale associativo Sesto Continente.',
  robots: { index: false, follow: false },
  icons: { icon: [{ url: '/brand/favicon.png', type: 'image/png', sizes: '128x128' }], apple: '/brand/favicon.png' },
};
export default async function RootLayout({children}:{children:React.ReactNode}) {
  const access=await getNavigationAccess();
  return <html lang="it"><body><AppShell access={access}>{children}</AppShell></body></html>;
}
