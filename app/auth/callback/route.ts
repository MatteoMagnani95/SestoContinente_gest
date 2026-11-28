import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = request.nextUrl.searchParams.get('next');
  const fallback='/richiesta/nuova';
  let safeNext=fallback;
  if(next&&next.startsWith('/')&&!next.startsWith('//')&&!/[\\\\\x00-\x1f]/.test(next)){
    const parsed=new URL(next,request.nextUrl.origin);
    if(parsed.origin===request.nextUrl.origin)safeNext=parsed.pathname+parsed.search;
  }
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, request.url));
  }
  return NextResponse.redirect(new URL('/accedi?msg=verifica', request.url));
}
