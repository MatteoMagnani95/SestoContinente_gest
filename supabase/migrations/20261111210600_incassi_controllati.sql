-- SESTO CONTINENTE — FASE 3.4: incassi guidati (migrazione incrementale)
-- Eseguire DOPO 0005, prima su un progetto Supabase di TEST.
-- Non cancella o modifica pagamenti preesistenti. Nessuna scrittura su movimenti storici.

alter table public.pagamenti
  add column if not exists idempotency_key uuid,
  add column if not exists registrato_da uuid references auth.users(id);
create unique index if not exists pagamenti_idempotency_key_unica
  on public.pagamenti(idempotency_key) where idempotency_key is not null;
create index if not exists pagamenti_quota_importo_idx on public.pagamenti(quota_id) where quota_id is not null;
create index if not exists pagamenti_addebito_importo_idx on public.pagamenti(addebito_corso_id) where addebito_corso_id is not null;

-- Conserva gli stessi campi della vista esistente e aggiunge soltanto scadenza.
create or replace view public.saldi_quote with (security_invoker=true) as
 select q.id,q.persona_id,q.stagione_id,q.importo_dovuto,
        coalesce(sum(p.importo),0)::numeric(12,2) as versato,
        greatest(q.importo_dovuto-coalesce(sum(p.importo),0),0)::numeric(12,2) as residuo,
        case when coalesce(sum(p.importo),0)>=q.importo_dovuto then 'pagata'
             when coalesce(sum(p.importo),0)>0 then 'parziale' else 'non_pagata' end as stato,
        q.scadenza
 from public.quote_associative q left join public.pagamenti p on p.quota_id=q.id
 group by q.id;

create or replace view public.saldi_corsi with (security_invoker=true) as
 select a.id, i.persona_id, e.stagione_id, i.edizione_id,
        a.importo_dovuto,
        coalesce(sum(p.importo),0)::numeric(12,2) as versato,
        greatest(a.importo_dovuto-coalesce(sum(p.importo),0),0)::numeric(12,2) as residuo,
        case when coalesce(sum(p.importo),0)>=a.importo_dovuto then 'pagata'
             when coalesce(sum(p.importo),0)>0 then 'parziale' else 'non_pagata' end as stato,
        a.scadenza
 from public.addebiti_corsi a
 join public.iscrizioni_corsi i on i.id=a.iscrizione_id
 join public.edizioni_corsi e on e.id=i.edizione_id
 left join public.pagamenti p on p.addebito_corso_id=a.id
 group by a.id,i.persona_id,e.stagione_id,i.edizione_id;
revoke all on public.saldi_corsi from public,anon;
grant select on public.saldi_corsi to authenticated;

-- Il controllo resta nel trigger: vale anche per eventuali inserimenti tecnici con service_role.
-- Il blocco FOR UPDATE sull'addebito serializza i pagamenti concorrenti dello stesso debito.
create or replace function public.verifica_destinatario_pagamento()
returns trigger language plpgsql set search_path = '' as $$
declare v_persona uuid; v_dovuto numeric(12,2); v_versato numeric(12,2);
begin
 if num_nonnulls(new.quota_id,new.addebito_corso_id)<>1 then
   raise exception 'Selezionare una sola causale di pagamento' using errcode='P3403';
 end if;
 if new.quota_id is not null then
   select q.persona_id,q.importo_dovuto into v_persona,v_dovuto
   from public.quote_associative q where q.id=new.quota_id for update;
 else
   select i.persona_id,a.importo_dovuto into v_persona,v_dovuto
   from public.addebiti_corsi a join public.iscrizioni_corsi i on i.id=a.iscrizione_id
   where a.id=new.addebito_corso_id for update of a;
 end if;
 if not found or v_persona is distinct from new.persona_id then
   raise exception 'Debito non associato alla persona selezionata' using errcode='P3403';
 end if;
 if new.importo is null or new.importo<=0 or new.importo<>round(new.importo,2) then
   raise exception 'Importo non valido' using errcode='P3403';
 end if;
 if new.quota_id is not null then
   select coalesce(sum(p.importo),0) into v_versato
   from public.pagamenti p where p.quota_id=new.quota_id;
 else
   select coalesce(sum(p.importo),0) into v_versato
   from public.pagamenti p where p.addebito_corso_id=new.addebito_corso_id;
 end if;
 if new.importo > v_dovuto-v_versato then
   raise exception 'Il pagamento supera il residuo dovuto' using errcode='P3401';
 end if;
 return new;
end; $$;

