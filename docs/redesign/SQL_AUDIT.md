# Inventario statico SQL — migrazioni 0001–0019

Inventario lessicale delle 19 migrazioni ordinate, con riferimenti di riga a dichiarazioni esplicite. Non rappresenta lo schema effettivamente installato, né le policy finali dopo tutte le sostituzioni. Regex non è un parser SQL: commenti, SQL dinamico e blocchi funzione possono generare falsi positivi o omissioni; controllare sempre il sorgente. SECURITY DEFINER è un indizio testuale nel segmento, non una classificazione certificata. Verificare ogni RPC, privilegi, search_path, policy effettiva, FK, trigger e storage con staging prima del rilascio. Nessun SQL eseguito.

## 20261111210100_fase1.sql
### Policy RLS esplicite
| Riga | Operazione | Policy | Tabella | Clausola |
|---:|---|---|---|---|
| 138 | create policy | stagioni_leggibili | public.stagioni | for select to authenticated using (true) |
| 139 | create policy | ruoli_leggibili | public.ruoli_utente | for select to authenticated using (utente_id = (select auth.uid()) or (select public.is_staff())) |
| 141 | create policy | richieste_leggibili | public.richieste | for select to authenticated using (utente_id = (select auth.uid()) or (select public.is_staff())) |
| 143 | create policy | persone_leggibili | public.persone | for select to authenticated using ((select public.is_staff()) or exists ( select 1 from public.collegamenti_persone c where c.persona_id = persone.id and c.utente_id = (select auth.uid()) )) |
| 148 | create policy | collegamenti_leggibili | public.collegamenti_persone | for select to authenticated using (utente_id = (select auth.uid()) or (select public.is_staff())) |
| 150 | create policy | tutori_leggibili | public.relazioni_tutori | for select to authenticated using ((select public.is_staff()) or exists ( select 1 from public.collegamenti_persone c where c.persona_id = relazioni_tutori.minore_id and c.utente_id = (select auth.uid()) )) |
| 155 | create policy | adesioni_leggibili | public.adesioni | for select to authenticated using ((select public.is_staff()) or exists ( select 1 from public.collegamenti_persone c where c.persona_id = adesioni.persona_id and c.utente_id = (select auth.uid()) )) |
| 160 | create policy | eventi_staff | public.eventi_pratica | for select to authenticated using ((select public.is_staff())) |

### Funzioni
| Riga | Nome | SECURITY DEFINER (rilevamento testuale) |
|---:|---|---|
| 120 | public.is_staff | Presente nel segmento |
| 167 | public.salva_domanda | Presente nel segmento |
| 248 | public.prendi_in_carico | Presente nel segmento |
| 261 | public.valuta_domanda | Presente nel segmento |

### Riferimenti FK letterali (destinazione)
- Riga 26: `auth.users(id)`
- Riga 34: `auth.users(id)`
- Riga 55: `auth.users(id)`
- Riga 80: `public.persone(id)`
- Riga 83: `auth.users(id)`
- Riga 84: `public.persone(id)`
- Riga 91: `public.persone(id)`
- Riga 92: `public.persone(id)`
- Riga 100: `public.persone(id)`
- Riga 101: `public.stagioni(id)`
- Riga 110: `public.richieste(id)`
- Riga 111: `auth.users(id)`

### Altri costrutti sensibili
- Riga 129: enable row level security
- Riga 130: enable row level security
- Riga 131: enable row level security
- Riga 132: enable row level security
- Riga 133: enable row level security
- Riga 134: enable row level security
- Riga 135: enable row level security
- Riga 136: enable row level security
- Riga 348: grant execute
- Riga 349: grant execute
- Riga 350: grant execute
- Riga 351: grant execute


