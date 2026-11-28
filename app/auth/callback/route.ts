import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// A relative Location preserves the browser-facing origin, even behind a proxy.
// Never allow a normalized path beginning with // (scheme-relative URL).
function redirectLocal(location:string){
  return new Response(null,{status:303,headers:{Location:location,'Cache-Control':'private, no-store'}});
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = request.nextUrl.searchParams.get('next');
  // Un percorso apparentemente relativo può essere interpretato come URL esterno
  // (ad esempio /\\host). Il callback non deve mai uscire dal dominio corrente.
  let destination = new URL('/richiesta/nuova', request.url);
  if (next?.startsWith('/') && !next.startsWith('//') && !next.includes('\\') && !/[\u0000-\u001f\u007f]/.test(next)) {
    try {
      const candidate = new URL(next, request.url);
      if (candidate.origin === request.nextUrl.origin && !candidate.pathname.startsWith('//')) destination = candidate;
    } catch {
      // Mantieni la destinazione interna predefinita.
    }
  }
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return redirectLocal(destination.pathname+destination.search+destination.hash);
  }
  return redirectLocal(destination.pathname==='/nuova-password'?'/accedi?msg=recupero_scaduto':'/accedi?msg=verifica');
}
