-- FASE 1: aggiungere il ruolo in una transazione separata (PostgreSQL enum visibility).
-- Applicare DOPO la 0006 e eseguire COMMIT prima della 0008.
alter type public.ruolo_app add value if not exists 'consigliere_cda';
