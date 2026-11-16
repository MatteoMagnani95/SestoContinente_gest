-- SOLO LETTURA: da eseguire su Supabase SQL Editor dopo la migrazione 0003.
-- Controlli strutturali, NON sostituisce test RLS con più account.

-- 1. Le tabelle critiche devono avere rowsecurity = true.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'persone','richieste','adesioni','collegamenti_persone','relazioni_tutori',
    'certificati_medici','documenti','pagamenti','quote_associative','iscrizioni_corsi',
    'tesseramenti','registro_operazioni'
  )
order by tablename;

-- 2. La view non deve utilizzare privilegi del proprietario.
select c.relname, c.reloptions
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname='public' and c.relname in ('schede_soci','saldi_quote');
-- Atteso: security_invoker=true per entrambe.

-- 3. Le policy sui dati sensibili esistono (verificarne comunque i predicati).
select tablename,policyname,cmd,roles,qual,with_check
from pg_policies where schemaname='public'
 and tablename in ('persone','adesioni','certificati_medici','documenti','tesseramenti')
order by tablename,policyname;

-- 4. Verifica che i documenti NON siano in un bucket pubblico.
select id,public,file_size_limit from storage.buckets where id='sesto-documenti';
-- Atteso: public=false.

-- 5. Tracciamento delle rettifiche anagrafiche.
select tgname,tgenabled from pg_trigger
where tgrelid='public.persone'::regclass and not tgisinternal;
-- Atteso: audit_persone abilitato.