-- Un debito già parzialmente/saldato non può essere ridotto sotto quanto incassato.
create or replace function public.verifica_riduzione_addebito()
returns trigger language plpgsql set search_path = '' as $$
declare v_versato numeric(12,2);
begin
 if new.importo_dovuto<old.importo_dovuto then
   if tg_table_name='quote_associative' then
     select coalesce(sum(importo),0) into v_versato from public.pagamenti where quota_id=old.id;
   else
     select coalesce(sum(importo),0) into v_versato from public.pagamenti where addebito_corso_id=old.id;
   end if;
   if new.importo_dovuto<v_versato then
     raise exception 'Importo dovuto inferiore ai versamenti già contabilizzati' using errcode='P3401';
   end if;
 end if;
 return new;
end; $$;
drop trigger if exists quote_non_inferiore_versato on public.quote_associative;
create trigger quote_non_inferiore_versato before update of importo_dovuto
 on public.quote_associative for each row execute function public.verifica_riduzione_addebito();
drop trigger if exists corso_non_inferiore_versato on public.addebiti_corsi;
create trigger corso_non_inferiore_versato before update of importo_dovuto
 on public.addebiti_corsi for each row execute function public.verifica_riduzione_addebito();

-- Dopo la migrazione la registrazione è possibile soltanto tramite questa RPC.
-- Le INSERT dirette dagli account autenticati non sono più ammesse dalla RLS.
drop policy if exists pagamenti_ins on public.pagamenti;
create or replace function public.registra_pagamento_guidato(
 p_persona uuid,p_quota uuid,p_addebito uuid,p_importo numeric,
 p_data date,p_metodo text,p_riferimento text,p_note text,p_richiesta_id uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_persona uuid; v_utente uuid; v_riga public.pagamenti%rowtype;
begin
 v_utente:=auth.uid();
 if v_utente is null or not (select public.is_staff()) then
   raise exception 'Non autorizzato' using errcode='42501';
 end if;
 if p_richiesta_id is null or num_nonnulls(p_quota,p_addebito)<>1 or
    p_persona is null or p_data is null or
    p_importo is null or p_importo<=0 or p_importo<>round(p_importo,2) or
    (p_metodo is null or p_metodo not in ('contanti','bonifico','pos','altro')) or
    length(coalesce(p_riferimento,''))>150 or length(coalesce(p_note,''))>1000 then
   raise exception 'Dati del pagamento non validi' using errcode='P3403';
 end if;
 -- Serializza richieste sul medesimo debito; il trigger applica inoltre il limite residuo.
 if p_quota is not null then
   select persona_id into v_persona from public.quote_associative where id=p_quota for update;
 else
   select i.persona_id into v_persona
   from public.addebiti_corsi a join public.iscrizioni_corsi i on i.id=a.iscrizione_id
   where a.id=p_addebito for update of a;
 end if;
 if not found or v_persona is distinct from p_persona then
   raise exception 'Debito non associato alla persona' using errcode='P3403';
 end if;
 select * into v_riga from public.pagamenti where idempotency_key=p_richiesta_id;
 if found then
   if v_riga.registrato_da is distinct from v_utente or
      v_riga.persona_id is distinct from p_persona or
      v_riga.quota_id is distinct from p_quota or
      v_riga.addebito_corso_id is distinct from p_addebito or
      v_riga.importo is distinct from p_importo or
      v_riga.data_pagamento is distinct from p_data or
      v_riga.metodo is distinct from p_metodo or
      coalesce(v_riga.riferimento,'')<>coalesce(p_riferimento,'') or
      coalesce(v_riga.note,'')<>coalesce(p_note,'') then
     raise exception 'Chiave di invio già utilizzata per dati differenti' using errcode='P3402';
   end if;
   return v_riga.id;
 end if;
 insert into public.pagamenti(persona_id,quota_id,addebito_corso_id,importo,
   data_pagamento,metodo,riferimento,note,idempotency_key,registrato_da)
 values(p_persona,p_quota,p_addebito,p_importo,p_data,p_metodo,
        nullif(p_riferimento,''),nullif(p_note,''),p_richiesta_id,v_utente)
 returning id into v_id;
 -- Il trigger pagamento_contabile crea nella stessa transazione il movimento economico.
 return v_id;
end; $$;
revoke all on function public.registra_pagamento_guidato(uuid,uuid,uuid,numeric,date,text,text,text,uuid) from public,anon;
grant execute on function public.registra_pagamento_guidato(uuid,uuid,uuid,numeric,date,text,text,text,uuid) to authenticated;

-- Nessuna policy UPDATE/DELETE di pagamenti: registrazioni immutabili.
-- Gli storni/rettifiche contabili richiedono un successivo flusso controllato.