## 20261111210200_gestionale_completo.sql
### Policy RLS esplicite
| Riga | Operazione | Policy | Tabella | Clausola |
|---:|---|---|---|---|
| 20 | create policy | persone_staff_ins | public.persone | for insert to authenticated with check ((select public.is_staff())) |
| 21 | create policy | persone_staff_upd | public.persone | for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff())) |
| 22 | create policy | adesioni_staff_ins | public.adesioni | for insert to authenticated with check ((select public.is_staff())) |
| 23 | create policy | adesioni_staff_upd | public.adesioni | for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff())) |
| 24 | create policy | stagioni_admin_ins | public.stagioni | for insert to authenticated with check ((select public.is_admin())) |
| 25 | create policy | stagioni_admin_upd | public.stagioni | for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin())) |
| 26 | create policy | ruoli_admin_ins | public.ruoli_utente | for insert to authenticated with check ((select public.is_admin())) |
| 27 | create policy | ruoli_admin_del | public.ruoli_utente | for delete to authenticated using ((select public.is_admin())) |
| 320 | create policy | edizioni_read | public.edizioni_corsi | for select to authenticated using(true) |
| 321 | create policy | edizioni_ins | public.edizioni_corsi | for insert to authenticated with check ((select public.is_staff())) |
| 322 | create policy | edizioni_upd | public.edizioni_corsi | for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff())) |
| 323 | create policy | iscrizioni_read | public.iscrizioni_corsi | for select to authenticated using ( (select public.is_staff()) or (select public.owns_person(persona_id)) or (select public.insegna_edizione(edizione_id))) |
| 325 | create policy | iscrizioni_ins | public.iscrizioni_corsi | for insert to authenticated with check((select public.is_staff())) |
| 326 | create policy | iscrizioni_upd | public.iscrizioni_corsi | for update to authenticated using((select public.is_staff())) with check((select public.is_staff())) |
| 327 | create policy | assegnazioni_read | public.assegnazioni_istruttori | for select to authenticated using ( (select public.is_staff()) or (select public.owns_person(persona_id)) or (select public.iscritto_edizione(edizione_id))) |
| 329 | create policy | assegnazioni_ins | public.assegnazioni_istruttori | for insert to authenticated with check((select public.is_staff())) |
| 330 | create policy | assegnazioni_upd | public.assegnazioni_istruttori | for update to authenticated using((select public.is_staff())) with check((select public.is_staff())) |
| 340 | create policy | lezioni_read | public.lezioni | for select to authenticated using ( (select public.is_staff()) or (select public.insegna_edizione(edizione_id)) or (select public.iscritto_edizione(edizione_id))) |
| 342 | create policy | lezioni_ins | public.lezioni | for insert to authenticated with check ((select public.is_staff())) |
| 343 | create policy | lezioni_upd | public.lezioni | for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff())) |
| 344 | create policy | prenotazioni_read | public.prenotazioni_corsie | for select to authenticated using ( (select public.is_staff()) or exists(select 1 from public.lezioni l where l.id=lezione_id)) |
| 346 | create policy | prenotazioni_ins | public.prenotazioni_corsie | for insert to authenticated with check ((select public.is_staff())) |
| 347 | create policy | prenotazioni_upd | public.prenotazioni_corsie | for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff())) |
| 348 | create policy | presenze_read | public.presenze | for select to authenticated using ( (select public.is_staff()) or (select public.owns_person(persona_id)) or exists( select 1 from public.lezioni l where l.id=lezione_id and (select public.insegna_edizione(l.edizione_id)))) |
| 351 | create policy | presenze_ins | public.presenze | for insert to authenticated with check ( (select public.is_staff()) or exists(select 1 from public.lezioni l where l.id=lezione_id and (select public.insegna_edizione(l.edizione_id)))) |
| 353 | create policy | presenze_upd | public.presenze | for update to authenticated using ( (select public.is_staff()) or exists(select 1 from public.lezioni l where l.id=lezione_id and (select public.insegna_edizione(l.edizione_id)))) with check ((select public.is_staff()) or exists(select 1 from public.lezioni l where l.id=lezione_id and (select public.insegna_edizione(l.edizione_id)))) |
| 366 | create policy | quote_read | public.quote_associative | for select to authenticated using ( (select public.is_staff()) or (select public.owns_person(persona_id))) |
| 368 | create policy | quote_ins | public.quote_associative | for insert to authenticated with check ((select public.is_staff())) |
| 369 | create policy | quote_upd | public.quote_associative | for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff())) |
| 370 | create policy | addebiti_read | public.addebiti_corsi | for select to authenticated using ( (select public.is_staff()) or exists(select 1 from public.iscrizioni_corsi i where i.id=iscrizione_id and (select public.owns_person(i.persona_id)))) |
| 372 | create policy | addebiti_ins | public.addebiti_corsi | for insert to authenticated with check ((select public.is_staff())) |
| 373 | create policy | addebiti_upd | public.addebiti_corsi | for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff())) |
| 374 | create policy | pagamenti_read | public.pagamenti | for select to authenticated using ( (select public.is_staff()) or (select public.owns_person(persona_id))) |
| 376 | create policy | pagamenti_ins | public.pagamenti | for insert to authenticated with check ((select public.is_staff())) |
| 378 | create policy | movimenti_read | public.movimenti_economici | for select to authenticated using ((select public.is_admin())) |
| 379 | create policy | movimenti_ins | public.movimenti_economici | for insert to authenticated with check ((select public.is_admin()) and pagamento_id is null) |
| 380 | create policy | movimenti_upd | public.movimenti_economici | for update to authenticated using ((select public.is_admin()) and pagamento_id is null) with check ((select public.is_admin()) and pagamento_id is null) |
| 383 | create policy | documenti_read | public.documenti | for select to authenticated using ( (select public.is_staff()) or (utente_id=(select auth.uid())) or (visibilita='soci' and exists(select 1 from public.ruoli_utente r where r.utente_id=(select auth.uid()) and r.ruolo='socio')) or (visibilita='istruttori' and (select public.is_instructor()))) |
| 387 | create policy | documenti_ins | public.documenti | for insert to authenticated with check ( caricato_da=(select auth.uid()) and ((select public.is_staff()) or (utente_id=(select auth.uid()) and ambito='personale' and visibilita='proprietario'))) |
| 390 | create policy | documenti_upd | public.documenti | for update to authenticated using((select public.is_staff())) with check((select public.is_staff())) |
| 397 | create policy | sesto_storage_read | storage.objects | for select to authenticated using( bucket_id='sesto-documenti' and exists(select 1 from public.documenti d where d.percorso_storage=name)) |
| 399 | create policy | sesto_storage_insert | storage.objects | for insert to authenticated with check( bucket_id='sesto-documenti' and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.documenti d where d.percorso_storage=name and d.caricato_da=(select auth.uid()))) |
| 402 | create policy | sesto_storage_delete | storage.objects | for delete to authenticated using( bucket_id='sesto-documenti' and (select public.is_admin())) |
| 405 | create policy | comunicazioni_read | public.comunicazioni | for select to authenticated using ( attiva and (destinatari='tutti' or (destinatari='staff' and (select public.is_staff())) or (destinatari='soci' and exists(select 1 from public.ruoli_utente r where r.utente_id=(select auth.uid()) and r.ruolo='socio')) or (destinatari='istruttori' and (select public.is_instructor()))) or (select public.is_staff())) |
| 409 | create policy | comunicazioni_ins | public.comunicazioni | for insert to authenticated with check ((select public.is_staff())) |
| 410 | create policy | comunicazioni_upd | public.comunicazioni | for update to authenticated using((select public.is_staff())) with check((select public.is_staff())) |
| 411 | create policy | notifiche_read | public.notifiche | for select to authenticated using(utente_id=(select auth.uid()) or (select public.is_staff())) |
| 412 | create policy | notifiche_upd | public.notifiche | for update to authenticated using(utente_id=(select auth.uid())) with check(utente_id=(select auth.uid())) |
| 413 | create policy | impostazioni_read | public.impostazioni_promemoria | for select to authenticated using((select public.is_staff())) |
| 414 | create policy | impostazioni_ins | public.impostazioni_promemoria | for insert to authenticated with check((select public.is_admin())) |
| 415 | create policy | impostazioni_upd | public.impostazioni_promemoria | for update to authenticated using((select public.is_admin())) with check((select public.is_admin())) |
| 416 | create policy | registro_read | public.registro_operazioni | for select to authenticated using((select public.is_admin())) |
| 510 | drop policy if exists | notifiche_upd | public.notifiche |  |
| 539 | drop policy if exists | documenti_read | public.documenti |  |
| 540 | create policy | documenti_read | public.documenti | for select to authenticated using ( (select public.is_staff()) or utente_id=(select auth.uid()) or (visibilita='soci' and ((ambito='associazione' and exists( select 1 from public.ruoli_utente r where r.utente_id=(select auth.uid()) and r.ruolo='socio')) or (edizione_id is not null and (select public.iscritto_edizione(edizione_id))))) or (visibilita='istruttori' and (select public.is_instructor()) and (edizione_id is null or (select public.insegna_edizione(edizione_id))))) |
| 569 | create policy | persone_insegnanti | public.persone | for select to authenticated using ( (select public.istruttore_di_persona(id))) |
| 575 | drop policy if exists | versioni_programmi_read | public.versioni_programmi |  |
| 576 | create policy | versioni_programmi_read | public.versioni_programmi | for select to authenticated using ( (select public.is_staff()) or (select public.is_instructor()) or stato='approvato') |
| 705 | create policy | tesseramenti_read | public.tesseramenti | for select to authenticated using( (select public.is_staff()) or exists(select 1 from public.adesioni a where a.id=adesione_id and (select public.owns_person(a.persona_id)))) |
| 707 | create policy | tesseramenti_ins | public.tesseramenti | for insert to authenticated with check((select public.is_staff())) |
| 708 | create policy | tesseramenti_upd | public.tesseramenti | for update to authenticated using((select public.is_staff())) with check((select public.is_staff())) |
| 777 | create policy | documenti_delete_admin | public.documenti | for delete to authenticated using((select public.is_admin())) |

