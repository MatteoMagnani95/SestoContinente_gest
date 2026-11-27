# F7 — protocollo e registro evidenze
Stato: **primo collaudo eseguito; correzioni candidate, nuova QA necessaria**. Il commit e4fdb7f ha CI 45965395429 verde (288 statici, 70 browser ordinari, audit runtime alto/critico superato, DB verde); QA esatta 45965395638 superata: 182 autenticati, 8 skip configurati, 72 logout. Gate F6 GO. Precedente d1f3900: QA 45965182094 verde, 182 autenticati, 8 skip configurati, 72 logout. Non confondere i due SHA.
Baseline funzionale congelata 302e9e9; produzione NO-GO. F6 GO; candidato F7 34f5d19 integrato. Nessun merge su main o deploy.

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

## Primo collaudo effettivo — 34f5d19, 27/11/2026
CI 45967282072 superata; QA 45967282666: tutte le verifiche funzionali precedenti allo step visuale superate (182 browser autenticati, 8 skip configurati), step visuale fallito. Artifact visual-f7 ID 15182899305, digest sha256 bf6e255f3c24f7f50a6aa2351df0eadc4ea0b5494327b1f756f90be2d77510fa; scaricato e aperto: 80 PNG e un manifest. 280 controlli effettivi, 277/280 passano le condizioni del gate. Nessun overflow globale, nessun input testato senza label, nessuna anomalia main/H1. Tre errori: registro presenze Chromium 320 e 390, WebKit 320, font di input sotto 16px. Il conteggio target piccoli include link inline, non prova una violazione WCAG né una piena conformità.
Confronto reale effettuato con il pacchetto ZIP definitivo: affiancati i 16 mockup originali alle catture Chromium 1440 (16 mobile 390), controllati anche i render di entrambi i motori per calendario e area personale/registro mobile. Evidenza non pixel-perfect; fixture sintetiche differiscono per numerosità e stati, senza modificare dati o inventare azioni.

| Mockup | Osservazione dal primo rendering reale | Valutazione |
|---|---|---|
| 01 Dashboard | Brand ufficiale, quattro scorciatoie, indicatori reali; spaziature e priorità più alte | Densità da ottimizzare |
| 02 Elenco soci | Filtri, metriche, tabella e navigazione reale; tabella più in basso | Densità da ottimizzare |
| 03 Form anagrafico | Dialog centrale ampio, gruppi logici e due colonne; nessun wizard obbligatorio per scelta già concordata | Coerente con requisito aggiornato |
| 04 Scheda socio | Identità, tab e riepiloghi reali, meno compatti | Densità da ottimizzare |
| 05 Gestione corsi | Schede disciplina/capienza; due edizioni sintetiche, griglia più larga | Griglia da compattare |
| 06 Scheda corso | Intestazione, staff e indicatori, tab; maggior altezza | Densità da ottimizzare |
| 07 Calendario | Settimana, legenda, intervalli e matrice reale in entrambi i motori; vincoli piscina espliciti | Coerente, densità da migliorare |
| 08 Incassi | Tab e filtri, alert e importi reali; maggiore altezza | Densità da ottimizzare |
| 09 Inventario | KPI e revisioni, icone e tabella; dati sintetici molto numerosi | Densità da ottimizzare |
| 10 Eventi | Scheda evento reale e contatori; unico evento sintetico | Griglia da compattare |
| 11 CdA | Tab, indicatori, votazioni senza risultati fittizi, riservatezza | Densità da ottimizzare |
| 12 Documenti | Archivio privato e tabella effettiva; niente cartelle/cestino inventati | Coerente, densità da migliorare |
| 13 Area personale | Stagione, profilo, quota, certificato, metriche e navigazione | Densità da ottimizzare |
| 14 Istruttori | Assegnazioni e tab reali; registro separato, non assenza automatica | Tre errori font mobile |
| 15 Login/registrazione | Marchio, pannelli distinti, recupero, Nereia e percorso reale | Coerente con flusso reale |
| 16 Mobile personale | Brand, logout, barra inferiore, profilo e card, nessun overflow | Densità da ottimizzare |

Correzioni candidate: 16px e target 44px per i campi del registro; header/nav/KPI/griglie meno distanziati, senza ridurre dimensione dei caratteri o CTA; screenshot attende decode dei loghi (Nereia footer non ancora caricato in una cattura WebKit), label input incluse nel gate e diagnostica campi/azioni piccoli senza esportare testi o dati. Nessuna modifica alle azioni, DB o produzione. Nuovo gate necessario. Il confronto delle immagini dopo correzione, verifica dei target autonomi, zoom nativo al 200%, dispositivi fisici e WCAG completa restano aperti.
