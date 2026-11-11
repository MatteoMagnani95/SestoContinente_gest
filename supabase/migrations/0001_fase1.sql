-- Sesto Continente | Fase 1 | Supabase PostgreSQL
-- Eseguire una sola volta su progetto Supabase nuovo (SQL Editor).
-- NON inserire dati reali prima di verifica organizzativa, GDPR e autorizzazioni.

create extension if not exists pgcrypto;

create type public.stato_domanda as enum
  ('bozza','inviata','in_verifica','integrazione_richiesta','approvata','respinta');
create type public.ruolo_app as enum
  ('amministratore','segreteria','istruttore','socio','tutore');
create type public.stato_adesione as enum
  ('da_perfezionare','attiva','sospesa','cessata');

create table public.stagioni (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  dal date not null,
  al date not null,
  attiva boolean not null default false,
  created_at timestamptz not null default now(),
  constraint date_stagione_check check (al >= dal)
);
create unique index una_stagione_attiva on public.stagioni (attiva) where attiva = true;

create table public.ruoli_utente (
  utente_id uuid not null references auth.users(id) on delete cascade,
  ruolo public.ruolo_app not null,
  assegnato_il timestamptz not null default now(),
  primary key (utente_id, ruolo)
);

create table public.richieste (
  id uuid primary key default gen_random_uuid(),
  utente_id uuid not null unique references auth.users(id) on delete cascade,
  stato public.stato_domanda not null default 'bozza',
  nome text not null,
  cognome text not null,
  data_nascita date not null,
  luogo_nascita text not null,
  codice_fiscale text,
  indirizzo text not null,
  cap text not null,
  comune text not null,
  telefono text not null,
  nome_tutore text,
  cognome_tutore text,
  parentela_tutore text,
  presa_visione boolean not null default false,
  informativa_versione text not null default 'DA_CONFIGURARE',
  nota_pubblica text,
  creato_il timestamptz not null default now(),
  modificato_il timestamptz not null default now(),
  inviata_il timestamptz,
  esaminata_il timestamptz,
  esaminatore_id uuid references auth.users(id),
  persona_id uuid,
  constraint nome_non_vuoto check (length(btrim(nome)) > 0 and length(btrim(cognome)) > 0),
  constraint data_nascita_valida check (data_nascita <= current_date)
);
create index richieste_stato_idx on public.richieste(stato, inviata_il desc);

create table public.persone (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cognome text not null,
  data_nascita date,
  luogo_nascita text,
  codice_fiscale text,
  indirizzo text,
  cap text,
  comune text,
  email text,
  telefono text,
  creato_il timestamptz not null default now()
);
create unique index persone_cf_univoco on public.persone (upper(codice_fiscale))
  where codice_fiscale is not null;
create index persone_nome_idx on public.persone(cognome, nome);
alter table public.richieste add constraint richieste_persona_fk
  foreign key (persona_id) references public.persone(id);

create table public.collegamenti_persone (
  utente_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid not null references public.persone(id) on delete cascade,
  relazione text not null check (relazione in ('titolare','tutore')),
  primary key (utente_id, persona_id)
);
create index collegamenti_persona_idx on public.collegamenti_persone(persona_id);

create table public.relazioni_tutori (
  minore_id uuid not null references public.persone(id) on delete cascade,
  tutore_id uuid not null references public.persone(id) on delete cascade,
  parentela text not null,
  primary key (minore_id, tutore_id),
  constraint no_autotutela check (minore_id <> tutore_id)
);

create table public.adesioni (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references public.persone(id) on delete restrict,
  stagione_id uuid not null references public.stagioni(id) on delete restrict,
  stato public.stato_adesione not null default 'da_perfezionare',
  data_approvazione timestamptz not null default now(),
  note text,
  unique (persona_id, stagione_id)
);

create table public.eventi_pratica (
  id bigint generated always as identity primary key,
  richiesta_id uuid not null references public.richieste(id) on delete cascade,
  attore_id uuid not null references auth.users(id),
  evento text not null,
  nota_interna text,
  creato_il timestamptz not null default now()
);
create index eventi_pratica_idx on public.eventi_pratica (richiesta_id, creato_il desc);

-- Il richiedente può leggere la propria pratica, mai quelle degli altri.
-- I log contengono note interne: sono accessibili soltanto alla segreteria.
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.ruoli_utente
    where utente_id = (select auth.uid())
      and ruolo in ('amministratore'::public.ruolo_app,'segreteria'::public.ruolo_app)
  );
