-- Anteprima atomica: una singola transazione per lotto e tutte le righe.
-- Nessuna modifica delle importazioni storiche esistenti.
begin;
create function public.crea_anteprima_importazione(p_tipo text,p_base_documentale boolean,p_righe jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_batch uuid; v_n integer;
begin
 if not public.is_staff() or auth.uid() is null then
  raise exception using errcode='42501',message='Operazione non autorizzata';
 end if;
 if p_tipo is null or p_tipo not in ('soci','corsi') or p_base_documentale is null or
    (p_tipo='corsi' and p_base_documentale) or jsonb_typeof(p_righe) is distinct from 'array' then
  raise exception using errcode='22023',message='Importazione non valida';
 end if;
 v_n:=jsonb_array_length(p_righe);
 if v_n not between 1 and 1000 or octet_length(p_righe::text)>4000000 then
  raise exception using errcode='22023',message='Dimensione anteprima non valida';
 end if;
 if exists(select 1 from jsonb_array_elements(p_righe) as r(value)
   where jsonb_typeof(r.value) is distinct from 'object'
      or jsonb_typeof(r.value->'dati') is distinct from 'object'
      or jsonb_typeof(r.value->'errori') is distinct from 'array') then
  raise exception using errcode='22023',message='Riga anteprima non valida';
 end if;
 insert into public.importazioni_batch(tipo,creato_da,base_documentale_verificata)
 values(p_tipo,auth.uid(),p_base_documentale) returning id into v_batch;
 insert into public.importazioni_righe(batch_id,numero,dati,errori)
 select v_batch,(r.ord+1)::integer,r.value->'dati',r.value->'errori'
 from jsonb_array_elements(p_righe) with ordinality as r(value,ord);
 return v_batch;
end $$;
revoke all on function public.crea_anteprima_importazione(text,boolean,jsonb) from public,anon;
grant execute on function public.crea_anteprima_importazione(text,boolean,jsonb) to authenticated;
commit;
