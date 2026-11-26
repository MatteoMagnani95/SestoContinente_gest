-- Audit Fase 5: eseguire esclusivamente su una copia autorizzata.
-- Nessuna mutazione; aggregati senza nominativi, email, percorsi o documenti.
begin transaction read only;
with checks as (
 select 'Cataloghi marcati duplicati storici' as controllo,count(*)::bigint as anomalie
 from public.corsi where duplicato_storico
 union all select 'Edizioni marcate duplicate storiche',count(*) from public.edizioni_corsi where duplicato_storico
 union all select 'Edizioni senza direttore',count(*) from public.edizioni_corsi where direttore_id is null
 union all select 'Direttori diversi dal responsabile registrato',count(*) from public.edizioni_corsi e
 join public.assegnazioni_istruttori a on a.edizione_id=e.id and a.ruolo='responsabile'
 where a.persona_id is distinct from e.direttore_id
 union all select 'Direttori contemporaneamente allievi',count(*) from public.edizioni_corsi e
 join public.iscrizioni_corsi i on i.edizione_id=e.id and i.persona_id=e.direttore_id
 where i.stato in ('in_attesa','iscritto','concluso')
 union all select 'Capienze corsi superate',count(*) from public.edizioni_corsi e
 where (select count(*) from public.iscrizioni_corsi i where i.edizione_id=e.id and i.stato='iscritto')>e.massimo_partecipanti
 union all select 'Capienze eventi superate',count(*) from public.eventi_soci e
 where (select count(*) from public.eventi_soci_iscrizioni i where i.evento_id=e.id and i.stato in ('in_attesa','approvata'))>e.posti
 union all select 'Corsie confermate incoerenti con la lezione',count(*) from public.prenotazioni_corsie p
 join public.lezioni l on l.id=p.lezione_id join public.corsie c on c.id=p.corsia_id
 where p.stato='confermata' and (l.annullata_il is not null or l.piscina_id is distinct from c.piscina_id or p.inizio<l.inizio or p.fine>l.fine)
 union all select 'Prenotazioni parziali da verificare (non necessariamente errori)',count(*) from public.prenotazioni_corsie p
 join public.lezioni l on l.id=p.lezione_id where p.stato='confermata' and (p.inizio<>l.inizio or p.fine<>l.fine)
 union all select 'Presenze su lezioni annullate',count(*) from public.presenze p join public.lezioni l on l.id=p.lezione_id where l.annullata_il is not null
 union all select 'Quote con versato superiore al dovuto',count(*) from public.saldi_quote where versato>importo_dovuto
 union all select 'Addebiti corsi con versato superiore al dovuto',count(*) from public.saldi_corsi where versato>importo_dovuto
 union all select 'Pagamenti senza movimento collegato',count(*) from public.pagamenti p where not exists(select 1 from public.movimenti_economici m where m.pagamento_id=p.id)
 union all select 'Gruppi di attrezzature con più prestiti aperti',count(*) from
 (select attrezzatura_id from public.assegnazioni_attrezzature where restituita_il is null group by attrezzatura_id having count(*)>1) q
 union all select 'Attrezzature assegnate senza prestito aperto',count(*) from public.attrezzature a
 where a.stato='assegnata' and not exists(select 1 from public.assegnazioni_attrezzature p where p.attrezzatura_id=a.id and p.restituita_il is null)
 union all select 'Attrezzature disponibili con prestito aperto',count(*) from public.attrezzature a
 where a.stato='disponibile' and exists(select 1 from public.assegnazioni_attrezzature p where p.attrezzatura_id=a.id and p.restituita_il is null)
 union all select 'Gruppi di revisioni simili da verificare (non necessariamente duplicati)',count(*) from
 (select attrezzatura_id,data_intervento,lower(btrim(tipo)),prossimo_intervento from public.revisioni_attrezzature
 group by 1,2,3,4 having count(*)>1) q
 union all select 'Documenti senza oggetto storage corrispondente',count(*) from public.documenti d
 where not exists(select 1 from storage.objects o where o.bucket_id='sesto-documenti' and o.name=d.percorso_storage)
 union all select 'Oggetti storage transitori da riconciliare',count(*) from storage.objects o
 where o.bucket_id='sesto-documenti' and split_part(o.name,'/',2)='transito'
 union all select 'Metadati certificati senza certificato collegato',count(*) from public.documenti d
 where d.categoria='Certificato medico' and not exists(select 1 from public.certificati_medici c where c.documento_id=d.id)
 union all select 'Scelte storiche senza origine registrata (dato non inventabile)',count(*) from public.scelte_iscrizione where origine is null
 union all select 'Account con più persone collegate (consenso individuale da verificare)',count(*) from
 (select utente_id from public.collegamenti_persone group by utente_id having count(*)>1) q
 union all select 'Pratiche con versioni dichiarative di modalità diversa',count(*) from public.richieste
 where versione_statuto is not null and versione_privacy is not null and
 (versione_statuto like 'TEST-COLLAUDO-%') is distinct from (versione_privacy like 'TEST-COLLAUDO-%')
)
select controllo,anomalie from checks order by controllo;
rollback;