### Funzioni
| Riga | Nome | SECURITY DEFINER (rilevamento testuale) |
|---:|---|---|
| 6 | public.is_admin | Presente nel segmento |
| 10 | public.is_instructor | Presente nel segmento |
| 14 | public.owns_person | Presente nel segmento |
| 87 | public.insegna_edizione | Presente nel segmento |
| 93 | public.iscritto_edizione | Presente nel segmento |
| 123 | public.valida_prenotazione_corsia | Non rilevato |
| 142 | public.verifica_presenza | Non rilevato |
| 154 | public.verifica_capienza_corso | Non rilevato |
| 210 | public.verifica_destinatario_pagamento | Non rilevato |
| 234 | public.contabilizza_pagamento | Presente nel segmento |
| 290 | public.registra_operazione | Presente nel segmento |
| 430 | public.richiedi_iscrizione_corso | Presente nel segmento |
| 449 | public.genera_promemoria | Presente nel segmento |
| 511 | public.segna_notifica_letta | Presente nel segmento |
| 522 | public.assegna_ruolo_email | Presente nel segmento |
| 549 | public.annulla_upload_documento | Presente nel segmento |
| 561 | public.istruttore_di_persona | Presente nel segmento |
| 580 | public.genera_promemoria_organizzativi | Presente nel segmento |
| 627 | public.avvisa_cambio_lezione | Presente nel segmento |
| 652 | public.proteggi_versione_didattica | Non rilevato |
| 671 | public.aggiorna_revisione_attrezzatura | Presente nel segmento |
| 683 | public.verifica_modifica_lezione | Non rilevato |
| 713 | public.genera_promemoria_tessere | Presente nel segmento |
| 741 | public.aggiorna_recapiti_personali | Presente nel segmento |
| 757 | public.collega_account_a_persona | Presente nel segmento |
| 780 | public.proteggi_versione_didattica | Non rilevato |
| 806 | public.verifica_riduzione_capienza | Non rilevato |
| 818 | public.aggiorna_stato_attrezzatura_assegnata | Presente nel segmento |
| 844 | public.idoneita_allievi_corso | Presente nel segmento |
| 863 | public.avvisa_nuova_richiesta | Presente nel segmento |
| 884 | public.controlla_consegna_attrezzatura | Non rilevato |

### Riferimenti FK letterali (destinazione)
- Riga 35: `public.programmi_didattici(id)`
- Riga 49: `public.corsi(id)`
- Riga 50: `public.stagioni(id)`
- Riga 54: `public.versioni_programmi(id)`
- Riga 58: `public.edizioni_corsi(id)`
- Riga 59: `public.persone(id)`
- Riga 65: `public.persone(id)`
- Riga 70: `public.edizioni_corsi(id)`
- Riga 71: `public.persone(id)`
- Riga 77: `public.persone(id)`
- Riga 82: `public.persone(id)`
- Riga 106: `public.piscine(id)`
- Riga 110: `public.edizioni_corsi(id)`
- Riga 112: `public.piscine(id)`
- Riga 116: `public.lezioni(id)`
- Riga 117: `public.corsie(id)`
- Riga 137: `public.lezioni(id)`
- Riga 138: `public.persone(id)`
- Riga 177: `public.attrezzature(id)`
- Riga 182: `public.attrezzature(id)`
- Riga 183: `public.persone(id)`
- Riga 183: `public.edizioni_corsi(id)`
- Riga 191: `public.persone(id)`
- Riga 192: `public.stagioni(id)`
- Riga 197: `public.iscrizioni_corsi(id)`
- Riga 202: `public.persone(id)`
- Riga 203: `public.quote_associative(id)`
- Riga 204: `public.addebiti_corsi(id)`
- Riga 231: `public.pagamenti(id)`
- Riga 257: `auth.users(id)`
- Riga 257: `public.persone(id)`
- Riga 258: `public.edizioni_corsi(id)`
- Riga 261: `auth.users(id)`
- Riga 268: `auth.users(id)`
- Riga 271: `auth.users(id)`
- Riga 535: `public.documenti(id)`
- Riga 699: `public.adesioni(id)`
- Riga 776: `public.versioni_programmi(id)`

### Altri costrutti sensibili
- Riga 134: create trigger
- Riga 151: create trigger
- Riga 166: create trigger
- Riga 223: create trigger
- Riga 242: create trigger
- Riga 244: security_invoker=true
- Riga 308: enable row level security
- Riga 425: create trigger
- Riga 504: grant execute
- Riga 505: grant execute
- Riga 506: grant execute
- Riga 519: grant execute
- Riga 532: grant execute
- Riga 558: grant execute
- Riga 572: grant execute
- Riga 624: grant execute
- Riga 648: create trigger
- Riga 667: create trigger
- Riga 680: create trigger
- Riga 694: create trigger
- Riga 704: enable row level security
- Riga 709: create trigger
- Riga 738: grant execute
- Riga 754: grant execute
- Riga 772: grant execute
- Riga 798: create trigger
- Riga 800: create trigger
- Riga 814: create trigger
- Riga 839: create trigger
- Riga 860: grant execute
- Riga 879: create trigger
- Riga 895: create trigger


