-- Migrazione incrementale v12: riepilogo amministrativo aggregato e certificati caricati dal titolare.
begin;
create or replace function public.cda_report_sintetico()
returns table(tipo text, totale bigint) language sql stable security definer set search_path='' as $$
 select 'Soci con adesione attiva'::text,count(*)::bigint from public.adesioni a where a.stato='attiva'
 union all
 select 'Corsi in catalogo'::text,count(*)::bigint from public.corsi
 union all
 select 'Sedute CdA approvate'::text,count(*)::bigint from public.cda_verbali v where v.stato='approvato'
 union all
 select 'Sedute CdA in approvazione'::text,count(*)::bigint from public.cda_verbali v where v.stato='in_approvazione'
$$;
-- La funzione deve negare i ruoli diversi da CdA/staff; evitare dati personali, medici o contabili.
create or replace function public.cda_report_sicuro()
returns table(tipo text,totale bigint) language plpgsql stable security definer set search_path='' as $$
begin
 if not (public.is_staff() or public.is_board()) then raise exception 'Non autorizzato'; end if;
 return query select r.tipo,r.totale from public.cda_report_sintetico() r;
end $$;
revoke all on function public.cda_report_sintetico() from public,anon,authenticated;
revoke all on function public.cda_report_sicuro() from public,anon;
grant execute on function public.cda_report_sicuro() to authenticated;

create or replace function public.registra_certificato_personale(p_persona uuid,p_documento uuid,p_rilasciato date,p_scade date)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null or not public.owns_person(p_persona) then raise exception 'Persona non collegata all account'; end if;
 if p_rilasciato is null or p_scade is null or p_scade<p_rilasciato or p_rilasciato>current_date then raise exception 'Date non valide'; end if;
 if not exists(select 1 from public.documenti d
    where d.id=p_documento and d.persona_id=p_persona and d.utente_id=auth.uid()
      and d.caricato_da=auth.uid() and d.ambito='personale' and d.visibilita='proprietario'
      and d.categoria='Certificato medico'
      and d.mime in ('application/pdf','image/jpeg','image/png'))
 then raise exception 'Documento privato non appartenente al titolare'; end if;
 if exists(select 1 from public.certificati_medici where documento_id=p_documento) then raise exception 'Documento già associato'; end if;
 insert into public.certificati_medici(persona_id,rilasciato_il,scade_il,idoneita_verificata,documento_id)
 values(p_persona,p_rilasciato,p_scade,false,p_documento) returning id into v_id;
 return v_id;
end $$;
revoke all on function public.registra_certificato_personale(uuid,uuid,date,date) from public,anon;
grant execute on function public.registra_certificato_personale(uuid,uuid,date,date) to authenticated;
commit;
