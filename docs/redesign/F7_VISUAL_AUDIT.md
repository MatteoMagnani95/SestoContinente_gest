# F7 — protocollo e registro evidenze
Stato: **candidato non collaudato**. Il commit e4fdb7f ha CI 45965395429 verde (288 statici, 70 browser ordinari, audit runtime alto/critico superato, DB verde); QA esatta 45965395638 in corso alla preparazione. Precedente d1f3900: QA 45965182094 verde, 182 autenticati, 8 skip configurati, 72 logout. Non confondere i due SHA.
Baseline funzionale congelata 302e9e9; produzione NO-GO. Non unire o pubblicare questo candidato prima del gate F6 esatto.

## Cattura
Lo script scripts/qa-local-visual.mjs estende la bozza preparata dal master definitivo §§9–10. Usa fixture e sessioni generate dall'ordinaria QA locale, verifica loopback e separa le evidenze dalle credenziali, blocca richieste remote. Nessuna azione dispositiva. Solo PNG e manifest in artifact visual-f7, retention 7 giorni; nessun mockup originale, token, password o file di sessione nell'artifact.
Il manifest registra separatamente SHA head della PR, SHA effettivo del checkout e SHA del workflow, evitando ambiguità dei merge ref GitHub. Test statici aggiunti per copertura e isolamento. 20 scenari × due browser × sette viewport = 280 controlli attesi; 80 PNG nominali a 390 e 1440, più eventuali schermate di errore. Non sono risultati finché il job non termina. Le misure di reflow, dimensione font, H1/main sono gate; conteggi target inferiori a 44 px e label mancanti sono diagnostici da ispezionare, non equivalgono a WCAG o conformità completa. Il reflow non è un test zoom browser al 200%.

## Matrice dei riferimenti (master prevalente sulle bozze)
| Mockup | Route / scenario | Requisito da confrontare sul rendering | Evidenza |
|---|---|---|---|
| 01 Dashboard | /gestionale, staff | Logo, scorciatoie, attività e Nereia | Aperta |
| 02 Elenco soci | /gestionale/soci, staff | Filtri, anagrafica, stato, tabella e azioni | Aperta |
| 03 Form anagrafico | dashboard → Nuova persona | Pannello orizzontale, gruppi logici, campi, CTA | Aperta |
| 04 Scheda socio | /gestionale/soci/[id] | Riepilogo, certificati, tab, storico | Aperta |
| 05 Gestione corsi | /gestionale/corsi | Schede disciplina, stato, staff, capienza, azioni | Aperta |
| 06 Scheda corso | /gestionale/corsi/[id]?tab=panoramica | KPI, prossime lezioni, tab, scorciatoie | Aperta |
| 07 Calendario | /gestionale/calendario-visivo, piscina e settimana | Giorni, intervalli reali, matrice corsie, legenda | Aperta |
| 08 Incassi | /gestionale/incassi | Tab quote/corsi, residui ufficiali, storico | Aperta |
| 09 Inventario | /gestionale/moduli/attrezzature | Stati, revisioni, icone, prestiti | Aperta |
| 10 Eventi | /gestione-eventi | Capienza, riservati, attesa, azioni | Aperta |
| 11 Organi sociali | /organi-sociali | Bozze, approvazioni, riservatezza | Aperta |
| 12 Archivio documenti | /documenti | File MIME, visibilità, filtri, protezioni | Aperta |
| 13 Area personale | /area-personale, socio | Profilo, certificato, quote, attività, Nereia | Aperta |
| 14 Area istruttori | /istruttore e registro presenze | Solo assegnati, assenze esplicite, tab | Aperta |
| 15 Login e registrazione | /accedi e /registrati, anonimo | Brand, campi reali, consensi, recupero | Aperta |
| 16 Mobile personale | /area-personale, 390px | Layout mobile, barra rapida, safe area | Aperta |
| Extra comunicazioni | /comunicazioni/corsi/[id] e /comunicazioni/soci/[id] | PageHeader condiviso, destinatari e azioni immutate | Aperta |

## Rilascio e limitazioni
La revisione delle 16 immagini reali, esito di ciascuna riga, audit WCAG, zoom reale 200%, dispositivi fisici e preview autorizzata non sono ancora certificati. Nessun ambiente remoto viene configurato. La preview richiede un ambiente dati di test autorizzato; non puntarla a produzione. Nessuna equivalenza pixel-perfect dichiarata. Non effettuare merge su main, promozione o deploy; al termine presentare gate, limitazioni, istruzioni di rollback e richiesta di approvazione separata.
