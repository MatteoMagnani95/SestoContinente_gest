create or replace function public.controlla_identita_corso() returns trigger language plpgsql set search_path='' as $$
declare altro uuid; richiesta_rimozione_flag boolean:=false;
begin
 if tg_op='UPDATE' then
  richiesta_rimozione_flag:=old.duplicato_storico AND new.duplicato_storico IS FALSE;
  new.duplicato_storico:=old.duplicato_storico;
  if tg_table_name='corsi' then
   if (new.tipo,new.livello,public.nome_corso_normalizzato(new.nome)) is not distinct from
      (old.tipo,old.livello,public.nome_corso_normalizzato(old.nome)) and not richiesta_rimozione_flag then return new; end if;
  elsif (new.corso_id,new.stagione_id,new.inizio,new.fine,public.nome_corso_normalizzato(new.nome)) is not distinct from
        (old.corso_id,old.stagione_id,old.inizio,old.fine,public.nome_corso_normalizzato(old.nome)) and not richiesta_rimozione_flag then return new; end if;
 end if;
 new.duplicato_storico:=false;
 if tg_table_name='corsi' then
  select id into altro from public.corsi where id<>new.id and tipo=new.tipo and livello is not distinct from new.livello
   and public.nome_corso_normalizzato(nome)=public.nome_corso_normalizzato(new.nome) order by duplicato_storico,id limit 1;
 else
  select id into altro from public.edizioni_corsi where id<>new.id and corso_id=new.corso_id and stagione_id=new.stagione_id and inizio=new.inizio and fine=new.fine
   and public.nome_corso_normalizzato(nome)=public.nome_corso_normalizzato(new.nome) order by duplicato_storico,id limit 1;
 end if;
 if altro is not null then raise exception 'Questo corso esiste già' using errcode='P3419',detail=altro::text; end if;
 return new;
end $$;

-- Targeted repair: empty cancelled editions only. No historical or performance migration replay.
CREATE OR REPLACE FUNCTION public.proteggi_responsabile_corso() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE v_stato text;
BEGIN
 IF OLD.ruolo='responsabile' THEN
  SELECT stato INTO v_stato FROM public.edizioni_corsi WHERE id=OLD.edizione_id FOR UPDATE;
  IF v_stato IS DISTINCT FROM 'annullato'
   OR EXISTS(SELECT 1 FROM public.iscrizioni_corsi WHERE edizione_id=OLD.edizione_id)
   OR EXISTS(SELECT 1 FROM public.lezioni WHERE edizione_id=OLD.edizione_id)
   OR EXISTS(SELECT 1 FROM public.brevetti_allievi WHERE edizione_id=OLD.edizione_id)
   OR EXISTS(SELECT 1 FROM public.documenti WHERE edizione_id=OLD.edizione_id)
   OR EXISTS(SELECT 1 FROM public.assegnazioni_attrezzature WHERE edizione_id=OLD.edizione_id)
  THEN RAISE EXCEPTION 'Sostituire il responsabile, non rimuoverlo' USING ERRCODE='P3414'; END IF;
 END IF;
 RETURN OLD;
END $$;

CREATE FUNCTION public.elimina_edizione_annullata_vuota(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_stato text; v_edizione public.edizioni_corsi%ROWTYPE; v_survivor uuid; v_n integer;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_staff(),false) THEN
  RAISE EXCEPTION 'Permessi insufficienti' USING ERRCODE='42501';
 END IF;
 SELECT * INTO v_edizione FROM public.edizioni_corsi WHERE id=p_id FOR UPDATE;
 v_stato:=v_edizione.stato;
 IF v_stato IS DISTINCT FROM 'annullato' THEN
  RAISE EXCEPTION 'Solo edizioni annullate' USING ERRCODE='P3414';
 END IF;
 IF EXISTS(SELECT 1 FROM public.iscrizioni_corsi WHERE edizione_id=p_id)
 OR EXISTS(SELECT 1 FROM public.lezioni WHERE edizione_id=p_id)
 OR EXISTS(SELECT 1 FROM public.brevetti_allievi WHERE edizione_id=p_id)
 OR EXISTS(SELECT 1 FROM public.documenti WHERE edizione_id=p_id)
 OR EXISTS(SELECT 1 FROM public.assegnazioni_attrezzature WHERE edizione_id=p_id)
 THEN RAISE EXCEPTION 'Record con dati collegati' USING ERRCODE='P3414'; END IF;
 -- Remove only empty cancelled edition's assignments. Existing FK-aware
 -- routine checks any additional incoming references; a failure rolls back all.
 DELETE FROM public.assegnazioni_istruttori WHERE edizione_id=p_id;
 PERFORM public.rimuovi_record_gestionale('edizioni_corsi',p_id);
 SELECT count(*)::int INTO v_n FROM public.edizioni_corsi e
 WHERE (e.corso_id,e.stagione_id,e.inizio,e.fine,public.nome_corso_normalizzato(e.nome))
 = (v_edizione.corso_id,v_edizione.stagione_id,v_edizione.inizio,v_edizione.fine,public.nome_corso_normalizzato(v_edizione.nome));
 IF v_n=1 THEN
  SELECT e.id INTO v_survivor FROM public.edizioni_corsi e
  WHERE (e.corso_id,e.stagione_id,e.inizio,e.fine,public.nome_corso_normalizzato(e.nome))
  = (v_edizione.corso_id,v_edizione.stagione_id,v_edizione.inizio,v_edizione.fine,public.nome_corso_normalizzato(v_edizione.nome))
  AND e.duplicato_storico FOR UPDATE;
  IF v_survivor IS NOT NULL THEN UPDATE public.edizioni_corsi SET duplicato_storico=false WHERE id=v_survivor; END IF;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.elimina_edizione_annullata_vuota(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.elimina_edizione_annullata_vuota(uuid) TO authenticated;