$$;

alter table public.stagioni enable row level security;
alter table public.ruoli_utente enable row level security;
alter table public.richieste enable row level security;
alter table public.persone enable row level security;
alter table public.collegamenti_persone enable row level security;
alter table public.relazioni_tutori enable row level security;
alter table public.adesioni enable row level security;
alter table public.eventi_pratica enable row level security;

create policy stagioni_leggibili on public.stagioni for select to authenticated using (true);
create policy ruoli_leggibili on public.ruoli_utente for select to authenticated
  using (utente_id = (select auth.uid()) or (select public.is_staff()));
create policy richieste_leggibili on public.richieste for select to authenticated
  using (utente_id = (select auth.uid()) or (select public.is_staff()));
create policy persone_leggibili on public.persone for select to authenticated
  using ((select public.is_staff()) or exists (
    select 1 from public.collegamenti_persone c
    where c.persona_id = persone.id and c.utente_id = (select auth.uid())
  ));
create policy collegamenti_leggibili on public.collegamenti_persone for select to authenticated
  using (utente_id = (select auth.uid()) or (select public.is_staff()));
create policy tutori_leggibili on public.relazioni_tutori for select to authenticated
  using ((select public.is_staff()) or exists (
    select 1 from public.collegamenti_persone c
    where c.persona_id = relazioni_tutori.minore_id and c.utente_id = (select auth.uid())
  ));
create policy adesioni_leggibili on public.adesioni for select to authenticated
  using ((select public.is_staff()) or exists (
    select 1 from public.collegamenti_persone c
    where c.persona_id = adesioni.persona_id and c.utente_id = (select auth.uid())
  ));
create policy eventi_staff on public.eventi_pratica for select to authenticated
  using ((select public.is_staff()));

-- Non sono definite policy INSERT/UPDATE/DELETE: con RLS i client non possono
-- alterare stati, assegnare ruoli, creare soci o cancellare lo storico.
-- Le transizioni avvengono ESCLUSIVAMENTE mediante le funzioni qui sotto.