## 20261111210300_schede_soci.sql
### Policy RLS esplicite
| Riga | Operazione | Policy | Tabella | Clausola |
|---:|---|---|---|---|
| — | — | — | — | Nessuna dichiarazione letterale rilevata |

### Funzioni
| Riga | Nome | SECURITY DEFINER (rilevamento testuale) |
|---:|---|---|


### Riferimenti FK letterali (destinazione)
- Nessuno rilevato

### Altri costrutti sensibili
- Riga 12: security_invoker = true


## 20261111210400_corsi_guidati.sql
### Policy RLS esplicite
| Riga | Operazione | Policy | Tabella | Clausola |
|---:|---|---|---|---|
| 13 | create policy | assegnazioni_staff_del | public.assegnazioni_istruttori | for delete to authenticated using ((select public.is_staff())) |

### Funzioni
| Riga | Nome | SECURITY DEFINER (rilevamento testuale) |
|---:|---|---|
| 18 | public.valida_nuova_iscrizione_guidata | Non rilevato |
| 42 | public.proteggi_responsabile_corso | Non rilevato |
| 54 | public.crea_lezione_guidata | Non rilevato |

### Riferimenti FK letterali (destinazione)
- Nessuno rilevato

### Altri costrutti sensibili
- Riga 36: create trigger
- Riga 48: create trigger
- Riga 95: grant execute


## 20261111210500_calendario_economico.sql
### Policy RLS esplicite
| Riga | Operazione | Policy | Tabella | Clausola |
|---:|---|---|---|---|
| — | — | — | — | Nessuna dichiarazione letterale rilevata |

### Funzioni
| Riga | Nome | SECURITY DEFINER (rilevamento testuale) |
|---:|---|---|
| 11 | public.valida_prenotazione_corsia | Non rilevato |
| 31 | public.modifica_lezione_e_corsie | Non rilevato |
| 84 | public.annulla_lezione_guidata | Non rilevato |
| 102 | public.verifica_presenza | Non rilevato |
| 116 | public.avvisa_annullamento_lezione | Presente nel segmento |
| 143 | public.riepilogo_contabile_periodo | Non rilevato |

### Riferimenti FK letterali (destinazione)
- Nessuno rilevato

### Altri costrutti sensibili
- Riga 80: grant execute
- Riga 99: grant execute
- Riga 138: create trigger
- Riga 177: grant execute


## 20261111210600_incassi_controllati.sql
### Policy RLS esplicite
| Riga | Operazione | Policy | Tabella | Clausola |
|---:|---|---|---|---|
| 102 | drop policy if exists | pagamenti_ins | public.pagamenti |  |

### Funzioni
| Riga | Nome | SECURITY DEFINER (rilevamento testuale) |
|---:|---|---|
| 42 | public.verifica_destinatario_pagamento | Non rilevato |
| 77 | public.verifica_riduzione_addebito | Non rilevato |
| 103 | public.registra_pagamento_guidato | Presente nel segmento |

### Riferimenti FK letterali (destinazione)
- Riga 7: `auth.users(id)`

### Altri costrutti sensibili
- Riga 14: security_invoker=true
- Riga 24: security_invoker=true
- Riga 94: create trigger
- Riga 97: create trigger
- Riga 155: grant execute


## 20261116100700_ruolo_cda.sql
### Policy RLS esplicite
| Riga | Operazione | Policy | Tabella | Clausola |
|---:|---|---|---|---|
| — | — | — | — | Nessuna dichiarazione letterale rilevata |

### Funzioni
| Riga | Nome | SECURITY DEFINER (rilevamento testuale) |
|---:|---|---|


### Riferimenti FK letterali (destinazione)
- Nessuno rilevato

### Altri costrutti sensibili
- Nessuno rilevato


