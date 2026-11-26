import type { Metadata } from 'next';
import AppShell from '@/components/AppShell';
import {getNavigationAccess} from '@/lib/navigation-access';
import './globals.css';
import './design-tokens.css';
import './design-system.css';
import './navigation.css';
export const metadata: Metadata = {
  title: { default: 'Sesto Continente | Gestionale', template: '%s | Sesto Continente' },
  description: 'Area riservata del gestionale associativo Sesto Continente.',
  robots: { index: false, follow: false },
};
export default async function RootLayout({children}:{children:React.ReactNode}) {
  const access=await getNavigationAccess();
  return <html lang="it"><body><AppShell access={access}>{children}</AppShell></body></html>;
}
