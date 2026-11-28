# Rifinitura grafica — 27 novembre 2026

Implementazione locale sul ramo `feature/gestionale-3.0-design-polish`, dalla fotografia del sorgente upstream `77e73c6f1a528f6c116cb06a3d75a2681eeb278e`. Il commit iniziale locale ricostruisce quella fotografia; non è un clone della cronologia remota. La richiesta «Pubblica» autorizza il rilascio: la patch viene trasferita sul ramo remoto esistente `feature/gestionale-3.0-ui-ux`, PR #6, dopo verifica dei gate. La produzione verificata è sul commit applicativo `31a626c`, da cui `77e73c6` differisce soltanto per quattro documenti. Non sono necessarie migrazioni SQL.

## Intervento

- Header blu marino con richiamo verde acqua; sidebar con icone su fondi pastello, separazione dell'intestazione e focus interno che rimane visibile nel contenitore scorrevole.
- Schede numeriche bianche, bordo superiore nel colore della sezione e icone su fondi pastello. Rimossa la decorazione a onda dalle schede numeriche per dare risalto ai valori.
- Scorciatoie su fondo bianco con accenti coerenti per sezione; l'incasso usa il verde della contabilità.
- Intestazioni delle pagine con sfondo tenue e decorazione marina più discreta.
- Tabelle con intestazioni neutre, maggiore spazio verticale e risalto della riga anche quando il focus è su un'azione al suo interno.
- Ombre condivise più leggere. Conservati i breakpoint, i controlli da almeno 44 px, i campi da 16 px e le preferenze di movimento ridotto.

Le modifiche applicative riguardano esclusivamente sette fogli CSS esistenti. Nessuna dipendenza aggiunta al progetto, né modifica a pagine, componenti, destinazioni, autorizzazioni, azioni server, database o migrazioni. Il modulo orizzontale esistente conserva il proprio layout.

## Verifiche eseguite

| Controllo | Esito |
| --- | --- |
| Suite esistenti design system, contrasti, fondazioni brand e contratti F7 | 17/17 superati |
| Parsing PostCSS dei fogli applicativi | 19/19 validi |
| Integrità sorgenti | 180 sorgenti e 753 import locali verificati |
| `git diff --check` | Superato |
| Suite statica completa, `TZ=Europe/Rome` | 282 superati; due errori per dipendenze assenti (`pdf-lib` ed `exceljs`); il file di test dell'importazione non viene caricato, quindi il totale non rappresenta tutta la suite |
| Confronto con la fotografia iniziale locale | Stessi due errori di dipendenze prima e dopo la modifica |
| Installazione completa / build / lint / typecheck | Non completati: cache incompleta e rete non disponibile; anche il controllo dell'archivio dei luoghi richiede il pacchetto Belfiore assente |
| Browser e collaudo visivo responsive | Non eseguiti: avvio HTTP locale negato dall'ambiente; apertura di file locali negata dalla policy del browser |

Il precedente gate F7 non certifica questi nuovi CSS. Il nuovo commit remoto deve superare CI e QA prima del deploy manuale sul progetto Vercel esistente. I risultati locali sopra restano distinti dalle verifiche remote. Nessun reset, modifica di configurazione o upgrade del piano è necessario.

## Anteprima

`design-preview/sesto-continente-design-preview.html` è una presentazione autonoma con quattro schermate dimostrative: panoramica, soci, corsi e modulo, con selezione della larghezza telefono. Usa i fogli CSS del progetto e markup renderizzato dai componenti condivisi; la dashboard usa il template reale con un accesso ai dati simulato soltanto nel generatore temporaneo. Nomi e numeri sono esempi, le azioni non sono operative. L'anteprima non costituisce un test dell'applicazione autenticata. Il file di consegna è separato dal codice da integrare.