## 20261116100800_v12_sicurezza_organi_didattica_import.sql
### Policy RLS esplicite
| Riga | Operazione | Policy | Tabella | Clausola |
|---:|---|---|---|---|
| 48 | create policy | listino_corsi_staff_read | public.listino_corsi | for select to authenticated using(public.is_staff()) |
| 192 | create policy | cda_componenti_read | public.cda_componenti | for select to authenticated using(public.is_staff() or public.is_board()) |
| 193 | create policy | cda_componenti_write | public.cda_componenti | for insert to authenticated with check(public.is_staff()) |
| 194 | create policy | cda_componenti_update | public.cda_componenti | for update to authenticated using(public.is_staff()) with check(public.is_staff()) |
| 195 | create policy | cda_verbali_read | public.cda_verbali | for select to authenticated using(public.is_staff() or public.is_board()) |
| 196 | create policy | cda_verbali_insert | public.cda_verbali | for insert to authenticated with check(public.is_staff() and creato_da=auth.uid()) |
| 197 | create policy | cda_votanti_read | public.cda_votanti | for select to authenticated using(public.is_staff() or (utente_id=auth.uid() and public.is_board())) |
| 198 | create policy | cda_voti_read | public.cda_voti | for select to authenticated using(public.is_staff() or (utente_id=auth.uid() and public.is_board())) |
| 199 | create policy | cda_adesioni_read | public.cda_adesioni | for select to authenticated using(public.is_staff() or public.is_board()) |
| 292 | create policy | moduli_read | public.moduli_didattici | for select to authenticated using(true) |
| 293 | create policy | moduli_staff_write | public.moduli_didattici | for insert to authenticated with check(public.is_staff()) |
| 294 | create policy | moduli_staff_update | public.moduli_didattici | for update to authenticated using(public.is_staff()) with check(public.is_staff()) |
| 295 | create policy | lezione_moduli_read | public.lezione_moduli | for select to authenticated using(public.is_staff() or exists(select 1 from public.lezioni l where l.id=lezione_id and (public.insegna_edizione(l.edizione_id) or public.iscritto_edizione(l.edizione_id)))) |
| 324 | create policy | import_batch_staff_read | public.importazioni_batch | for select to authenticated using(public.is_staff()) |
| 325 | create policy | import_batch_staff_insert | public.importazioni_batch | for insert to authenticated with check(public.is_staff() and creato_da=auth.uid()) |
| 326 | create policy | import_righe_staff_read | public.importazioni_righe | for select to authenticated using(public.is_staff()) |
| 327 | create policy | import_righe_staff_insert | public.importazioni_righe | for insert to authenticated with check(public.is_staff() and exists(select 1 from public.importazioni_batch b where b.id=batch_id and b.creato_da=auth.uid() and b.stato='anteprima')) |
| 335 | create policy | accettazioni_storiche_staff | public.provenienza_accettazioni_storiche | for select to authenticated using(public.is_staff()) |
| 407 | create policy | sesto_cda_read | storage.objects | for select to authenticated using(bucket_id='sesto-cda' and (public.is_staff() or public.is_board())) |
| 409 | create policy | sesto_cda_insert | storage.objects | for insert to authenticated with check(bucket_id='sesto-cda' and (public.is_staff() or (storage.extension(name)='pdf' and public.puo_generare_pdf_cda(name)))) |
| 413 | drop policy if exists | attrezzature_read | public.attrezzature |  |
| 414 | create policy | attrezzature_read | public.attrezzature | for select to authenticated using(public.is_staff()) |
| 415 | drop policy if exists | revisioni_attrezzature_read | public.revisioni_attrezzature |  |
| 416 | create policy | revisioni_attrezzature_read | public.revisioni_attrezzature | for select to authenticated using(public.is_staff()) |
| 417 | drop policy if exists | assegnazioni_attrezzature_read | public.assegnazioni_attrezzature |  |
| 418 | create policy | assegnazioni_attrezzature_read | public.assegnazioni_attrezzature | for select to authenticated using(public.is_staff()) |
| 420 | drop policy if exists | documenti_read | public.documenti |  |
| 421 | create policy | documenti_read | public.documenti | for select to authenticated using( public.is_staff() or utente_id=auth.uid() or (visibilita='soci' and ((ambito='associazione' and exists(select 1 from public.ruoli_utente r where r.utente_id=auth.uid() and r.ruolo='socio')) or (edizione_id is not null and public.iscritto_edizione(edizione_id)))) or (visibilita='istruttori' and edizione_id is not null and public.insegna_edizione(edizione_id))) |

### Funzioni
| Riga | Nome | SECURITY DEFINER (rilevamento testuale) |
|---:|---|---|
| 32 | public.sincronizza_versamento_v12 | Non rilevato |
| 50 | public.memorizza_prezzo_corso | Presente nel segmento |
| 61 | public.verifica_dichiarazioni_domanda_v12 | Non rilevato |
| 89 | public.salva_domanda_v12 | Presente nel segmento |
| 119 | public.is_board | Presente nel segmento |
| 122 | public.allievi_del_mio_corso | Presente nel segmento |
| 173 | public.adesione_attiva_solo_con_delibera | Non rilevato |
| 202 | public.prepara_verbale_cda | Presente nel segmento |
| 227 | public.vota_verbale_cda | Presente nel segmento |
| 238 | public.finalizza_verbale_cda | Presente nel segmento |
| 259 | public.cda_anagrafiche_membri | Presente nel segmento |
| 268 | public.cda_progressi | Presente nel segmento |
| 297 | public.imposta_moduli_lezione | Presente nel segmento |
| 337 | public.cf_storici_esistenti | Presente nel segmento |
| 343 | public.conferma_importazione | Presente nel segmento |
| 391 | public.puo_generare_pdf_cda | Presente nel segmento |

### Riferimenti FK letterali (destinazione)
- Riga 138: `public.persone(id)`
- Riga 149: `auth.users(id)`
- Riga 154: `public.cda_verbali(id)`
- Riga 155: `auth.users(id)`
- Riga 156: `public.persone(id)`
- Riga 163: `public.cda_votanti(verbale_id,utente_id)`
- Riga 166: `public.cda_verbali(id)`
- Riga 167: `public.adesioni(id)`
- Riga 170: `public.cda_verbali(id)`
- Riga 285: `public.lezioni(id)`
- Riga 286: `public.moduli_didattici(id)`
- Riga 313: `auth.users(id)`
- Riga 318: `public.importazioni_batch(id)`
- Riga 329: `public.persone(id)`

### Altri costrutti sensibili
- Riga 42: create trigger
- Riga 47: enable row level security
- Riga 53: create trigger
- Riga 87: create trigger
- Riga 116: grant execute
- Riga 132: grant execute
- Riga 184: create trigger
- Riga 187: enable row level security
- Riga 188: enable row level security
- Riga 189: enable row level security
- Riga 190: enable row level security
- Riga 191: enable row level security
- Riga 257: grant execute
- Riga 266: grant execute
- Riga 276: grant execute
- Riga 290: enable row level security
- Riga 291: enable row level security
- Riga 308: grant execute
- Riga 322: enable row level security
- Riga 323: enable row level security
- Riga 334: enable row level security
- Riga 342: grant execute
- Riga 387: grant execute
- Riga 401: grant execute


## 20261116100900_precaricamento_didattica.sql
### Policy RLS esplicite
| Riga | Operazione | Policy | Tabella | Clausola |
|---:|---|---|---|---|
| — | — | — | — | Nessuna dichiarazione letterale rilevata |

### Funzioni
| Riga | Nome | SECURITY DEFINER (rilevamento testuale) |
|---:|---|---|


### Riferimenti FK letterali (destinazione)
- Nessuno rilevato

### Altri costrutti sensibili
- Nessuno rilevato


## 20261116101000_v12_riepilogo_cda_certificati.sql
### Policy RLS esplicite
| Riga | Operazione | Policy | Tabella | Clausola |
|---:|---|---|---|---|
| — | — | — | — | Nessuna dichiarazione letterale rilevata |

### Funzioni
| Riga | Nome | SECURITY DEFINER (rilevamento testuale) |
|---:|---|---|
| 3 | public.cda_report_sintetico | Presente nel segmento |
| 14 | public.cda_report_sicuro | Presente nel segmento |
| 24 | public.registra_certificato_personale | Presente nel segmento |

### Riferimenti FK letterali (destinazione)
- Nessuno rilevato

