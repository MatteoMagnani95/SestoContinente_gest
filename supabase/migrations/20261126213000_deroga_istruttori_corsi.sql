-- Deroghe didattiche esplicite: non modificare iscrizioni o qualifiche storiche.
-- Applicare soltanto dopo le migrazioni precedenti.
create table public.deroghe_iscrizioni_corsi (
 iscrizione_id uuid primary key references public.iscrizioni_corsi(id) on delete cascade deferrable initially deferred,
 motivo text not null check (char_length(btrim(motivo)) between 5 and 500),
 autorizzata_da uuid not null default auth.uid(),
 autorizzata_il timestamptz not null default now()
);
alter table public.deroghe_iscrizioni_corsi enable row level security;
revoke all on public.deroghe_iscrizioni_corsi from public, anon, authenticated;
grant select on public.deroghe_iscrizioni_corsi to authenticated;
grant insert (iscrizione_id,motivo) on public.deroghe_iscrizioni_corsi to authenticated;
create policy deroghe_corsi_staff_read on public.deroghe_iscrizioni_corsi for select to authenticated using ((select public.is_staff()));
create policy deroghe_corsi_staff_insert on public.deroghe_iscrizioni_corsi for insert to authenticated with check ((select public.is_staff()) and autorizzata_da=(select auth.uid()));

-- Trigger privilegiati soltanto per verificare dati anche quando la RLS li nasconde.
-- Nessuna modifica ai dati preesistenti. Il lock dell'edizione è condiviso con i vincoli esistenti.
create function public.verifica_deroga_allievo() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if new.edizione_id=old.edizione_id and new.persona_id=old.persona_id and new.stato=old.stato then return new; end if;
 end if;
 if new.stato not in ('iscritto','in_attesa','concluso') then return new; end if;
 perform 1 from public.edizioni_corsi where id=new.edizione_id for update;
 if exists(select 1 from public.assegnazioni_istruttori where edizione_id=new.edizione_id and persona_id=new.persona_id) then
  raise exception 'Un istruttore assegnato non può essere allievo della stessa edizione' using errcode='P3520';
 end if;
 -- Consentire la chiusura storica di iscrizioni già attive, senza attribuire una deroga retroattiva.
 if tg_op='UPDATE' then
  if new.stato='concluso' and old.stato='iscritto' and new.edizione_id=old.edizione_id and new.persona_id=old.persona_id then return new; end if;
 end if;
 if exists(select 1 from public.qualifiche_istruttori where persona_id=new.persona_id)
 and not exists(select 1 from public.deroghe_iscrizioni_corsi where iscrizione_id=new.id) then
  raise exception 'Per iscrivere un istruttore è necessaria una deroga autorizzata' using errcode='P3521';
 end if;
 return new;
end $$;
revoke all on function public.verifica_deroga_allievo() from public, anon, authenticated;
create trigger verifica_deroga_allievo_trigger before insert or update of edizione_id,persona_id,stato on public.iscrizioni_corsi for each row execute function public.verifica_deroga_allievo();

create function public.verifica_istruttore_non_allievo() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if new.edizione_id=old.edizione_id and new.persona_id=old.persona_id then return new; end if;
 end if;
 perform 1 from public.edizioni_corsi where id=new.edizione_id for update;
 if exists(select 1 from public.iscrizioni_corsi where edizione_id=new.edizione_id and persona_id=new.persona_id and stato in ('iscritto','in_attesa','concluso')) then
  raise exception 'Un allievo non può essere assegnato come istruttore nella stessa edizione' using errcode='P3520';
 end if;
 return new;
end $$;
revoke all on function public.verifica_istruttore_non_allievo() from public, anon, authenticated;
create trigger verifica_istruttore_non_allievo_trigger before insert or update of edizione_id,persona_id on public.assegnazioni_istruttori for each row execute function public.verifica_istruttore_non_allievo();

-- Un solo salvataggio atomico; i permessi staff e le RLS già esistenti continuano ad applicarsi.
create function public.iscrivi_con_deroga(p_edizione uuid,p_persona uuid,p_motivo text,p_nome text default '',p_telefono text default '',p_note text default null)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid:=gen_random_uuid();
begin
 if not coalesce(public.is_staff(),false) or auth.uid() is null then raise exception 'Non autorizzato' using errcode='42501'; end if;
 if not exists(select 1 from public.qualifiche_istruttori where persona_id=p_persona) then raise exception 'Deroga riservata agli istruttori' using errcode='P3521'; end if;
 if p_motivo is null or char_length(btrim(p_motivo)) not between 5 and 500 then raise exception 'Motivazione obbligatoria' using errcode='P3521'; end if;
 if (coalesce(btrim(p_nome),'')='') <> (coalesce(btrim(p_telefono),'')='') then raise exception 'Contatto incompleto' using errcode='22023'; end if;
 insert into public.deroghe_iscrizioni_corsi(iscrizione_id,motivo) values(v_id,btrim(p_motivo));
 insert into public.iscrizioni_corsi(id,edizione_id,persona_id,stato,note) values(v_id,p_edizione,p_persona,'iscritto',p_note);
 if coalesce(btrim(p_nome),'')<>'' then
  insert into public.contatti_emergenza(persona_id,nominativo,telefono) values(p_persona,btrim(p_nome),btrim(p_telefono))
  on conflict(persona_id) do update set nominativo=excluded.nominativo,telefono=excluded.telefono;
 end if;
 return v_id;
end $$;
revoke all on function public.iscrivi_con_deroga(uuid,uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.iscrivi_con_deroga(uuid,uuid,text,text,text,text) to authenticated;

-- Consente di regolarizzare un'iscrizione preesistente senza cambiarne lo stato né cancellarla.
create function public.autorizza_deroga_iscrizione(p_iscrizione uuid,p_edizione uuid,p_motivo text)
returns void language plpgsql security invoker set search_path='' as $$
declare v_persona uuid; v_direttore uuid;
begin
 if not coalesce(public.is_staff(),false) or auth.uid() is null then raise exception 'Non autorizzato' using errcode='42501'; end if;
 if p_motivo is null or char_length(btrim(p_motivo)) not between 5 and 500 then raise exception 'Motivazione obbligatoria' using errcode='P3521'; end if;
 select direttore_id into v_direttore from public.edizioni_corsi where id=p_edizione for update;
 select persona_id into v_persona from public.iscrizioni_corsi where id=p_iscrizione and edizione_id=p_edizione and stato in ('iscritto','in_attesa') for update;
 if not found or not exists(select 1 from public.qualifiche_istruttori where persona_id=v_persona) then raise exception 'Iscrizione o qualifica non disponibile' using errcode='P3521'; end if;
 if v_direttore=v_persona or exists(select 1 from public.assegnazioni_istruttori where edizione_id=p_edizione and persona_id=v_persona) then raise exception 'Incarico nella stessa edizione' using errcode='P3520'; end if;
 insert into public.deroghe_iscrizioni_corsi(iscrizione_id,motivo) values(p_iscrizione,btrim(p_motivo));
end $$;
revoke all on function public.autorizza_deroga_iscrizione(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.autorizza_deroga_iscrizione(uuid,uuid,text) to authenticated;