create or replace function public.salva_domanda(
  p_nome text, p_cognome text, p_data_nascita date, p_luogo_nascita text,
  p_codice_fiscale text, p_indirizzo text, p_cap text, p_comune text,
  p_telefono text, p_nome_tutore text, p_cognome_tutore text,
  p_parentela_tutore text, p_presa_visione boolean, p_invia boolean
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_email_verificata boolean;
  v_id uuid;
  v_stato public.stato_domanda;
  v_minore boolean;
  v_cf text := nullif(upper(regexp_replace(coalesce(p_codice_fiscale,''), '[[:space:]]', '', 'g')), '');
begin
  if v_user is null then raise exception 'Accesso richiesto'; end if;
  select (email_confirmed_at is not null) into v_email_verificata from auth.users where id=v_user;
  if not coalesce(v_email_verificata,false) then raise exception 'Email non verificata'; end if;
  if p_data_nascita is null or p_data_nascita > current_date or p_data_nascita < date '1900-01-01' or
     length(btrim(coalesce(p_nome,''))) < 2 or length(btrim(coalesce(p_cognome,''))) < 2 or
     length(btrim(coalesce(p_luogo_nascita,''))) < 2 or length(btrim(coalesce(p_indirizzo,''))) < 3 or
     length(btrim(coalesce(p_comune,''))) < 2 or length(btrim(coalesce(p_cap,''))) < 4 or
     length(btrim(coalesce(p_telefono,''))) < 5 then
    raise exception 'Compilare tutti i dati obbligatori';
  end if;
  if v_cf is not null and v_cf !~ '^[A-Z0-9]{11,16}$' then
    raise exception 'Formato codice fiscale non valido';
  end if;
  v_minore := p_data_nascita > (current_date - interval '18 years')::date;
  if v_minore and (
    length(btrim(coalesce(p_nome_tutore,''))) < 2 or
    length(btrim(coalesce(p_cognome_tutore,''))) < 2 or
    length(btrim(coalesce(p_parentela_tutore,''))) < 3
  ) then raise exception 'Dati del genitore/tutore obbligatori'; end if;
  if p_invia and p_presa_visione is not true then
    raise exception 'Confermare la presa visione delle informative';
  end if;

  -- Una pratica per account nella fase iniziale; la riga viene bloccata per
  -- impedire aggiornamenti contemporanei e transizioni non autorizzate.
  select id, stato into v_id, v_stato from public.richieste where utente_id = v_user for update;
  if v_id is not null and v_stato not in ('bozza','integrazione_richiesta') then
    raise exception 'Domanda non modificabile nello stato attuale';
  end if;
  if v_id is null then
    insert into public.richieste
      (utente_id, nome, cognome, data_nascita, luogo_nascita, codice_fiscale,
       indirizzo, cap, comune, telefono, nome_tutore, cognome_tutore, parentela_tutore,
       presa_visione, stato, inviata_il)
    values
      (v_user, btrim(p_nome), btrim(p_cognome), p_data_nascita, btrim(p_luogo_nascita), v_cf,
       btrim(p_indirizzo), btrim(p_cap), btrim(p_comune), btrim(p_telefono),
       case when v_minore then btrim(p_nome_tutore) end,
       case when v_minore then btrim(p_cognome_tutore) end,
       case when v_minore then btrim(p_parentela_tutore) end,
       p_presa_visione,
       case when p_invia then 'inviata'::public.stato_domanda else 'bozza'::public.stato_domanda end,
       case when p_invia then now() end)
    returning id into v_id;
  else
    update public.richieste set
      nome=btrim(p_nome), cognome=btrim(p_cognome), data_nascita=p_data_nascita,
      luogo_nascita=btrim(p_luogo_nascita), codice_fiscale=v_cf,
      indirizzo=btrim(p_indirizzo), cap=btrim(p_cap), comune=btrim(p_comune),
      telefono=btrim(p_telefono),
      nome_tutore=case when v_minore then btrim(p_nome_tutore) end,
      cognome_tutore=case when v_minore then btrim(p_cognome_tutore) end,
      parentela_tutore=case when v_minore then btrim(p_parentela_tutore) end,
      presa_visione=p_presa_visione,
      stato=case when p_invia then 'inviata'::public.stato_domanda else v_stato end,
      inviata_il=case when p_invia then now() else inviata_il end,
      nota_pubblica=case when p_invia then null else nota_pubblica end,
      modificato_il=now()
    where id=v_id;
  end if;
  insert into public.eventi_pratica(richiesta_id, attore_id, evento)
    values(v_id, v_user, case when p_invia then 'domanda_inviata' else 'bozza_salvata' end);
  return v_id;
end;
$$;

create or replace function public.prendi_in_carico(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'Accesso negato'; end if;
  update public.richieste
    set stato='in_verifica', esaminatore_id=auth.uid(), modificato_il=now()
    where id=p_id and stato='inviata';
  if not found then raise exception 'Domanda già lavorata o non disponibile'; end if;
  insert into public.eventi_pratica(richiesta_id,attore_id,evento)
    values(p_id, auth.uid(), 'presa_in_carico');
end;
$$;

create or replace function public.valuta_domanda(
  p_id uuid, p_esito text, p_messaggio text default null, p_nota_interna text default null,
  p_verifiche_confermate boolean default false
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_r public.richieste%rowtype;
  v_persona_id uuid;
  v_tutore_id uuid;
  v_stagione uuid;
  v_email text;
  v_minore boolean;
begin
  if not public.is_staff() then raise exception 'Accesso negato'; end if;
  select * into v_r from public.richieste where id=p_id for update;
  if not found or v_r.stato <> 'in_verifica' then
    raise exception 'Domanda non in verifica';
  end if;
  if p_esito not in ('approvata','integrazione','respinta') then
    raise exception 'Esito non riconosciuto';
  end if;
  if p_esito = 'integrazione' and length(btrim(coalesce(p_messaggio,''))) < 10 then
    raise exception 'Indicare i dati da integrare (almeno 10 caratteri)';
  end if;
  if p_esito = 'respinta' and length(btrim(coalesce(p_nota_interna,''))) < 10 then
    raise exception 'Motivazione interna obbligatoria (almeno 10 caratteri)';
  end if;
  if p_esito = 'approvata' then
    if p_verifiche_confermate is not true then raise exception 'Confermare le verifiche preliminari'; end if;
    if not v_r.presa_visione then raise exception 'Presa visione mancante'; end if;
    select id into v_stagione from public.stagioni where attiva=true;
    if v_stagione is null then raise exception 'Configurare una stagione attiva'; end if;
    -- Non collegare mai automaticamente una pratica a un omonimo o CF esistente:
    -- la segreteria deve risolvere esplicitamente ogni duplicazione.
    if (v_r.codice_fiscale is not null and exists (
      select 1 from public.persone where upper(codice_fiscale)=upper(v_r.codice_fiscale)
    )) or exists (
      select 1 from public.persone where lower(nome)=lower(v_r.nome)
        and lower(cognome)=lower(v_r.cognome) and data_nascita=v_r.data_nascita
    ) then raise exception 'Anagrafica potenzialmente duplicata: approvazione bloccata'; end if;

    select email into v_email from auth.users where id=v_r.utente_id;
    v_minore := v_r.data_nascita > (current_date - interval '18 years')::date;
    insert into public.persone(nome,cognome,data_nascita,luogo_nascita,codice_fiscale,
      indirizzo,cap,comune,email,telefono)
    values(v_r.nome,v_r.cognome,v_r.data_nascita,v_r.luogo_nascita,v_r.codice_fiscale,
      v_r.indirizzo,v_r.cap,v_r.comune,case when not v_minore then v_email end,v_r.telefono)
    returning id into v_persona_id;

    if v_minore then
      insert into public.persone(nome,cognome,email,telefono)
      values(v_r.nome_tutore,v_r.cognome_tutore,v_email,v_r.telefono)
      returning id into v_tutore_id;
      insert into public.collegamenti_persone(utente_id,persona_id,relazione)
        values(v_r.utente_id,v_tutore_id,'titolare'), (v_r.utente_id,v_persona_id,'tutore');
      insert into public.relazioni_tutori(minore_id,tutore_id,parentela)
        values(v_persona_id,v_tutore_id,v_r.parentela_tutore);
      insert into public.ruoli_utente(utente_id,ruolo) values(v_r.utente_id,'tutore') on conflict do nothing;
    else
      insert into public.collegamenti_persone(utente_id,persona_id,relazione)
        values(v_r.utente_id,v_persona_id,'titolare');
      insert into public.ruoli_utente(utente_id,ruolo) values(v_r.utente_id,'socio') on conflict do nothing;
    end if;
    insert into public.adesioni(persona_id,stagione_id,stato)
      values(v_persona_id,v_stagione,'da_perfezionare');
  end if;

  update public.richieste set
    stato=case p_esito when 'integrazione' then 'integrazione_richiesta'::public.stato_domanda
      when 'respinta' then 'respinta'::public.stato_domanda
      else 'approvata'::public.stato_domanda end,
    nota_pubblica=case when p_esito='integrazione' then btrim(p_messaggio)
      when p_esito='respinta' then 'La domanda non è stata accolta. Contatta la segreteria per informazioni.'
      else 'La domanda è stata approvata. La posizione associativa è da perfezionare.' end,
    persona_id=case when p_esito='approvata' then v_persona_id else persona_id end,
    esaminatore_id=auth.uid(), esaminata_il=now(), modificato_il=now()
  where id=p_id;
  insert into public.eventi_pratica(richiesta_id,attore_id,evento,nota_interna)
    values(p_id,auth.uid(),p_esito,nullif(btrim(p_nota_interna),''));
end;
$$;

-- Restrizioni sulle funzioni SECURITY DEFINER.
revoke all on function public.is_staff() from public, anon;
revoke all on function public.salva_domanda(text,text,date,text,text,text,text,text,text,text,text,text,boolean,boolean) from public, anon;
revoke all on function public.prendi_in_carico(uuid) from public, anon;
revoke all on function public.valuta_domanda(uuid,text,text,text,boolean) from public, anon;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.salva_domanda(text,text,date,text,text,text,text,text,text,text,text,text,boolean,boolean) to authenticated;
grant execute on function public.prendi_in_carico(uuid) to authenticated;
grant execute on function public.valuta_domanda(uuid,text,text,text,boolean) to authenticated;

-- Stagione demo, solo per test. Modificarla prima del rilascio effettivo.
insert into public.stagioni(nome,dal,al,attiva)
values ('2026/2027 (TEST)',date '2026-09-01',date '2027-08-31',true);

-- BOOTSTRAP AMMINISTRATORE (eseguire manualmente DOPO la registrazione e la verifica email):
-- insert into public.ruoli_utente(utente_id,ruolo)
-- select id,'amministratore'::public.ruolo_app from auth.users
-- where email = 'INSERIRE_EMAIL_AMMINISTRATORE' and email_confirmed_at is not null;
-- NON eseguire questo INSERT dalla parte pubblica del sito e NON usare service_role nel browser.