### Altri costrutti sensibili
- Riga 22: grant execute
- Riga 42: grant execute

## 20261117190000_archivio_cda_anagrafica.sql
### Policy RLS esplicite
| Riga | Operazione | Policy | Tabella | Clausola |
|---:|---|---|---|---|
| 15 | DROP POLICY IF EXISTS | cda_versioni_bozze_read | public.cda_versioni_bozze |  |
| 16 | CREATE POLICY | cda_versioni_bozze_read | public.cda_versioni_bozze | FOR SELECT TO authenticated USING(public.is_staff() OR public.is_board()) |

### Funzioni
| Riga | Nome | SECURITY DEFINER (rilevamento testuale) |
|---:|---|---|
| 20 | public.modifica_bozza_cda | Presente nel segmento |
| 54 | public.salva_domanda_v13 | Presente nel segmento |
| 84 | public.trasferisci_nascita_domanda_v13 | Presente nel segmento |

### Riferimenti FK letterali (destinazione)
- Riga 5: `public.cda_verbali(id)`
- Riga 11: `auth.users(id)`

### Altri costrutti sensibili
- Riga 14: ENABLE ROW LEVEL SECURITY
- Riga 43: GRANT EXECUTE
- Riga 80: GRANT EXECUTE
- Riga 96: CREATE TRIGGER


## 20261117201500_corsi_rimozione_quote_attive.sql
### Policy RLS esplicite
| Riga | Operazione | Policy | Tabella | Clausola |
|---:|---|---|---|---|
| 5 | DROP POLICY IF EXISTS | corsi_delete_staff | public.corsi |  |
| 6 | CREATE POLICY | corsi_delete_staff | public.corsi | FOR DELETE TO authenticated USING ((SELECT public.is_staff())) |
| 8 | DROP POLICY IF EXISTS | edizioni_delete_staff | public.edizioni_corsi |  |
| 9 | CREATE POLICY | edizioni_delete_staff | public.edizioni_corsi | FOR DELETE TO authenticated USING ((SELECT public.is_staff())) |

### Funzioni
| Riga | Nome | SECURITY DEFINER (rilevamento testuale) |
|---:|---|---|
| 13 | public.verifica_iscrizione_quota_attiva | Non rilevato |

### Riferimenti FK letterali (destinazione)
- Nessuno rilevato

### Altri costrutti sensibili
- Riga 34: CREATE TRIGGER


## 20261117210000_iscrizioni_rimozioni_ordinamento.sql
### Policy RLS esplicite
| Riga | Operazione | Policy | Tabella | Clausola |
|---:|---|---|---|---|
| — | — | — | — | Nessuna dichiarazione letterale rilevata |

### Funzioni
| Riga | Nome | SECURITY DEFINER (rilevamento testuale) |
|---:|---|---|
| 13 | public.valida_nuova_iscrizione_guidata | Non rilevato |
| 83 | public.proteggi_bozza_cda_rimossa | Non rilevato |
| 94 | public.rimuovi_record_gestionale | Presente nel segmento |
| 135 | public.rimuovi_ruolo_gestionale | Presente nel segmento |

### Riferimenti FK letterali (destinazione)
- Riga 82: `auth.users(id)`

### Altri costrutti sensibili
- Riga 4: security_invoker=true
- Riga 35: security_invoker=true
- Riga 38: security_invoker=true
- Riga 41: security_invoker=true
- Riga 44: security_invoker=true
- Riga 47: security_invoker=true
- Riga 50: security_invoker=true
- Riga 53: security_invoker=true
- Riga 56: security_invoker=true
- Riga 59: security_invoker=true
- Riga 62: security_invoker=true
- Riga 65: security_invoker=true
- Riga 68: security_invoker=true
- Riga 71: security_invoker=true
- Riga 74: security_invoker=true
- Riga 77: security_invoker=true
- Riga 91: CREATE TRIGGER
- Riga 133: GRANT EXECUTE
- Riga 148: GRANT EXECUTE


## 20261117223000_area_soci_eventi.sql
### Policy RLS esplicite
| Riga | Operazione | Policy | Tabella | Clausola |
|---:|---|---|---|---|
| 45 | CREATE POLICY | eventi_soci_lettura | public.eventi_soci | FOR SELECT TO authenticated USING(public.area_soci_accesso() OR public.area_soci_gestisce_evento(id)) |
| 46 | CREATE POLICY | eventi_soci_iscrizioni_lettura | public.eventi_soci_iscrizioni | FOR SELECT TO authenticated USING(public.area_soci_gestisce_evento(evento_id) OR (public.area_soci_accesso() AND utente_id=auth.uid())) |
| 114 | CREATE POLICY | documenti_soci_attivi | public.documenti | AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT (ambito='associazione' AND visibilita='soci') OR public.is_staff() OR public.area_soci_accesso()) |
| 115 | CREATE POLICY | documenti_soci_accesso | public.documenti | FOR SELECT TO authenticated USING (ambito='associazione' AND visibilita='soci' AND public.area_soci_accesso()) |
| 116 | CREATE POLICY | documenti_soci_pubblica_admin | public.documenti | AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT (ambito='associazione' AND visibilita='soci') OR (public.is_admin() AND utente_id IS NULL AND persona_id IS NULL AND edizione_id IS NULL AND programma_versione_id IS NULL)) |
| 117 | CREATE POLICY | documenti_soci_modifica_admin | public.documenti | AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT (ambito='associazione' AND visibilita='soci') OR public.is_admin()) WITH CHECK (NOT (ambito='associazione' AND visibilita='soci') OR (public.is_admin() AND utente_id IS NULL AND persona_id IS NULL AND edizione_id IS NULL AND programma_versione_id IS NULL)) |

### Funzioni
| Riga | Nome | SECURITY DEFINER (rilevamento testuale) |
|---:|---|---|
| 3 | public.area_soci_persona_attiva | Presente nel segmento |
| 12 | public.area_soci_miei_profili | Presente nel segmento |
| 17 | public.area_soci_accesso | Presente nel segmento |
| 40 | public.area_soci_gestisce_evento | Presente nel segmento |
| 47 | public.area_soci_posti | Presente nel segmento |
| 54 | public.area_soci_salva_evento | Presente nel segmento |
| 74 | public.area_soci_iscrivi | Presente nel segmento |
| 89 | public.area_soci_decidi | Presente nel segmento |
| 106 | public.area_soci_partecipanti | Presente nel segmento |

