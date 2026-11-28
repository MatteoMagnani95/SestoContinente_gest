# Seconda migrazione 3.1 — NO-GO produzione

File generato dalla CLI Supabase 3.4.0, run 46002085520: supabase/migrations/20261127125108_course_calendar_read_snapshots.sql.
SHA-256 atteso: 552dfa8bef6b616c518a195795452e0c41bc12a04c6776b1e88c4092a36acf09 (verifica CI obbligatoria).

Due RPC additive, STABLE SECURITY INVOKER, search_path vuoto, is_staff, revoke anon/public, grant authenticated. Nessuna modifica alle tabelle, ai dati, ai trigger o alle policy. Applicare solo dopo 20261127122235_structural_read_snapshots.sql sul database sintetico locale. Il catalogo QA ora verifica nove funzioni senza DDL. Il restore confronta anche le nuove definizioni e ACL.

QA 46000064140: -44.82% sulle cinque mediane browser a 40ms artificiali, 190 browser autenticati. QA 46000824058 ha rilevato una differenza su pagina corsi obsoleta: preservare il fallback PostgREST per pagine successive vuote. Ripetere confronto ON/OFF integrale, non attenuare il test. Il 50% non è ancora raggiunto.

Attivazione esclusivamente loopback QA con tutti i flag richiesti; non applicare/attivare in produzione. Nessun deploy.
