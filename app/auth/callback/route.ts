import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = request.nextUrl.searchParams.get('next');
  // Un percorso apparentemente relativo può essere interpretato come URL esterno
  // (ad esempio /\\host). Il callback non deve mai uscire dal dominio corrente.
  let destination = new URL('/richiesta/nuova', request.url);
  if (next?.startsWith('/') && !next.startsWith('//') && !next.includes('\\') && !/[\u0000-\u001f\u007f]/.test(next)) {
    try {
      const candidate = new URL(next, request.url);
      if (candidate.origin === request.nextUrl.origin) destination = candidate;
    } catch {
      // Mantieni la destinazione interna predefinita.
    }
  }
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(destination);
  }
  return NextResponse.redirect(new URL(destination.pathname==='/nuova-password'?'/accedi?msg=recupero_scaduto':'/accedi?msg=verifica', request.url));
}
