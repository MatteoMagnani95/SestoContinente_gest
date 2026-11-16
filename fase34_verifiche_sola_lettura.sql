-- FASE 3.4 — Verifiche preliminari SOLO LETTURA.
-- Usare prima nel progetto Supabase di test, poi confrontare con la produzione.
-- Nessuna query inserisce/modifica/cancella dati.

-- 1) Pagamenti privi del movimento contabile collegato: atteso 0.
select count(*) as pagamenti_privi_di_movimento
from public.pagamenti p
left join public.movimenti_economici m on m.pagamento_id=p.id
where m.id is null;

-- 2) Quote associative con versamenti superiori al dovuto: atteso 0.
select q.id as quota_id,q.persona_id,q.importo_dovuto,
       coalesce(sum(p.importo),0) as versato
from public.quote_associative q
left join public.pagamenti p on p.quota_id=q.id
group by q.id
having coalesce(sum(p.importo),0)>q.importo_dovuto;

-- 3) Addebiti corsi con versamenti superiori al dovuto: atteso 0.
select a.id as addebito_id,a.importo_dovuto,
       coalesce(sum(p.importo),0) as versato
from public.addebiti_corsi a
left join public.pagamenti p on p.addebito_corso_id=a.id
group by a.id
having coalesce(sum(p.importo),0)>a.importo_dovuto;

-- 4) Pagamenti collegati a persona diversa dal titolare del debito: atteso 0.
select p.id,p.persona_id,p.quota_id,p.addebito_corso_id
from public.pagamenti p
left join public.quote_associative q on q.id=p.quota_id
left join public.addebiti_corsi a on a.id=p.addebito_corso_id
left join public.iscrizioni_corsi i on i.id=a.iscrizione_id
where (p.quota_id is not null and q.persona_id is distinct from p.persona_id)
   or (p.addebito_corso_id is not null and i.persona_id is distinct from p.persona_id);

-- 5) Movimenti contabilizzati discordanti con il versamento originale: atteso 0.
select p.id as pagamento_id,p.importo as importo_pagamento,m.importo as importo_contabile,
       p.data_pagamento,m.data_movimento,m.tipo
from public.pagamenti p
join public.movimenti_economici m on m.pagamento_id=p.id
where p.importo<>m.importo or p.data_pagamento<>m.data_movimento or m.tipo<>'entrata';