### Riferimenti FK letterali (destinazione)
- Riga 21: `auth.users(id)`
- Riga 29: `public.eventi_soci(id)`
- Riga 30: `public.persone(id)`
- Riga 31: `auth.users(id)`
- Riga 32: `auth.users(id)`

### Altri costrutti sensibili
- Riga 19: GRANT EXECUTE
- Riga 36: ENABLE ROW LEVEL SECURITY
- Riga 37: ENABLE ROW LEVEL SECURITY
- Riga 44: GRANT EXECUTE
- Riga 112: GRANT EXECUTE


## 20261117234500_amministrazione_account_dati.sql
### Policy RLS esplicite
| Riga | Operazione | Policy | Tabella | Clausola |
|---:|---|---|---|---|
| 161 | CREATE POLICY | listino_admin_insert_0015 | public.listino_corsi | FOR INSERT TO authenticated WITH CHECK (public.is_admin()) |
| 162 | CREATE POLICY | listino_admin_update_0015 | public.listino_corsi | FOR UPDATE TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin()) |
| 163 | CREATE POLICY | listino_admin_delete_0015 | public.listino_corsi | FOR DELETE TO authenticated USING(public.is_admin()) |
| 164 | CREATE POLICY | notifiche_admin_update_0015 | public.notifiche | FOR UPDATE TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin()) |
| 165 | CREATE POLICY | notifiche_admin_delete_0015 | public.notifiche | FOR DELETE TO authenticated USING(public.is_admin()) |
| 166 | CREATE POLICY | collegamenti_admin_delete_0015 | public.collegamenti_persone | FOR DELETE TO authenticated USING(public.is_admin()) |
| 167 | CREATE POLICY | relazioni_admin_insert_0015 | public.relazioni_tutori | FOR INSERT TO authenticated WITH CHECK(public.is_admin()) |
| 168 | CREATE POLICY | relazioni_admin_update_0015 | public.relazioni_tutori | FOR UPDATE TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin()) |
| 169 | CREATE POLICY | relazioni_admin_delete_0015 | public.relazioni_tutori | FOR DELETE TO authenticated USING(public.is_admin()) |
| 212 | CREATE POLICY | rettifiche_incassi_admin_read | public.rettifiche_incassi | FOR SELECT TO authenticated USING(public.is_admin()) |

### Funzioni
| Riga | Nome | SECURITY DEFINER (rilevamento testuale) |
|---:|---|---|
| 3 | public.account_corrente_abilitato | Presente nel segmento |
| 9 | public.is_admin | Presente nel segmento |
| 12 | public.is_staff | Presente nel segmento |
| 15 | public.is_instructor | Presente nel segmento |
| 18 | public.is_board | Presente nel segmento |
| 21 | public.owns_person | Presente nel segmento |
| 24 | public.area_soci_miei_profili | Presente nel segmento |
| 28 | public.insegna_edizione | Presente nel segmento |
| 31 | public.iscritto_edizione | Presente nel segmento |
| 35 | public.verifica_account_scrittura_0015 | Presente nel segmento |
| 54 | public.admin_elenco_account | Presente nel segmento |
| 73 | public.admin_fk_dipendenze | Presente nel segmento |
| 93 | public.proteggi_account_amministrativi | Presente nel segmento |
| 117 | public.proteggi_ruolo_admin_0015 | Presente nel segmento |
| 134 | public.assegna_ruolo_email | Presente nel segmento |
| 142 | public.collega_account_a_persona | Presente nel segmento |
| 153 | public.admin_registra_intervento_account | Presente nel segmento |
| 183 | public.admin_rimuovi_evento | Presente nel segmento |
| 213 | public.admin_rettifica_incasso | Presente nel segmento |
| 234 | public.proteggi_incasso_rettificato | Presente nel segmento |

### Riferimenti FK letterali (destinazione)
- Nessuno rilevato

### Altri costrutti sensibili
- Riga 8: GRANT EXECUTE
- Riga 49: CREATE TRIGGER
- Riga 90: GRANT EXECUTE
- Riga 116: CREATE TRIGGER
- Riga 133: CREATE TRIGGER
- Riga 159: GRANT EXECUTE
- Riga 174: security_invoker=true
- Riga 176: security_invoker=true
- Riga 200: GRANT EXECUTE
- Riga 209: ENABLE ROW LEVEL SECURITY
- Riga 232: GRANT EXECUTE
- Riga 240: CREATE TRIGGER


## 20261118001500_eliminazione_completa_account.sql
### Policy RLS esplicite
| Riga | Operazione | Policy | Tabella | Clausola |
|---:|---|---|---|---|
| 12 | CREATE POLICY | eliminazioni_account_admin_read | public.eliminazioni_account_pendenti | FOR SELECT TO authenticated USING(public.is_admin()) |

### Funzioni
| Riga | Nome | SECURITY DEFINER (rilevamento testuale) |
|---:|---|---|
| 13 | public.account_corrente_abilitato | Presente nel segmento |
| 22 | public.proteggi_eliminazione_pendente_0016 | Presente nel segmento |
| 33 | public.proteggi_collegamento_pendente_0016 | Presente nel segmento |
| 43 | public.proteggi_file_in_eliminazione_0016 | Presente nel segmento |
| 54 | public.admin_piano_eliminazione_0016 | Presente nel segmento |
| 133 | public.admin_anteprima_eliminazione_account | Presente nel segmento |
| 145 | public.admin_avvia_eliminazione_account | Presente nel segmento |
| 231 | public.admin_file_eliminazione_pendente | Presente nel segmento |
| 248 | public.admin_verifica_file_eliminazione | Presente nel segmento |
| 259 | public.admin_concludi_eliminazione_account | Presente nel segmento |

### Riferimenti FK letterali (destinazione)
- Nessuno rilevato

### Altri costrutti sensibili
- Riga 9: ENABLE ROW LEVEL SECURITY
- Riga 32: CREATE TRIGGER
- Riga 40: CREATE TRIGGER
- Riga 41: CREATE TRIGGER
- Riga 50: CREATE TRIGGER
- Riga 143: GRANT EXECUTE
- Riga 228: GRANT EXECUTE
- Riga 247: GRANT EXECUTE
- Riga 258: GRANT EXECUTE
- Riga 269: GRANT EXECUTE


