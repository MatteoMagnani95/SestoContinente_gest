-- Serializza i nuovi interventi della stessa attrezzatura. Usa RLS e trigger esistenti.
create or replace function public.registra_revisione(
  p_richiesta uuid, p_attrezzatura uuid, p_data date, p_prossimo date,
  p_tipo text, p_esito text, p_costo numeric, p_note text, p_distinta boolean
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  precedente public.revisioni_attrezzature%rowtype;
begin
  if not coalesce(public.is_staff(), false) then
    raise exception using errcode='42501', message='Permesso insufficiente';
  end if;
  if p_richiesta is null or p_data is null or p_data > (now() at time zone 'Europe/Rome')::date
    or p_prossimo < p_data or nullif(btrim(p_tipo),'') is null or p_costo < 0
    or p_costo is distinct from round(p_costo, 2) then
    raise exception using errcode='22023', message='Dati intervento non validi';
  end if;
  perform 1 from public.attrezzature where id=p_attrezzatura for update;
  if not found then
    raise exception using errcode='P3501', message='Attrezzatura non disponibile';
  end if;
  select * into precedente from public.revisioni_attrezzature where id=p_richiesta;
  if found then
    if (precedente.attrezzatura_id, precedente.data_intervento, precedente.prossimo_intervento,
        precedente.tipo, precedente.esito, precedente.costo, precedente.note)
       is not distinct from (p_attrezzatura,p_data,p_prossimo,p_tipo,p_esito,p_costo,p_note) then
      return precedente.id;
    end if;
    raise exception using errcode='P3502', message='Richiesta già utilizzata';
  end if;
  if not coalesce(p_distinta,false) and exists (
    select 1 from public.revisioni_attrezzature
    where attrezzatura_id=p_attrezzatura and data_intervento=p_data
      and lower(btrim(tipo))=lower(btrim(p_tipo))
      and prossimo_intervento is not distinct from p_prossimo
  ) then
    raise exception using errcode='P3503', message='Intervento simile già registrato';
  end if;
  insert into public.revisioni_attrezzature(id,attrezzatura_id,data_intervento,prossimo_intervento,tipo,esito,costo,note)
    values(p_richiesta,p_attrezzatura,p_data,p_prossimo,p_tipo,p_esito,p_costo,p_note);
  return p_richiesta;
end;
$$;
revoke all on function public.registra_revisione(uuid,uuid,date,date,text,text,numeric,text,boolean) from public, anon;
grant execute on function public.registra_revisione(uuid,uuid,date,date,text,text,numeric,text,boolean) to authenticated;

-- Correzioni delle date con provenienza verificabile. Un intervallo o una
-- scadenza storica mancante non si possono ricostruire dalla sola anagrafica.
create or replace function public.correggi_date_revisione()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  scheda public.attrezzature%rowtype;
begin
  if new.attrezzatura_id is distinct from old.attrezzatura_id then
    raise exception using errcode='P3504', message='Attrezzatura storica non riassegnabile';
  end if;
  if (new.data_intervento,new.prossimo_intervento) is not distinct from
     (old.data_intervento,old.prossimo_intervento) then return new; end if;
  if new.data_intervento > (now() at time zone 'Europe/Rome')::date or
     new.prossimo_intervento < new.data_intervento then
    raise exception using errcode='22023', message='Date intervento non valide';
  end if;
  select * into strict scheda from public.attrezzature where id=new.attrezzatura_id for update;
  if greatest(old.data_intervento,new.data_intervento) < scheda.ultima_revisione then
    -- La scadenza è attribuibile a un intervento successivo o resta non documentata.
    if (old.prossimo_intervento is null and new.prossimo_intervento is null) or
       exists (select 1 from public.revisioni_attrezzature r where r.attrezzatura_id=scheda.id
         and r.data_intervento=scheda.ultima_revisione and r.prossimo_intervento=scheda.prossima_revisione) then
      return new;
    end if;
  elsif old.data_intervento=scheda.ultima_revisione and new.data_intervento>=old.data_intervento
    and not exists (select 1 from public.revisioni_attrezzature r where r.attrezzatura_id=scheda.id
      and r.id<>old.id and r.data_intervento>=old.data_intervento)
    and (old.prossimo_intervento is null or old.prossimo_intervento=scheda.prossima_revisione)
    and (new.prossimo_intervento is not null or old.prossimo_intervento is null) then
    update public.attrezzature set ultima_revisione=new.data_intervento,
      prossima_revisione=coalesce(new.prossimo_intervento,prossima_revisione) where id=scheda.id;
    return new;
  end if;
  raise exception using errcode='P3504', message='Le date richiedono verifica dello storico';
end;
$$;
create trigger correggi_date_revisione before update of attrezzatura_id,data_intervento,prossimo_intervento
  on public.revisioni_attrezzature for each row execute function public.correggi_date_revisione();
revoke all on function public.correggi_date_revisione() from public,anon;