## 20261118004000_fix_ambiguita_eliminazione_account.sql
### Policy RLS esplicite
| Riga | Operazione | Policy | Tabella | Clausola |
|---:|---|---|---|---|
| — | — | — | — | Nessuna dichiarazione letterale rilevata |

### Funzioni
| Riga | Nome | SECURITY DEFINER (rilevamento testuale) |
|---:|---|---|
| 5 | public.admin_piano_eliminazione_0016 | Presente nel segmento |
| 84 | public.admin_avvia_eliminazione_account | Presente nel segmento |

### Riferimenti FK letterali (destinazione)
- Nessuno rilevato

### Altri costrutti sensibili
- Riga 167: GRANT EXECUTE


## 20261118090000_comunicazioni_email.sql
### Policy RLS esplicite
| Riga | Operazione | Policy | Tabella | Clausola |
|---:|---|---|---|---|
| — | — | — | — | Nessuna dichiarazione letterale rilevata |

### Funzioni
| Riga | Nome | SECURITY DEFINER (rilevamento testuale) |
|---:|---|---|
| 3 | public.mailing_list_corso | Presente nel segmento |
| 26 | public.genera_promemoria | Presente nel segmento |

### Riferimenti FK letterali (destinazione)
- Nessuno rilevato

### Altri costrutti sensibili
- Riga 23: GRANT EXECUTE
- Riga 59: GRANT EXECUTE


## 20261125223000_patch_0019.sql
### Policy RLS esplicite
| Riga | Operazione | Policy | Tabella | Clausola |
|---:|---|---|---|---|
| 86 | create policy | scelte_lettura | public.scelte_iscrizione | for select to authenticated using(public.is_staff() or (utente_id=auth.uid() and public.account_corrente_abilitato())) |
| 111 | create policy | contatti_lettura | public.contatti_emergenza | for select to authenticated using(public.is_staff() or public.owns_person(persona_id)) |
| 112 | create policy | contatti_ins | public.contatti_emergenza | for insert to authenticated with check(public.is_staff() or public.owns_person(persona_id)) |
| 113 | create policy | contatti_upd | public.contatti_emergenza | for update to authenticated using(public.is_staff() or public.owns_person(persona_id)) with check(public.is_staff() or public.owns_person(persona_id)) |
| 201 | create policy | caricamento_medico_controllato | storage.objects | as restrictive for insert to authenticated with check (bucket_id<>'sesto-documenti' or split_part(name,'/',2)<>'certificati') |
| 213 | create policy | documento_medico_riservato | public.documenti | as restrictive for select to authenticated using(not public.documento_sanitario(id) or public.legge_certificato(id)) |
| 215 | create policy | documento_medico_titolare | public.documenti | for select to authenticated using(public.documento_sanitario(id) and public.legge_certificato(id)) |
| 220 | create policy | file_medico_solo_server | storage.objects | as restrictive for select to authenticated using(bucket_id<>'sesto-documenti' or not public.percorso_sanitario(name)) |
| 223 | create policy | percorsi_upload_personali | public.documenti | as restrictive for insert to authenticated with check(split_part(percorso_storage,'/',1)=auth.uid()::text and split_part(percorso_storage,'/',2)<>'transito') |
| 286 | create policy | bozza_iniziale | public.cda_verbali | as restrictive for insert to authenticated with check(stato='bozza' and precedente_id is null and approvato_il is null) |

### Funzioni
| Riga | Nome | SECURITY DEFINER (rilevamento testuale) |
|---:|---|---|
| 4 | public.nome_corso_normalizzato | Non rilevato |
| 18 | public.controlla_identita_corso | Non rilevato |
| 43 | public.verifica_direttore | Presente nel segmento |
| 60 | public.firma_brevetto | Presente nel segmento |
| 88 | public.scelte_alla_registrazione | Presente nel segmento |
| 114 | public.trasferisci_contatto | Presente nel segmento |
| 122 | public.scegli_immagini | Presente nel segmento |
| 132 | public.salva_domanda_v19 | Presente nel segmento |
| 162 | public.controlla_certificato | Presente nel segmento |
| 189 | public.registra_certificato_personale | Presente nel segmento |
| 204 | public.documento_sanitario | Presente nel segmento |
| 208 | public.legge_certificato | Presente nel segmento |
| 216 | public.percorso_sanitario | Presente nel segmento |
| 225 | public.proteggi_file_medico | Presente nel segmento |
| 242 | public.leggi_versione_cda | Presente nel segmento |
| 251 | public.finalizza_verbale_cda | Presente nel segmento |
| 270 | public.approva_versione_cda | Presente nel segmento |
| 281 | public.firme_verbale | Presente nel segmento |
| 287 | public.sostituisci_verbale | Presente nel segmento |
| 311 | public.registra_operazione | Presente nel segmento |
| 341 | public.cronologia_scheda | Presente nel segmento |
| 353 | public.cerca_corso_esistente | Non rilevato |
| 362 | public.iscrivi_con_contatto | Presente nel segmento |

### Riferimenti FK letterali (destinazione)
- Riga 10: `public.persone(id)`
- Riga 58: `public.edizioni_corsi(id)`
- Riga 59: `public.persone(id)`
- Riga 79: `auth.users(id)`
- Riga 104: `public.persone(id)`
- Riga 235: `public.cda_verbali(id)`
- Riga 239: `public.cda_votanti(verbale_id,utente_id)`

### Altri costrutti sensibili
- Riga 40: create trigger
- Riga 41: create trigger
- Riga 55: create trigger
- Riga 56: create trigger
- Riga 71: create trigger
- Riga 72: security_invoker=true
- Riga 83: enable row level security
- Riga 99: create trigger
- Riga 108: enable row level security
- Riga 120: create trigger
- Riga 155: revoke execute
- Riga 174: create trigger
- Riga 175: security_invoker=true
- Riga 183: security_invoker=true
- Riga 232: create trigger
- Riga 240: enable row level security
- Riga 250: revoke execute
- Riga 338: create trigger
- Riga 339: create trigger
- Riga 340: create trigger
- Riga 378: grant execute
- Riga 382: grant execute
