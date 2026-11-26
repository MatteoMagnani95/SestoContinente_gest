# MASTER SPECIFICATION — SESTO CONTINENTE GESTIONALE 2.0
## Restyling integrale, riprogettazione UX/UI, ottimizzazione funzionale e consolidamento tecnico

Agisci come un team senior composto da:

- Software Architect;
- Senior Full Stack Developer specializzato in Next.js, React, TypeScript e Supabase;
- UX/UI Designer specializzato in applicazioni gestionali;
- Product Designer;
- Database Engineer;
- Accessibility Specialist;
- QA Engineer;
- Security Engineer.

Devi lavorare sul repository esistente:

**GitHub:** https://github.com/MatteoMagnani95/SestoContinente_gest

**Gestionale attuale:** https://sesto-continente-gest.vercel.app/

Il progetto riguarda il gestionale web dell'associazione sportiva subacquea Sesto Continente.

Non devi creare un nuovo gestionale da zero. Devi migliorare, correggere, riorganizzare e consolidare quello esistente.

Questo documento costituisce il capitolato generale della versione 2.0 e raccoglie i requisiti derivanti dall'analisi critica delle schermate del gestionale desktop e smartphone.

Non limitarti a proporre modifiche: implementale concretamente nel repository, secondo le fasi operative descritte di seguito.

---

# 1. OBIETTIVO GENERALE

Trasformare il gestionale attuale in una web application:

- Moderna.
- Professionale.
- Colorata ma adulta.
- Visivamente riconoscibile.
- Ispirata al mondo marittimo e subacqueo.
- Intuitiva anche per utenti tra i 50 e i 60 anni con scarsa familiarità digitale.
- Accessibile.
- Responsive.
- Coerente tra tutte le pagine.
- Sicura.
- Funzionalmente affidabile.

L'interfaccia attuale appare eccessivamente meccanica, burocratica e derivata direttamente dalla struttura del database.

La nuova interfaccia deve essere progettata intorno alle operazioni che l'utente deve svolgere, non intorno alle tabelle del database.

L'utente deve sempre comprendere:

1. Dove si trova.
2. Quale operazione può effettuare.
3. Quali informazioni sta visualizzando.
4. Quali dati deve inserire.
5. Quali azioni richiedono attenzione.
6. Come tornare indietro.
7. Se un'operazione è stata salvata.
8. Quali conseguenze comporta una modifica.

---

# 2. VINCOLI NON NEGOZIABILI

- Lavora sul repository esistente.
- Mantieni Next.js, TypeScript, Supabase e Vercel.
- Rispetta l'architettura effettivamente presente nel repository.
- Non riscrivere inutilmente funzionalità già funzionanti.
- Mantieni l'interfaccia completamente in italiano.
- Preserva i dati esistenti.
- Preserva le funzionalità già implementate.
- Preserva le regole associative.
- Preserva i ruoli, i permessi e le policy RLS.
- Preserva la sicurezza dei documenti privati.
- Preserva la tracciabilità delle operazioni.
- Non compromettere le funzionalità contabili.
- Non modificare arbitrariamente testi legali già approvati.
- Non cancellare dati di produzione.
- Non eliminare automaticamente presunti duplicati.
- Non esporre credenziali, chiavi private o informazioni riservate.
- Non introdurre dati fittizi nelle pagine di produzione.
- Non applicare migrazioni distruttive.
- Non pubblicare direttamente in produzione prima del collaudo.
- Non dichiarare funzionante una funzionalità che non è stata effettivamente verificata.
- Non limitare l'intervento alle pagine esplicitamente citate: estendi le regole generali a tutte le pagine del progetto.

Le funzionalità non documentate devono essere analizzate nel codice prima di essere modificate.

Eventuali modifiche sostanziali alle regole associative, contabili o autorizzative devono essere motivate e documentate.

---

# 3. FASE PRELIMINARE — ANALISI DEL REPOSITORY

Prima di apportare modifiche:

1. Analizza la struttura completa del repository.
2. Identifica il ramo attualmente utilizzato in produzione.
3. Esamina tutti i branch e le pull request rilevanti.
4. Individua le patch già predisposte ma non ancora pubblicate.
5. Verifica le migrazioni Supabase presenti e il loro ordine.
6. Esamina in particolare le patch 0019, 0020 ed eventuali successive, se effettivamente presenti.
7. Evita di sovrascrivere o perdere correzioni funzionali già implementate.
8. Identifica tutti i layout, componenti condivisi, route, server action, API e utility.
9. Analizza il modello dati, le relazioni tra tabelle, i trigger, le funzioni SQL e le policy RLS.
10. Individua tutti i punti in cui si ripetono gli stessi problemi strutturali.
11. Identifica eventuali componenti generici CRUD che producono automaticamente interfacce poco intuitive.
12. Esamina le funzionalità disponibili per amministratore, segreteria, socio, istruttore e altri eventuali ruoli.

Esamina almeno, se presenti:

- app/globals.css
- app/layout.tsx
- SiteHeader
- StaffNav
- GlobalCancelButtons
- app/gestionale
- app/gestionale/moduli
- app/gestionale/soci
- app/gestionale/corsi
- app/gestionale/richieste
- app/gestionale/incassi
- app/gestionale/calendario-visivo
- app/gestionale/programmi-didattici
- app/gestionale/economia
- app/gestionale/report
- app/gestionale/utenti
- app/gestione-eventi
- app/organi-sociali
- app/documenti
- app/accedi
- app/registrati
- Area personale
- Area istruttori
- Server actions
- Componenti dei form
- Componenti delle tabelle
- Configurazioni dei moduli
- Migrazioni Supabase

I percorsi indicati sono riferimenti iniziali: verifica la struttura effettiva prima di intervenire.

Crea un ramo dedicato, indicativamente:

`feature/gestionale-2.0-redesign`

Utilizza come base la versione più aggiornata e compatibile delle patch correttive esistenti.

Documenta la scelta della base di sviluppo.

---

# 4. DOCUMENTAZIONE E TRACCIAMENTO DEL PROGETTO

Crea una cartella:

`docs/redesign/`

Contenente:

- MASTER_SPEC.md
- DESIGN_SYSTEM.md
- PAGE_REQUIREMENTS.md
- FUNCTIONAL_FIXES.md
- IMPLEMENTATION_TRACKER.md
- TEST_PLAN.md
- CHANGELOG.md
- RELEASE_NOTES.md

Salva questo capitolato in MASTER_SPEC.md.

Assegna un identificativo univoco a ogni requisito.

Per ciascun requisito registra:

- Descrizione.
- Pagina o componente interessato.
- Priorità.
- Dipendenze.
- Stato di implementazione.
- Commit di riferimento.
- Test associato.
- Criterio di accettazione.
- Eventuali limitazioni.

Stati ammessi:

- Da analizzare.
- Da implementare.
- In lavorazione.
- Implementato.
- Verificato.
- Bloccato.

Non contrassegnare un requisito come verificato senza un controllo effettivo.

---

# 5. DESIGN SYSTEM COMPLETO

Realizza un design system centralizzato, riutilizzabile e coerente.

## 5.1 Identità visiva

Mantieni un'identità marittima, moderna e professionale.

Palette principale proposta:

- Blu profondo: #102B39
- Verde petrolio: #087E83
- Blu oceano: #3679B8
- Verde acqua: #65C9BE
- Bianco perla: #F3F7F8
- Bianco: #FFFFFF
- Testo principale: blu marino scuro.
- Testo secondario: grigio ardesia.

Verifica i contrasti prima di utilizzare i colori per testi e controlli.

Introduci colori identificativi delle macroaree:

- Segreteria: petrolio.
- Corsi e didattica: blu oceano.
- Calendario: viola tenue.
- Attrezzature: ocra.
- Contabilità: verde.
- Documenti e sistema: grigio ardesia.

Utilizza questi colori con moderazione, soprattutto per icone, intestazioni, elementi identificativi e sfondi leggeri.

Non utilizzare un colore diverso arbitrariamente per ogni pulsante.

## 5.2 Colori degli stati

Definisci uno standard semantico:

- Verde: valido, attivo, approvato, pagato, completato.
- Arancione: imminente, da verificare, da perfezionare.
- Rosso: scaduto, respinto, errore, situazione bloccante.
- Blu: programmato, informativo, in corso.
- Grigio: archiviato, annullato, non applicabile.

Accompagna sempre i colori con testo o icone comprensibili.

Non affidare informazioni importanti esclusivamente al colore.

## 5.3 Tipografia

Elimina l'aspetto eccessivamente editoriale dei titoli delle pagine amministrative.

Valuta un carattere moderno e leggibile come Inter o Manrope, compatibilmente con le font già disponibili e le prestazioni.

Utilizza prevalentemente una famiglia sans-serif nell'area amministrativa.

Eventualmente conserva un carattere più espressivo nella homepage pubblica, senza compromettere la leggibilità.

Dimensioni desktop indicative:

- Titolo pagina: 28–34 px.
- Titolo sezione: 20–24 px.
- Testo ordinario: 15–16 px.
- Testo secondario: 13–14 px.

Dimensioni mobile indicative:

- Titolo pagina: 26–30 px.
- Titolo sezione: 20–22 px.
- Testo ordinario: 16 px.
- Testo secondario: 14 px.

Non utilizzare titoli enormi che occupano una parte significativa dello schermo.

Evita l'utilizzo eccessivo del maiuscolo.

## 5.4 Componenti condivisi

Crea o consolida componenti riutilizzabili per:

- AppShell.
- Sidebar.
- Header.
- PageHeader.
- Breadcrumb.
- BackButton.
- SectionHeader.
- MetricCard.
- StatusBadge.
- Alert.
- DataTable.
- SearchBar.
- FilterBar.
- Pagination.
- EmptyState.
- LoadingState.
- ErrorState.
- FormField.
- FormSection.
- FormActions.
- Modal.
- Drawer.
- ConfirmDialog.
- UnsavedChangesGuard.
- Tabs.
- FileUploader.
- Timeline.
- NotificationCenter.
- ActionMenu.

I nomi sono indicativi. Riutilizza i componenti esistenti quando possibile.

Centralizza colori, spaziature, tipografia, bordi e dimensioni mediante design token o convenzioni CSS equivalenti.

Evita duplicazioni e regole CSS specifiche non necessarie.

## 5.5 Spaziature e gerarchia

- Riduci gli spazi bianchi inutilizzati.
- Mantieni margini coerenti.
- Riduci la quantità di riquadri annidati.
- Evita card enormi contenenti pochissime informazioni.
- Evita card che si toccano senza separazione.
- Distribuisci razionalmente i contenuti.
- Rendi immediatamente riconoscibile l'azione principale.
- Utilizza ombre leggere e bordi sobri.
- Evita un'estetica infantile, eccessivamente decorativa o dispersiva.

---

# 6. ARCHITETTURA GLOBALE DELL'INTERFACCIA

## 6.1 Menu laterale desktop

Il menu laterale deve essere presente in tutte le pagine amministrative.

Attualmente alcune pagine, come Eventi soci, Organi sociali e Documenti, perdono il menu quando vengono aperte.

Correggi questo problema a livello strutturale, utilizzando un layout amministrativo condiviso.

Preserva gli URL esistenti oppure gestisci correttamente eventuali redirect.

Non imporre il menu amministrativo alle pagine pubbliche o agli utenti privi dei relativi permessi.

Organizza il menu in macroaree espandibili:

- Panoramica.
- Soci e segreteria.
- Corsi e didattica.
- Impianti e calendario.
- Attrezzature.
- Contabilità.
- Organi sociali.
- Eventi e comunicazioni.
- Documenti.
- Scadenze e notifiche.
- Impostazioni e amministrazione del sistema.

Riorganizza tutte le voci esistenti senza eliminare funzionalità.

Le funzionalità avanzate o tecniche devono essere accessibili da sezioni secondarie, evitando di sovraccaricare la navigazione principale.

Utilizza icone uniformi accompagnate da etichette testuali.

Consenti di espandere e comprimere le macroaree.

Mantieni aperta la macroarea della pagina attualmente visualizzata.

La sidebar deve essere stabile e avere uno scorrimento indipendente quando necessario.

## 6.2 Evidenziazione della pagina corrente

Requisito obbligatorio.

Quando l'utente si trova in una pagina, la relativa voce del menu deve risultare chiaramente selezionata.

Utilizza:

- Sfondo leggermente colorato.
- Testo evidenziato.
- Indicatore laterale.
- Icona coerente.

L'evidenziazione deve essere permanente durante la navigazione, non dipendere dal semplice hover o focus.

Deve funzionare anche:

- Nelle sottopagine.
- Nelle schede individuali.
- Nei moduli di modifica.
- Nelle pagine raggiunte tramite collegamenti diretti.
- Dopo il refresh.
- Nelle route dinamiche.

Utilizza aria-current ove appropriato.

## 6.3 Barra superiore

Riprogetta la barra superiore.

Inserisci:

- Logo e identità dell'associazione.
- Indicazione dell'area corrente.
- Eventuale ricerca globale realmente funzionante.
- Notifiche, se supportate.
- Menu dell'account.
- Accesso alle funzionalità autorizzate.
- Disconnessione.

Evita di mostrare contemporaneamente voci irrilevanti per il ruolo dell'utente.

Distingui chiaramente:

- Area pubblica.
- Area socio.
- Area istruttore.
- Area amministrativa.

Gli utenti con più ruoli devono poter passare alle aree autorizzate senza ambiguità.

## 6.4 Breadcrumb

Introduci un percorso di navigazione coerente.

Esempio:

Gestionale / Corsi / ARA 1 febbraio 2027 / Allievi

Utilizza denominazioni comprensibili, non URL tecnici.

## 6.5 Torna indietro

Requisito obbligatorio richiesto espressamente.

Ogni pagina interna raggiungibile dalla navigazione deve offrire un'azione «Torna indietro», visibile e collocata in una posizione uniforme.

Nelle pagine di dettaglio preferisci, quando possibile, una destinazione esplicita:

- Torna ai soci.
- Torna ai corsi.
- Torna alle domande.
- Torna ai documenti.
- Torna al calendario.

Il comportamento deve essere prevedibile anche quando una pagina viene aperta direttamente.

Prevedi una destinazione interna sicura di fallback.

Preserva filtri, pagina selezionata, ricerca e contesto precedente quando possibile, anche tramite query parameter.

Non utilizzare indiscriminatamente la cronologia del browser.

## 6.6 Modifiche non salvate

Implementa una protezione globale delle modifiche non salvate.

Se l'utente ha effettivamente modificato un modulo e tenta di:

- Cambiare pagina.
- Tornare indietro.
- Chiudere un pannello.
- Cambiare sezione.
- Ricaricare la pagina.
- Abbandonare la pagina.

Mostra, ove tecnicamente possibile, un avviso:

«Hai effettuato modifiche che non sono ancora state salvate. Vuoi uscire senza salvarle?»

Azioni:

- Continua a modificare.
- Esci senza salvare.

Eventualmente consenti «Salva e continua» soltanto se l'operazione è supportata correttamente.

Il controllo deve attivarsi solo in presenza di modifiche reali.

Non mostrare avvisi inutili se il modulo non è stato modificato.

Distingui «Annulla», che chiude o ripristina un modulo, da «Torna indietro», che rappresenta una navigazione.

Per refresh e chiusura del browser utilizza i meccanismi nativi compatibili.

---

# 7. TABELLE, INSERIMENTO E MODIFICA DEI DATI

## 7.1 Eliminare i form dentro le celle

Questo rappresenta uno dei problemi più gravi osservati negli screenshot.

Attualmente, cliccando «Modifica», il modulo compare direttamente all'interno della colonna Azioni della tabella.

La riga diventa altissima, le altre celle risultano verticalmente disallineate e si generano enormi spazi bianchi.

Il problema è presente in numerose pagine:

- Piscine.
- Programmi didattici.
- Documenti.
- Contabilità.
- Inventario.
- Revisioni.
- Consegne.
- Iscrizioni.
- Incassi.
- Altri moduli generici.

Elimina sistematicamente questo comportamento.

Utilizza:

- Drawer laterale su desktop per modifiche semplici.
- Finestra modale per operazioni brevi.
- Pagina dedicata per operazioni complesse.
- Pannello a tutto schermo su smartphone.
- Eventualmente una riga espandibile a larghezza completa soltanto per dettagli di sola lettura.

Non utilizzare mai una singola cella per ospitare un form complesso.

## 7.2 Tabelle

Le tabelle devono essere compatte, leggibili e realmente utilizzabili.

Introduci ove pertinente:

- Ricerca.
- Filtri.
- Ordinamento.
- Paginazione.
- Conteggio complessivo.
- Intestazioni chiare.
- Stati evidenziati.
- Azioni distanziate correttamente.
- Collegamento diretto alla scheda.
- Esportazione.
- Allineamento coerente degli importi.
- Visualizzazione delle colonne essenziali.

Evita che azioni differenti appaiano attaccate, come:

- «Saldo completoModifica».
- «SchedaModifica iscrizione».

Non troncare dati importanti senza consentirne la consultazione.

Su mobile, trasforma le tabelle operative in schede verticali dove opportuno.

Per matrici e tabelle che richiedono necessariamente una struttura bidimensionale, consenti uno scorrimento localizzato.

## 7.3 Terminologia

Elimina sistematicamente le diciture tecniche rivolte agli sviluppatori.

Non mostrare più:

- Aggiungi nuovo record.
- Inserisci nuovo record.
- Nuovo record.
- Cerca nel campo principale.
- Crea nuovo.
- Fase 3.2.
- Fase 3.3.
- Fase 3.4.
- Nomi delle tabelle SQL.
- Nomi delle foreign key.
- Identificativi tecnici come titolo principale.

Sostituiscile con azioni contestuali.

Esempi:

| Attuale | Sostituzione |
|---|---|
| Aggiungi nuovo record | Aggiungi attrezzatura |
| Aggiungi nuovo record | Registra revisione |
| Aggiungi nuovo record | Registra consegna |
| Aggiungi nuovo record | Registra movimento contabile |
| Aggiungi nuovo record | Aggiungi piscina |
| Aggiungi nuovo record | Aggiungi corsia |
| Aggiungi nuovo record | Registra certificato medico |
| Aggiungi nuovo record | Registra tesseramento |
| Aggiungi nuovo record | Registra brevetto |
| Aggiungi nuovo record | Aggiungi socio |
| Crea nuovo | Salva la specifica entità |
| Cerca nel campo principale | Cerca per nome, codice o criterio pertinente |
| Visualizza dati collegati | Visualizza documenti, prestiti o altre relazioni pertinenti |

Applica queste correzioni a tutte le pagine, anche quelle non analizzate direttamente.

## 7.4 Moduli di compilazione

- Mostra il modulo soltanto quando richiesto.
- Raggruppa i campi per significato.
- Mantieni etichette chiare e persistenti.
- Distingui campi obbligatori e facoltativi.
- Utilizza selettori ricercabili per elenchi lunghi.
- Usa controlli coerenti per date, orari e importi.
- Mostra errori vicino al campo interessato.
- Mantieni i dati digitati in caso di errore.
- Evita valori preselezionati rischiosi.
- Evita riquadri fieldset dall'aspetto HTML non stilizzato, preservandone la semantica.
- Mantieni visibile un focus da tastiera accessibile e graficamente coerente.
- Utilizza layout a due colonne su desktop soltanto quando opportuno.
- Utilizza una colonna su mobile.
- Mostra azioni finali coerenti.
- Blocca invii multipli durante il salvataggio.

## 7.5 Feedback delle operazioni

Dopo ogni operazione mostra un messaggio comprensibile.

Esempi:

- Attrezzatura aggiunta correttamente.
- Modifiche al corso salvate.
- Versamento registrato.
- Documento caricato.
- Impossibile salvare: verifica i campi evidenziati.
- La corsia è già occupata nell'orario selezionato.

Non mostrare errori SQL grezzi all'utente finale.

Non dichiarare riuscita un'operazione prima della conferma del server.

## 7.6 Eliminazioni

Le azioni distruttive devono essere separate dalle operazioni ordinarie.

Utilizza etichette specifiche:

- Elimina attrezzatura.
- Archivia corso.
- Annulla iscrizione.
- Revoca ruolo.
- Rettifica movimento.

Non utilizzare indiscriminatamente «Rimuovi».

Mostra una conferma che identifichi l'entità e le conseguenze effettive.

Preserva le regole di conservazione e audit già previste.

Non eliminare record collegati senza verificare le dipendenze.

---

# 8. HOMEPAGE

Riprogetta la homepage pubblica mantenendo l'identità associativa.

Problemi da correggere:

- Eccessivo spazio bianco.
- Titolo sproporzionato.
- Interfaccia poco caratterizzata.
- Informazioni ripetute.
- Navigazione non contestualizzata all'autenticazione.
- Azioni di registrazione mostrate anche a utenti già autenticati.

Prevedi:

- Logo dell'associazione.
- Eventuale fotografia subacquea autentica, se disponibile e autorizzata.
- Titolo più equilibrato.
- Breve descrizione delle funzionalità.
- Accesso intuitivo alla registrazione.
- Accesso intuitivo al login.
- Procedimento di adesione illustrato mediante quattro passaggi.
- Footer semplice.

Per gli utenti non autenticati:

- Accedi.
- Richiedi adesione.

Per gli utenti autenticati:

- Vai alla mia area personale.
- Accedi al gestionale, se autorizzato.
- Accedi all'area istruttori, se autorizzato.

Non utilizzare immagini generiche o decorative che compromettono prestazioni e leggibilità.

Non confondere creazione dell'account e approvazione dell'adesione associativa.

---

# 9. ACCESSO E AUTENTICAZIONE

Migliora la pagina Accedi.

- Riduci gli elementi di navigazione non pertinenti.
- Mantieni un modulo semplice e centrato.
- Mostra un pulsante per visualizzare o nascondere la password.
- Migliora la compilazione automatica delle credenziali.
- Gestisci correttamente password contenenti spazi.
- Non modificare o normalizzare arbitrariamente le password.
- Rendi il recupero della password chiaramente identificabile.
- Mostra gli errori in italiano.
- Mostra lo stato di caricamento.
- Evita invii multipli.
- Gestisci correttamente gli utenti già autenticati.
- Gestisci email non verificate.
- Gestisci sessioni scadute.
- Rispetta eventuali redirect interni autorizzati.
- Non introdurre redirect aperti.
- Inserisci «Torna alla home».

Verifica separatamente registrazione, verifica email, login, logout e recupero password.

---

# 10. REGISTRAZIONE, PRIVACY E CONSENSI

Riprogetta il modulo di registrazione.

Il titolo deve essere esplicito:

«Crea il tuo account».

Rendi comprensibili le fasi:

1. Creazione account.
2. Verifica email.
3. Compilazione domanda di adesione.
4. Verifica associativa.

Mantieni i campi necessari, semplificandone il layout.

## 10.1 Dichiarazioni

Raggruppa le dichiarazioni in un'unica sezione:

«Privacy e dichiarazioni».

Non mostrare l'autorizzazione alle fotografie in un grande riquadro isolato.

Prevedi una casella per la presa visione dell'informativa privacy.

Mantieni eventuali altre dichiarazioni obbligatorie già previste.

Inserisci il collegamento ai documenti ufficiali.

## 10.2 Foto e video

Sostituisci i due radio button «Autorizzo» e «Non autorizzo» con una sola casella di spunta.

Testo indicativo:

«Autorizzo l'utilizzo di foto e video per promuovere le attività dell'associazione e per la pubblicazione sui suoi profili social ufficiali.»

Utilizza il testo ufficialmente approvato, se disponibile.

Il consenso deve:

- Essere separato dalle dichiarazioni obbligatorie.
- Essere facoltativo.
- Non impedire la registrazione o l'adesione.
- Essere inizialmente non selezionato.
- Essere espresso tramite azione positiva dell'utente.
- Essere revocabile.

La richiesta originaria prevedeva una preselezione. Non implementarla, perché incompatibile con l'acquisizione di un consenso valido basato su una scelta attiva.

Riferimento: Regolamento UE 2016/679, considerando 32 e articolo 7.

Mantieni la tracciabilità della dichiarazione:

- Versione dell'informativa.
- Data e ora.
- Origine.
- Stato.
- Eventuale revoca.
- Eventuale rappresentante autorizzato per minori, secondo le regole esistenti.

Distingui:

- Consenso acquisito.
- Consenso non prestato.
- Consenso revocato.
- Consenso storico non acquisito.

Non convertire automaticamente un dato storico mancante in un consenso positivo.

Non confondere la presa visione dell'informativa con il consenso a uno specifico trattamento.

## 10.3 Ambiente di prova

Attualmente compaiono diciture come:

- TEST-COLLAUDO-1.
- Simulo la presa visione.
- Simulazione foto e video.

Mantieni queste diciture esclusivamente nei contesti di collaudo appropriati.

Non eliminare le protezioni della modalità test semplicemente nascondendo gli avvisi.

Prima della produzione verifica la disponibilità dei documenti e dei testi ufficiali.

In assenza dei documenti approvati, segnala un blocco al rilascio delle funzionalità interessate.

---

# 11. DASHBOARD AMMINISTRATIVA

Trasforma la pagina iniziale del gestionale in un centro operativo.

Problemi attuali:

- Indicatori tutti identici.
- Disposizione irregolare delle card.
- Scarso utilizzo del colore.
- Assenza di priorità operative.
- Azioni rapide poco organizzate.
- Prossime lezioni mostrate come semplice testo.
- Informazioni che non consentono di raggiungere direttamente le relative funzionalità.

La dashboard deve mostrare, compatibilmente con i dati e i permessi disponibili:

- Domande di adesione da gestire.
- Adesioni attive.
- Corsi attivi.
- Allievi iscritti.
- Revisioni imminenti.
- Certificati in scadenza.
- Quote da incassare.
- Prossime lezioni.
- Eventi imminenti.
- Attività amministrative in sospeso.

Utilizza card con icona, valore, titolo e collegamento contestuale.

Ogni card operativa deve aprire una vista coerentemente filtrata.

Organizza la dashboard in:

- Panoramica.
- Attività da gestire.
- Azioni rapide.
- Prossimi appuntamenti.
- Scadenze.
- Eventuale riepilogo economico, solo per utenti autorizzati.

Azioni rapide:

- Cerca socio.
- Esamina domande.
- Crea corso.
- Programma lezione.
- Registra incasso.
- Registra consegna.
- Consulta calendario.
- Consulta scadenze.

Non mostrare numeri inventati o conteggi incompleti come totali certi.

---

# 12. DOMANDE DI ADESIONE — ELENCO

Mantieni la pagina all'interno del layout amministrativo.

Introduci:

- Ricerca per nominativo e riferimento.
- Filtri per stato.
- Filtri temporali.
- Ordinamento.
- Paginazione reale.
- Conteggi per stato.
- Azioni contestuali.
- Evidenziazione della voce attiva nella sidebar.

Stati:

- Da verificare.
- In verifica.
- Integrazione richiesta.
- Approvata.
- Respinta.

Preserva gli stati effettivamente previsti dal modello dati.

Elimina il limite operativo delle prime 100 domande, sostituendolo con una ricerca e una paginazione lato server.

Rendi immediatamente riconoscibili le domande che richiedono un'azione.

Mostra il riferimento della pratica come informazione secondaria, non come elemento dominante.

---

# 13. DETTAGLIO DOMANDA DI ADESIONE

Riprogetta la scheda della pratica.

Organizzala in sezioni:

- Riepilogo.
- Dati anagrafici.
- Residenza.
- Recapiti.
- Tutore o rappresentante, quando applicabile.
- Documenti.
- Dichiarazioni e consensi.
- Comunicazioni.
- Cronologia.
- Gestione della pratica.

Mantieni una visualizzazione leggibile dei dati, evitando una lista unica eccessivamente lunga.

Rendi lo stato della domanda immediatamente riconoscibile.

Raggruppa le dichiarazioni privacy e fotografie.

Mostra chiaramente lo stato e la versione delle dichiarazioni.

Rimuovi il campo codice catastale dall'interfaccia della domanda di adesione, preservando eventuali dati tecnici necessari ai calcoli esistenti.

Non rimuovere automaticamente il codice fiscale.

Trasforma lo storico in una timeline leggibile, preservando tutti gli eventi di audit.

Le azioni di gestione devono dipendere dallo stato della pratica e dai permessi dell'operatore.

Esempi:

- Prendi in carico.
- Richiedi integrazione.
- Approva.
- Respingi.
- Prepara email di benvenuto.
- Apri scheda socio.

Non nascondere azioni operative importanti all'interno di un generico «Gestisci pratica».

Se una pratica è già approvata, mostra chiaramente le operazioni ancora disponibili.

Distingui l'approvazione della domanda dall'effettiva posizione associativa e dal pagamento della quota.

Proteggi le domande storiche e le operazioni di eliminazione.

---

# 14. SOCI E ALLIEVI

Riprogetta la pagina elenco.

Prevedi:

- Ricerca per nome, cognome e codice fiscale.
- Filtri per stagione.
- Filtri per stato associativo.
- Eventuali filtri per ruolo o attività, se supportati.
- Paginazione.
- Conteggio dei risultati.
- Ordinamento.
- Accesso diretto alla scheda.
- Stati leggibili e coerenti.

Evita nominativi tutti in maiuscolo quando non necessario, preservando il valore anagrafico originale.

Non confondere socio, allievo, istruttore e account di accesso.

Mostra chiaramente eventuali dati mancanti.

Su smartphone utilizza schede compatte, evitando di comprimere tutte le colonne desktop.

---

# 15. SCHEDA UNIFICATA DEL SOCIO

La scheda del socio deve diventare il punto centrale di consultazione della persona.

Intestazione:

- Nome e cognome.
- Stato associativo.
- Stagione.
- Recapiti principali.
- Azioni autorizzate.
- Torna all'elenco.

Riepilogo:

- Adesione.
- Corsi frequentati.
- Quote da versare.
- Certificato medico.
- Eventuali segnalazioni rilevanti.

Realizza vere sezioni navigabili:

- Panoramica.
- Anagrafica e recapiti.
- Adesioni e dichiarazioni.
- Tesseramenti.
- Corsi.
- Pagamenti.
- Certificati.
- Brevetti.
- Documenti.
- Qualifiche istruttore.
- Attrezzature.
- Famiglia e collegamenti.
- Cronologia.

Le sezioni devono essere vere tab o viste dedicate, non semplici collegamenti che costringono a scorrere una pagina interminabile.

Evidenzia la sezione attiva.

Mostra il contatto di emergenza all'interno delle informazioni personali pertinenti.

Mostra la scelta relativa a foto e video nella sezione Adesioni e dichiarazioni, non come grande blocco isolato.

Distingui informazioni mancanti e informazioni non applicabili.

Mostra azioni contestuali:

- Modifica anagrafica.
- Registra pagamento.
- Registra certificato.
- Iscrivi a un corso.
- Visualizza documenti.
- Scrivi al socio.

Mostra soltanto le azioni autorizzate.

---

# 16. EVENTI SOCI

Mantieni la sidebar amministrativa nella pagina gestione eventi.

Riprogetta l'elenco degli eventi mediante card compatte o tabelle operative.

Ogni evento deve mostrare:

- Titolo.
- Tipologia, se disponibile.
- Luogo.
- Data e orario.
- Costo.
- Capienza.
- Posti occupati.
- Posti disponibili.
- Stato.
- Richieste in attesa.

Visualizza la capienza in modo intuitivo, ad esempio mediante una barra di occupazione.

Introduci filtri:

- Prossimi eventi.
- Eventi passati.
- Aperti.
- Chiusi.
- Annullati.
- Richieste da gestire.

Sostituisci i grandi moduli espandibili con un pulsante:

«Nuovo evento».

L'apertura deve mostrare un modulo dedicato.

Separa:

- Informazioni dell'evento.
- Iscrizioni.
- Approvazioni.
- Eventuali pagamenti.
- Comunicazioni.

Mantieni le regole di assegnazione dei posti già previste.

Verifica la gestione concorrente delle ultime disponibilità.

Non consentire sovraprenotazioni causate da richieste simultanee.

---

# 17. INCASSI E SALDI

Riprogetta completamente questa pagina.

Attualmente ogni riga può contenere un intero modulo di registrazione del versamento, causando tabelle enormi.

Elimina tutti i form di registrazione permanente all'interno delle righe.

Mostra in alto:

- Totale dovuto.
- Totale incassato.
- Residuo complessivo.
- Posizioni saldate.
- Posizioni da saldare.

Distingui quote associative e quote corsi.

Introduci filtri:

- Stagione.
- Socio.
- Tipologia.
- Stato del pagamento.
- Periodo.
- Scadenza.

Tabella:

- Socio.
- Scadenza.
- Importo dovuto.
- Importo versato.
- Residuo.
- Stato.
- Azioni.

Azioni:

- Registra versamento.
- Visualizza versamenti.
- Gestisci quota.
- Rettifica, quando autorizzata.

«Registra versamento» deve aprire un modulo dedicato contenente:

- Socio.
- Causale.
- Importo dovuto.
- Residuo.
- Importo del versamento.
- Data.
- Modalità di pagamento.
- Riferimento.
- Note.
- Conferma dell'effettiva ricezione del pagamento.

Mostra un riepilogo dell'operazione prima della conferma definitiva.

Preserva la contabilizzazione automatica.

Verifica:

- Pagamenti parziali.
- Saldi completi.
- Doppio clic.
- Invii simultanei.
- Rettifiche.
- Coerenza con il rendiconto economico.
- Coerenza con le quote.
- Coerenza con la scheda socio.
- Stagione corretta.
- Eventuali eccedenze, secondo le regole esistenti.

Non introdurre modifiche dirette ai movimenti contabilizzati se devono essere rettificati tramite procedure dedicate.

Mantieni uno storico dei versamenti.

Distingui chiaramente l'elenco recente dallo storico completo.

---

# 18. GESTIONE CORSI — ELENCO

Mantieni l'organizzazione per corso ed edizione.

Rendi più intuitiva la scelta del corso prima di accedere alle iscrizioni.

Prevedi:

- Ricerca.
- Filtro disciplina.
- Filtro livello.
- Filtro stagione.
- Filtro stato.
- Ordinamento.
- Paginazione.
- Pulsante «Nuovo corso» o «Nuova edizione del corso», secondo l'operazione effettiva.

Mostra:

- Nome dell'edizione.
- Disciplina.
- Livello.
- Periodo.
- Direttore.
- Iscritti.
- Capienza.
- Stato.

Visualizza iscritti e capienza in forma sintetica:

«1 / 10 iscritti».

Distingui le edizioni attive, programmate, concluse e annullate.

Le edizioni annullate devono essere facilmente identificabili e consultabili senza confonderle con i corsi operativi.

## 18.1 Duplicati

Sono state osservate edizioni aventi lo stesso nome, stagione e periodo, di cui una annullata.

Verifica la presenza effettiva di duplicati.

Distingui i duplicati dai corsi legittimamente distinti e dagli annullamenti storici.

Definisci una regola di unicità coerente con il modello dati.

Proteggi creazione e aggiornamento mediante controlli lato server e database, ove appropriato.

Non affidarti unicamente a un controllo client.

Non cancellare automaticamente i duplicati storici.

Fornisci una modalità controllata di verifica e risoluzione.

---

# 19. SCHEDA DEL CORSO

La pagina attuale è eccessivamente lunga e contiene tutte le funzionalità una sotto l'altra.

Trasformala in una scheda operativa strutturata.

Intestazione:

- Nome corso.
- Disciplina.
- Livello.
- Stagione.
- Periodo.
- Stato.
- Direttore.
- Azioni principali.
- Torna ai corsi.

Riepilogo:

- Iscritti/capienza.
- Richieste in attesa.
- Istruttori.
- Lezioni.
- Eventuali elementi mancanti.

Sezioni navigabili:

1. Panoramica.
2. Configurazione.
3. Direttore e istruttori.
4. Allievi.
5. Programma didattico.
6. Lezioni.
7. Presenze.
8. Brevetti, se previsti.
9. Documenti e stampe.
10. Cronologia.

Le tab devono mostrare la sezione pertinente, non costringere l'utente a scorrere tutta la pagina.

Mantieni il contesto del corso visibile.

Sposta le azioni avanzate in posizioni coerenti, evitando passaggi ridondanti tra interfacce generiche.

## 19.1 Configurazione

Raggruppa logicamente:

- Nome.
- Disciplina.
- Livello.
- Stagione.
- Data di inizio.
- Data di fine.
- Capienza.
- Stato.
- Costo.
- Note.

Non mostrare stagione e periodo come un unico campo ambiguo.

Distingui i dati modificabili da quelli di sola lettura.

Usa date in formato italiano.

Non consentire una capienza incompatibile con le iscrizioni confermate.

## 19.2 Direttore del corso

Il direttore deve essere chiaramente identificato nella scheda.

È il responsabile del corso e del rilascio del brevetto, secondo le regole associative.

Deve esserci un solo direttore per edizione.

Verifica che non venga contemporaneamente iscritto come allievo della stessa edizione.

Applica il controllo a tutti i percorsi di inserimento e modifica, anche lato server.

Evita discrepanze tra direttore e responsabile eventualmente presenti in altre tabelle.

Mostra una segnalazione quando manca il direttore.

Non modificare arbitrariamente le regole di abilitazione al rilascio dei brevetti.

## 19.3 Istruttori e aiuto-istruttori

Raggruppa il personale didattico.

Mostra:

- Nominativo.
- Ruolo.
- Qualifiche.
- Eventuale validità delle abilitazioni.
- Azioni.

Utilizza un selettore ricercabile.

Non suggerire che una qualifica generica equivalga automaticamente all'abilitazione richiesta per una specifica disciplina.

Gestisci le assegnazioni secondo le regole effettive.

## 19.4 Allievi e iscrizioni

Mostra una tabella compatta.

Colonne pertinenti:

- Allievo.
- Stato iscrizione.
- Adesione.
- Tesseramento.
- Certificato medico.
- Contatto di emergenza.
- Azioni.

Distingui chiaramente i requisiti amministrativi mancanti.

Negli screenshot compare un allievo già iscritto ma indicato come non iscrivibile.

Verifica se si tratta di:

- Dati storici.
- Requisiti successivamente decaduti.
- Stato associativo non aggiornato.
- Errore nella logica di validazione.

Non modificare arbitrariamente le iscrizioni esistenti.

Mostra separatamente lo stato storico dell'iscrizione e l'idoneità amministrativa corrente.

Introduci un pulsante «Iscrivi allievo».

Il modulo deve consentire di:

- Cercare la persona.
- Consultarne i requisiti.
- Visualizzare eventuali motivi di non iscrivibilità.
- Inserire o aggiornare il contatto di emergenza.
- Confermare l'iscrizione.

Non sovrascrivere contatti di emergenza esistenti con campi vuoti.

Mostra il contatto già registrato, se accessibile.

Verifica capienza, duplicati e concorrenza.

## 19.5 Programma didattico

Mostra il programma associato.

Consenti la selezione delle versioni approvate compatibili.

Preserva l'immutabilità delle versioni approvate.

Consenti di consultare i moduli, gli esercizi e i materiali direttamente dalla scheda del corso.

Non obbligare l'utente a passare attraverso interfacce tecniche non necessarie.

## 19.6 Lezioni

Mostra l'elenco delle lezioni programmate.

Pulsante «Nuova lezione».

Il modulo deve consentire:

- Titolo.
- Tipologia.
- Data.
- Ora di inizio.
- Ora di fine.
- Piscina, se applicabile.
- Corsie.
- Esercizi.
- Moduli didattici.
- Materiale necessario.
- Eventuali istruttori, se supportati.

Mostra i campi della piscina e delle corsie soltanto quando pertinenti.

Distingui la creazione di una lezione teorica dalla creazione di una lezione con prenotazione di corsie.

Usa etichette dinamiche coerenti con l'operazione.

Preserva le transazioni atomiche per lezioni e prenotazioni.

Verifica conflitti, validità temporale e fuso Europe/Rome.

## 19.7 Presenze

Realizza un registro intuitivo.

Selezione della lezione e visualizzazione degli allievi pertinenti.

Mostra stati espliciti, secondo il modello dati:

- Presente.
- Assente.
- Da registrare.
- Eventuali altri stati supportati.

Non preselezionare arbitrariamente la presenza.

Preserva le presenze già registrate.

Permetti modifiche autorizzate senza duplicazioni.

## 19.8 Stampe

Raggruppa le funzioni PDF e stampa in un'unica sezione.

Rendi esplicito cosa verrà stampato o scaricato.

Preserva la generazione dei documenti esistenti.

---

# 20. ARCHIVIO MODULI DIDATTICI

Rinomina la pagina con un titolo più semplice:

«Archivio moduli didattici».

Evita titoli eccessivamente lunghi.

Introduci:

- Ricerca per codice, titolo e contenuto, se supportata.
- Filtro per tipologia.
- Filtro per disciplina o livello, se disponibile.
- Ordinamento.
- Paginazione.
- Azione «Nuovo modulo».

Mostra:

- Codice.
- Titolo.
- Tipo.
- Descrizione sintetica.
- Azioni.

Consenti la consultazione della descrizione completa senza deformare la tabella.

Apri le modifiche in un drawer o in una pagina dedicata.

Non eliminare moduli utilizzati senza verificare i collegamenti.

Distingui chiaramente:

- Moduli didattici.
- Programmi didattici.
- Versioni dei programmi.
- Programmi associati ai corsi.

Riduci le duplicazioni e le ambiguità della navigazione.

---

# 21. CALENDARIO VISIVO, PISCINE E CORSIE

## 21.1 Calendario

Riprogetta il calendario come strumento operativo.

Prevedi:

- Vista giorno.
- Vista settimana.
- Vista mese.
- Vista agenda, soprattutto su mobile.
- Pulsante «Oggi».
- Navigazione precedente/successivo.
- Selezione data.
- Filtro piscina.
- Filtro corso, se pertinente.

Non duplicare inutilmente i controlli della stessa modalità di visualizzazione.

Evidenzia il giorno corrente.

Mostra chiaramente la modalità attiva.

Mostra le lezioni come elementi riconoscibili e cliccabili.

Utilizza colori coerenti accompagnati da etichette.

Per ogni lezione visualizza, secondo lo spazio disponibile:

- Orario.
- Titolo.
- Corso.
- Piscina.
- Corsia.

Se non ci sono lezioni, mostra uno stato vuoto comprensibile.

## 21.2 Nuova lezione dal calendario

Correzione obbligatoria.

Attualmente il pulsante «Nuova lezione» del calendario reindirizza alla pagina generica Gestione corsi.

Questo percorso non è intuitivo.

Il pulsante deve aprire direttamente un flusso di creazione della lezione.

Se è necessario indicare il corso, deve essere possibile selezionarlo all'interno del modulo.

Precompila data, orario e piscina se derivabili dalla selezione effettuata nel calendario.

Consenti di cliccare su un giorno o intervallo per creare una lezione, ove opportuno.

Dopo il salvataggio torna al calendario mantenendo i filtri.

Riutilizza la stessa logica di creazione della lezione disponibile nella scheda corso.

Non duplicare le regole di validazione.

## 21.3 Occupazione corsie

Mostra una rappresentazione leggibile delle corsie e degli intervalli.

Distingui:

- Prenotata.
- Non prenotata nel gestionale.
- Indisponibile, quando noto.
- Disponibilità verificata, quando effettivamente supportata.

Non confondere l'assenza di prenotazioni con la disponibilità contrattuale della piscina.

Mostra i conflitti prima della conferma e riconvalidali lato server/database.

## 21.4 Piscine

Utilizza una pagina dedicata con:

- Nome.
- Indirizzo.
- Orari.
- Limitazioni.
- Corsie.
- Azioni.

Pulsante «Aggiungi piscina».

Modifica mediante pannello dedicato.

Non aprire form dentro la tabella.

Rendi consultabili le corsie direttamente dalla piscina, senza eliminare la gestione generale.

## 21.5 Corsie e prenotazioni

Utilizza nomenclature specifiche.

Consenti la consultazione coordinata di:

- Piscina.
- Corsia.
- Lezione.
- Orario.
- Prenotazioni.
- Eventuali vincoli.

Verifica che le operazioni di modifica e cancellazione rispettino tutte le relazioni.

---

# 22. ORGANI SOCIALI E VERBALI

Integra la pagina nel layout amministrativo, rispettando i permessi specifici dei componenti dell'organo sociale.

Mantieni la denominazione ufficiale dell'organo prevista dallo statuto.

Non sostituire arbitrariamente Consiglio di Amministrazione con Consiglio Direttivo, o viceversa.

Organizza la pagina in sezioni:

- Panoramica.
- Componenti in carica.
- Sedute.
- Bozze.
- Votazioni in corso.
- Verbali approvati.
- Archivio.
- Versioni sostituite.

Evita una pagina unica interminabile.

## 22.1 Componenti

Mostra:

- Nominativo.
- Carica.
- Inizio mandato.
- Fine mandato.
- Stato.
- Azioni.

Utilizza date italiane.

Pulsante «Aggiungi componente».

Non mostrare permanentemente il modulo di registrazione sotto la tabella.

Preserva le regole relative ai mandati.

## 22.2 Nuova seduta e verbale

Crea un flusso dedicato:

1. Dati della seduta.
2. Oggetto.
3. Tipologia.
4. Caricamento bozza.
5. Eventuali adesioni da approvare.
6. Riepilogo.

Migliora l'interfaccia di caricamento DOCX.

Mostra formato e dimensione ammessa.

Mostra chiaramente il nome del file selezionato e l'esito del caricamento.

Preserva il documento originale.

Non presentare una trascrizione PDF come riproduzione fedele dell'impaginazione Word.

## 22.3 Bozze e votazioni

Ogni bozza deve essere distinguibile mediante titolo, data, tipologia, stato e riferimento.

Mostra le azioni in modo ordinato:

- Apri verbale.
- Scarica Word.
- Visualizza PDF.
- Modifica bozza.
- Apri votazione.
- Consulta cronologia.

Evita pulsanti a tutta larghezza sproporzionati.

Mostra lo stato della votazione e i voti registrati secondo i permessi.

Verifica:

- Aventi diritto.
- Quorum.
- Eventuale unanimità prevista.
- Voti duplicati.
- Concorrenza.
- Immutabilità dei verbali approvati.
- Versioni sostituite.
- Associazione tra approvazione del verbale e adesioni.

Non alterare le regole di voto già definite.

Non mostrare «0/0» come indicazione autosufficiente se la votazione non è configurata.

Nel caso di approvazione delle adesioni, mostra un selettore intuitivo delle pratiche da includere e il riepilogo prima dell'apertura della votazione.

---

# 23. ARCHIVIO DOCUMENTI

Integra l'archivio amministrativo nella navigazione comune.

Distingui l'archivio della segreteria dai documenti visibili ai soci e dagli altri ambiti riservati.

Riprogetta l'elenco:

- Icona del tipo di file.
- Nome.
- Categoria.
- Ambito.
- Visibilità.
- Data di caricamento.
- Dimensione.
- Eventuale riesame.
- Azioni.

Prevedi:

- Ricerca.
- Filtri.
- Ordinamento.
- Paginazione.
- Pulsante «Carica documento».

Azioni:

- Visualizza anteprima, se supportata.
- Scarica.
- Modifica informazioni.
- Sostituisci documento, se prevista la funzione.
- Elimina o archivia, secondo le regole esistenti.

Non aprire i moduli nella colonna Azioni.

## 23.1 Caricamento

Organizza il modulo in:

- File.
- Nome e categoria.
- Destinazione.
- Visibilità.
- Eventuali collegamenti.
- Conservazione.

Utilizza caricamento file comprensibile, eventualmente con drag and drop.

Mantieni l'accessibilità tramite pulsante tradizionale.

Mostra formati e limiti di dimensione.

I campi devono essere contestuali.

Se l'ambito è Associazione, non mostrare inutilmente tutti i collegamenti a persona, account, corso e programma.

Se l'ambito riguarda un corso, mostra i campi pertinenti.

Usa le regole effettive del modello dati.

Mantieni come impostazione prudenziale la visibilità più restrittiva compatibile con l'operazione.

Mostra prima del salvataggio chi potrà visualizzare il documento.

Sostituisci «Carica nel deposito privato» con un'etichetta più naturale, senza modificare la sicurezza dello storage.

Non rendere pubblici file sanitari, riservati o amministrativi.

Verifica policy RLS, storage policy, accesso ai download e URL temporanei.

---

# 24. CONTABILITÀ INTERNA

Trasforma il modulo generico in una vera pagina di gestione dei movimenti.

Titolo:

«Movimenti contabili» oppure «Contabilità interna».

Azioni principali:

- Registra entrata.
- Registra uscita.
- Esporta CSV.
- Apri rendiconto.

Elimina «Aggiungi nuovo record».

Introduci filtri:

- Periodo.
- Tipo.
- Categoria.
- Modalità di pagamento.
- Origine del movimento.
- Descrizione.

Mostra indicatori economici coerenti con i filtri applicati.

Tabella:

- Data.
- Tipo.
- Categoria.
- Descrizione.
- Modalità di pagamento.
- Importo.
- Origine.
- Azioni.

Utilizza importi formattati in euro.

Distingui entrate e uscite in modo chiaro.

## 24.1 Registrazione movimento

Modulo dedicato:

- Data.
- Entrata/uscita.
- Categoria.
- Descrizione.
- Importo.
- Modalità di pagamento.
- Riferimento, se supportato.
- Note.

Utilizza categorie normalizzate e selettori coerenti.

Non imporre una modifica distruttiva delle categorie storiche.

Negli screenshot compaiono separatamente:

- Quota associativa.
- Quote associative.

Verifica se rappresentano lo stesso concetto.

Se appropriato, introduci una normalizzazione controllata, preservando i movimenti originari.

## 24.2 Movimenti automatici

Distingui i movimenti generati automaticamente dai versamenti rispetto a quelli inseriti manualmente.

Per i movimenti collegati mostra:

- Origine.
- Pagamento associato.
- Socio o causale pertinente, se autorizzato.

Non consentire modifiche o eliminazioni che compromettano la coerenza tra versamenti, quote e contabilità.

Utilizza le procedure di rettifica previste.

Sono stati osservati due movimenti con data, importo e descrizione coincidenti.

Verifica se siano effettivi duplicati.

Non eliminarli sulla base della sola somiglianza.

## 24.3 Controlli

Verifica:

- Precisione degli importi.
- Arrotondamenti.
- Coerenza dei saldi.
- Duplicazioni.
- Idempotenza.
- Rettifiche.
- Permessi.
- Esportazione CSV sicura, inclusa la protezione contro formula injection.

---

# 25. RENDICONTO ECONOMICO

Riprogetta la pagina come dashboard finanziaria interna.

Mostra:

- Entrate.
- Uscite.
- Saldo del periodo.
- Numero movimenti.

Distingui il saldo del periodo dall'effettivo saldo di banca o cassa.

Non equipararli senza una base contabile adeguata.

Prevedi selezione dell'anno e, se compatibile, intervalli temporali personalizzati.

Realizza un grafico mensile realmente leggibile.

Mostra i mesi dell'anno, anche quelli senza movimenti.

Utilizza nomi italiani dei mesi.

Confronta entrate e uscite mediante serie coerenti, legenda e valori.

Evita grafici costituiti da una singola barra orizzontale sproporzionata.

Mostra la ripartizione per categoria mediante:

- Tabella.
- Eventuale grafico a barre.
- Percentuali, quando significative.

Rendi disponibili:

- Esportazione CSV.
- Collegamento ai movimenti filtrati.
- Eventuale esportazione PDF, se implementata correttamente.

Mantieni i conteggi aggregati su tutti i movimenti del periodo.

Non basare i totali su un campione paginato.

Preserva l'indicazione che si tratta di un rendiconto interno e non della contabilità ufficiale, se questo è il perimetro del gestionale.

Evita termini tecnici come SQL o campionamento nelle spiegazioni rivolte all'utente ordinario.

---

# 26. INVENTARIO ATTREZZATURE

Trasforma l'inventario in una pagina operativa dedicata.

Mostra indicatori:

- Totale attrezzature.
- Disponibili.
- In prestito.
- In manutenzione.
- Revisioni in scadenza.
- Non utilizzabili, quando previsto.

Utilizza soltanto categorie e stati supportati o esplicitamente introdotti con adeguate regole.

Introduci filtri:

- Categoria.
- Codice.
- Marca.
- Modello.
- Matricola.
- Stato.
- Scadenza revisione.

Azione principale:

«Aggiungi attrezzatura».

Elimina «Aggiungi nuovo record».

Mostra:

- Codice univoco.
- Categoria.
- Marca e modello.
- Stato.
- Prossima revisione.
- Azioni.

Rendi cliccabile l'attrezzatura.

## 26.1 Scheda attrezzatura

Organizza:

- Identificazione.
- Dati tecnici.
- Stato.
- Acquisto.
- Ultima revisione.
- Prossima revisione.
- Storico manutenzioni.
- Storico prestiti.
- Documenti, se previsti.
- Note.

Utilizza il codice univoco e la denominazione reale come titolo, non l'UUID.

Azioni:

- Modifica attrezzatura.
- Registra revisione.
- Registra consegna.
- Registra restituzione.
- Visualizza storico.

Verifica unicità dei codici.

Utilizza una classificazione coerente delle categorie.

Non permettere che lo stato disponibile contraddica un prestito ancora aperto o una condizione di non utilizzabilità prevista dalle regole.

Una revisione mancante o scaduta non deve essere presentata come valida.

---

# 27. REVISIONI E MANUTENZIONI

Riprogetta la pagina.

Azione principale:

«Registra revisione».

Mostra:

- Attrezzatura.
- Data intervento.
- Tipologia.
- Esito.
- Costo.
- Prossima revisione.
- Azioni.

Introduci filtri:

- Attrezzatura.
- Periodo.
- Tipologia.
- Esito.
- Scadenza.

Utilizza stati leggibili.

Apri le modifiche in un modulo dedicato.

Usa etichette esplicite:

- Data dell'intervento.
- Tipo di intervento.
- Esito della revisione.
- Costo dell'intervento.
- Data prossima revisione.

Utilizza selettori per esiti e tipologie quando appropriato.

Preserva le note tecniche.

## 27.1 Sincronizzazione inventario

Verifica che una nuova revisione aggiorni correttamente le informazioni dell'attrezzatura, secondo le regole esistenti.

Verifica:

- Ultima revisione.
- Prossima revisione.
- Stato dell'attrezzatura.
- Segnalazioni di scadenza.

Definisci la fonte autorevole dei dati per evitare aggiornamenti indipendenti incoerenti.

Gestisci correttamente la modifica di revisioni storiche.

Non derivare automaticamente intervalli di revisione senza conoscere le regole applicabili alla specifica attrezzatura.

## 27.2 Duplicati

Negli screenshot compaiono tre interventi apparentemente identici sulla stessa attrezzatura A001, con la stessa data, tipologia e prossima scadenza.

Verifica se siano duplicati reali.

Introduci protezioni contro salvataggi accidentali ripetuti.

Segnala possibili duplicati senza impedire interventi distinti legittimi.

Non cancellare automaticamente le revisioni esistenti.

---

# 28. CONSEGNE E RESTITUZIONI ATTREZZATURE

Rinomina la sezione, se opportuno:

«Prestiti e restituzioni».

Azione principale:

«Registra consegna».

Non utilizzare «Nuovo record».

Mostra indicatori operativi:

- Prestiti attivi.
- Attrezzature consegnate.
- Restituzioni registrate.
- Eventuali restituzioni in ritardo, se esiste una scadenza prevista.

Tabella:

- Attrezzatura.
- Destinatario.
- Corso, se pertinente.
- Data consegna.
- Data prevista di restituzione, se supportata.
- Data effettiva restituzione.
- Stato.
- Azioni.

Introduci filtri per attrezzatura, persona, corso, periodo e stato.

## 28.1 Nuova consegna

Modulo guidato:

- Seleziona attrezzatura.
- Seleziona destinatario.
- Indica il corso, quando pertinente.
- Data consegna.
- Eventuale restituzione prevista.
- Note.

Chiarisci se il prestito è a una persona, a un corso o a entrambi secondo le regole effettive.

Mostra soltanto i campi pertinenti.

Non richiedere la data di restituzione effettiva durante la registrazione di una consegna ancora in corso.

Non consentire una consegna duplicata della stessa attrezzatura se già in prestito.

Verifica i requisiti di utilizzabilità previsti dall'associazione.

## 28.2 Restituzione

Prevedi un pulsante diretto:

«Registra restituzione».

Non costringere l'operatore a entrare in un modulo di modifica generico.

Mostra il riepilogo del prestito e registra la data effettiva.

Verifica l'aggiornamento coerente dello stato inventariale.

Preserva lo storico.

---

# 29. GESTIONE UTENTI

Riprogetta la gestione degli account.

Distingui chiaramente:

- Account di accesso.
- Persona anagrafica.
- Socio.
- Ruolo.
- Permesso.
- Collegamento familiare.

Non utilizzare questi concetti come sinonimi.

Mostra indicatori:

- Account totali.
- Account attivi.
- Account bloccati, se previsti.
- Account senza ruolo.
- Account senza anagrafica collegata.
- Eventuali email non verificate.

Introduci ricerca, filtri e paginazione.

Mostra:

- Nome.
- Email.
- Ruoli.
- Stato account.
- Stato collegamento anagrafico.
- Azioni.

Utilizza etichette visive per i ruoli.

Mantieni l'indicazione «Il tuo account».

## 29.1 Scheda account

Organizza:

- Informazioni.
- Stato.
- Email verificata.
- Data creazione.
- Ultimo accesso.
- Ruoli e autorizzazioni.
- Anagrafiche collegate.
- Attività e dipendenze.
- Operazioni amministrative.

Mostra l'UID solo in una sezione tecnica secondaria.

Elimina la visualizzazione ordinaria di:

- cda_verbali_creato_da_fkey.
- collegamenti_persone_utente_id_fkey.
- eventi_pratica_attore_id_fkey.
- Altri nomi di tabelle e vincoli.

Traduci le dipendenze in informazioni comprensibili:

- Verbali creati.
- Documenti caricati.
- Persone collegate.
- Eventi gestiti.
- Pagamenti registrati.
- Richieste esaminate.
- Ruoli assegnati.

Mantieni i dettagli tecnici disponibili soltanto dove realmente necessari.

## 29.2 Ruoli

Non preselezionare il ruolo amministratore durante l'assegnazione.

Richiedi una scelta consapevole.

Mostra una descrizione sintetica dei privilegi del ruolo, derivata dalle autorizzazioni effettive.

Apri l'assegnazione direttamente dalla scheda dell'account o dalla riga pertinente.

Evita di costringere l'utente a riscrivere manualmente l'email di un account già presente in elenco.

Proteggi:

- Auto-modifiche non autorizzate.
- Revoca dell'ultimo amministratore, se applicabile.
- Escalation dei privilegi.
- Ruoli amministrativi protetti.
- Assegnazioni duplicate.

Tutti i controlli devono essere applicati lato server.

## 29.3 Collegamento anagrafico

Utilizza un flusso guidato:

- Seleziona account.
- Cerca persona.
- Seleziona relazione.
- Visualizza riepilogo.
- Conferma collegamento.

Evidenzia account non collegati e collegamenti esistenti.

Verifica duplicazioni e compatibilità delle relazioni.

Mantieni i casi in cui un account è autorizzato a gestire più persone.

Non introdurre una relazione obbligatoria uno-a-uno se incompatibile con la gestione familiare.

## 29.4 Eliminazioni

Distingui:

- Blocco dell'accesso.
- Revoca ruolo.
- Rimozione account.
- Eliminazione dei dati associativi, quando consentita.

Mostra le conseguenze.

Proteggi i record contabili, i verbali, gli audit e le altre dipendenze soggette a conservazione.

Non implementare cancellazioni a cascata indiscriminate.

---

# 30. REPORT E SCADENZE

Trasforma questa pagina in:

«Scadenze e attività da gestire».

Deve diventare un centro operativo della segreteria.

Attualmente presenta semplici conteggi, informazioni generiche e limiti di lettura dichiarati nell'interfaccia.

## 30.1 Affidabilità dei dati

Verifica e correggi:

- Conteggi basati su campioni.
- Limiti di lettura.
- Paginazione erroneamente utilizzata per aggregazioni.
- Incoerenze tra dashboard e report.
- Incoerenze tra quote e incassi.
- Coerenza tra inventario e revisioni.
- Coerenza con le lezioni programmate.

Negli screenshot risultano quote non saldate con scadenza oltre l'orizzonte dei 30 giorni, mentre il report mostra zero quote con residuo.

Verifica se il comportamento è corretto rispetto al filtro temporale.

Distingui:

- Quote non saldate.
- Quote in scadenza.
- Quote scadute.
- Importo residuo totale.

Non considerare automaticamente errata una differenza giustificata dai filtri.

Utilizza aggregazioni affidabili lato database o meccanismi equivalenti.

## 30.2 Centro operativo

Prevedi categorie:

- Revisioni attrezzature.
- Certificati medici.
- Quote associative.
- Quote corsi.
- Tesseramenti.
- Adesioni e rinnovi.
- Domande da esaminare.
- Lezioni.
- Eventi.
- Restituzioni attrezzature.
- Documenti da riesaminare.
- Direttori e istruttori da assegnare.
- Verbali e votazioni.

Includi soltanto le categorie effettivamente supportate.

Per ogni segnalazione mostra:

- Entità.
- Categoria.
- Descrizione.
- Data.
- Giorni rimanenti o ritardo.
- Priorità.
- Stato.
- Azione diretta.

Non mostrare semplicemente:

«Attrezzature: A001».

Mostra invece, ad esempio:

«Bombola 15 L — A001 — revisione prevista il 27/11/2026».

Consenti di aprire la relativa scheda.

## 30.3 Filtri temporali

Prevedi:

- Già scadute.
- Prossimi 7 giorni.
- Prossimi 15 giorni.
- Prossimi 30 giorni.
- Prossimi 60 giorni.
- Prossimi 90 giorni.
- Intervallo personalizzato.

Ordina per urgenza.

Distingui attività programmate, segnalazioni imminenti e situazioni bloccanti.

Mantieni eventuali limiti di completezza esplicitamente indicati finché non vengono effettivamente risolti.

---

# 31. NOTIFICHE E PROMEMORIA

Integra le regole promemoria esistenti.

Non creare sistemi paralleli che producano notifiche duplicate.

Prevedi una campanella nella barra superiore, se compatibile con l'architettura.

Mostra:

- Notifiche non lette.
- Categoria.
- Priorità.
- Data.
- Descrizione.
- Collegamento alla funzionalità interessata.

Consenti:

- Apertura della segnalazione.
- Segna come letta.
- Visualizza tutte.

Distingui lo stato letto/non letto dalla risoluzione effettiva del problema.

Configura, secondo le funzionalità esistenti:

- Anticipo.
- Destinatari.
- Canale.
- Eventuale ripetizione.

Previeni duplicazioni.

Non inviare email o notifiche di prova a soci reali.

Non dichiarare attivo un sistema automatico di invio senza verificarne infrastruttura, configurazione e autorizzazioni.

---

# 32. PAGINE AMMINISTRATIVE NON ANALIZZATE DIRETTAMENTE

Estendi le regole del design system anche a:

- Persone e anagrafiche.
- Adesioni associative.
- Tesseramenti.
- Quote associative.
- Brevetti allievi.
- Certificati medici.
- Catalogo corsi.
- Corsi della stagione.
- Iscrizioni ai corsi.
- Istruttori nei corsi.
- Qualifiche istruttori.
- Versioni programmi.
- Presenze.
- Calendario lezioni.
- Prenotazioni corsie.
- Quote corsi.
- Listino corsi.
- Comunicazioni.
- Stagioni.
- Regole promemoria.
- Importazione dati.
- Amministrazione dati.
- Altre route effettivamente presenti.

Non presumere che presentino tutti gli stessi difetti.

Analizzale singolarmente e applica le correzioni pertinenti.

## 32.1 Stagioni

Evidenzia la stagione corrente.

Distingui stagioni attive, future e archiviate.

Preserva la regola effettiva di attivazione.

Non utilizzare automaticamente una stagione di collaudo in produzione.

## 32.2 Certificati e tesseramenti

Mostra stati e date chiaramente.

Distingui documenti mancanti, in scadenza, scaduti e validi.

Preserva la riservatezza delle informazioni sanitarie.

Non mostrare informazioni cliniche non necessarie.

## 32.3 Importazione dati

Realizza o migliora un flusso guidato, se compatibile:

1. Selezione file.
2. Validazione.
3. Anteprima.
4. Identificazione conflitti.
5. Riepilogo.
6. Conferma.
7. Esito.

Evita importazioni duplicate e parziali non tracciate.

Non effettuare importazioni reali durante il collaudo.

## 32.4 Amministrazione dati

Mantieni le operazioni tecniche in un'area separata e protetta.

Mostra conferme esplicite per azioni irreversibili.

Non esporre strumenti avanzati agli utenti non autorizzati.

---

# 33. AREA PERSONALE DEL SOCIO

Questa area non è stata ancora osservata direttamente negli screenshot.

Esamina il codice effettivo prima di modificarla.

Applica il design system e le regole generali senza inventare funzionalità, permessi o obblighi associativi.

L'obiettivo è un'interfaccia ancora più semplice di quella amministrativa.

Organizza, se già supportati:

- Profilo.
- Stato adesione.
- Tesseramento.
- Corsi.
- Lezioni.
- Presenze.
- Certificati.
- Quote e pagamenti.
- Brevetti.
- Eventi.
- Documenti.
- Comunicazioni.
- Dichiarazioni.

Mostra esclusivamente dati accessibili all'utente.

Non esporre note interne o dati di altri soci.

Rendi disponibile la gestione delle autorizzazioni facoltative, secondo le regole previste.

---

# 34. AREA ISTRUTTORI

Questa area non è stata ancora osservata direttamente negli screenshot.

Analizza il codice effettivo.

Applica il design system senza modificare arbitrariamente il perimetro dei permessi.

Organizza, secondo le funzionalità presenti:

- Corsi assegnati.
- Prossime lezioni.
- Allievi autorizzati.
- Programmi didattici.
- Esercizi.
- Materiali.
- Registro presenze.
- Documenti.
- Calendario.

Rendi particolarmente semplice la registrazione delle presenze da smartphone.

Non mostrare informazioni amministrative, contabili o sanitarie non necessarie.

---

# 35. DOMANDA DI ADESIONE LATO RICHIEDENTE

Questa interfaccia non è stata ancora analizzata direttamente.

Esamina la versione effettiva.

Applica i requisiti generali:

- Modulo comprensibile.
- Sezioni logiche.
- Eventuale procedura guidata a passaggi.
- Indicazione di avanzamento.
- Validazione dei campi.
- Conservazione delle bozze, se prevista.
- Dichiarazioni raggruppate.
- Consenso foto e video facoltativo.
- Riepilogo prima dell'invio.
- Conferma della ricezione.
- Stato della domanda.
- Possibilità di completare le integrazioni richieste.

Preserva le funzionalità relative ai minori e ai tutori.

Non eliminare campi necessari senza esaminare le validazioni e il modello dati.

---

# 36. VERSIONE SMARTPHONE E TABLET

La versione mobile presenta un grave problema strutturale.

Negli screenshot i collegamenti del menu amministrativo vengono visualizzati come decine di pulsanti disposti prima del contenuto della pagina.

L'utente deve scorrere gran parte dell'interfaccia prima di raggiungere ciò che vuole consultare.

Correggi questo problema alla radice.

## 36.1 Navigazione mobile

Realizza:

- Header compatto.
- Menu hamburger.
- Menu a scomparsa.
- Macroaree espandibili.
- Evidenziazione della pagina attiva.
- Chiusura del menu dopo la navigazione.
- Gestione accessibile del focus.
- Accesso al profilo.
- Notifiche, se disponibili.

Il menu non deve occupare spazio nella pagina quando è chiuso.

Prevedi eventualmente una barra inferiore con accessi rapidi realmente funzionanti:

- Home.
- Soci.
- Agenda.
- Menu.

Mostra soltanto le voci compatibili con il ruolo.

## 36.2 Layout mobile

- Nessuno scorrimento orizzontale dell'intera pagina.
- Titoli proporzionati.
- Margini laterali indicativamente di 16 px.
- Campi a larghezza completa.
- Moduli su una colonna.
- Pulsanti facilmente raggiungibili.
- Aree cliccabili preferibilmente almeno 44 × 44 px.
- Testo dei campi di almeno 16 px, anche per limitare zoom involontari su iOS.
- Spaziature coerenti.
- Card compatte.
- Nessun contenuto nascosto sotto barre fisse.
- Tabelle adattate.
- Modali a tutto schermo quando necessario.
- Calendario in modalità agenda.

## 36.3 Safari e tastiera

Verifica:

- Safe area.
- Barre dinamiche del browser.
- Altezza effettiva della viewport.
- Tastiera virtuale.
- Scorrimento dei moduli.
- Campi data e ora.
- Selettori.
- Pulsanti di conferma.
- Focus.
- Chiusura dei drawer.

Non attribuire al gestionale le barre native di Safari, ma impedisci che la sua interfaccia risulti inutilizzabile in loro presenza.

## 36.4 Homepage e accesso mobile

Riduci l'ingombro dell'header.

Evita che la navigazione superiore vada inutilmente su più righe.

Ridimensiona i titoli.

Mantieni accesso e registrazione facilmente raggiungibili.

Organizza le dichiarazioni in modo compatto.

Elimina i grandi riquadri non necessari.

## 36.5 Dimensioni di verifica

Verifica almeno:

- 320 px.
- 375 px.
- 390 px.
- 430 px.
- 768 px.
- 1024 px.
- 1280 px.
- 1440 px.
- 1920 px.

Testa orientamento verticale e orizzontale, dove pertinente.

Verifica Safari iOS e Chrome.

Distingui test reali da simulazioni effettuate mediante viewport.

---

# 37. ACCESSIBILITÀ E USABILITÀ

Punta alla conformità WCAG 2.2 livello AA, verificando concretamente i requisiti applicabili.

Prevedi:

- Contrasto adeguato.
- Navigazione da tastiera.
- Focus visibile.
- Etichette associate ai campi.
- Errori comprensibili.
- Gestione corretta dei dialoghi.
- Restituzione del focus alla chiusura.
- Compatibilità con screen reader.
- Semantica corretta.
- Stati annunciabili.
- Rispetto di prefers-reduced-motion.
- Nessuna informazione affidata soltanto al colore.
- Dimensioni dei controlli adeguate.
- Reflow del contenuto.
- Supporto allo zoom.

Non nascondere il focus per motivi estetici.

Evita tooltip come unico mezzo per comprendere un'azione.

Le icone devono essere accompagnate da etichette quando il loro significato non è ovvio.

Non sovraccaricare l'interfaccia con animazioni.

Privilegia semplicità e prevedibilità.

---

# 38. SICUREZZA, INTEGRITÀ E DATABASE

Verifica sistematicamente:

- Autenticazione.
- Autorizzazione.
- RLS.
- Accesso alle route.
- Server actions.
- API.
- Storage.
- Download dei documenti.
- Ruoli amministrativi.
- Validazione degli identificativi.
- Accessi diretti a entità non autorizzate.
- Elevazione dei privilegi.
- Duplicazione delle operazioni.
- Concorrenza.
- Vincoli di integrità.
- Transazioni.
- Gestione degli errori.
- Audit.
- Esportazioni.

Non considerare la semplice scomparsa di un pulsante come una misura di sicurezza sufficiente.

Verifica tutti i percorsi di modifica, inclusi quelli avanzati e quelli generici.

Centralizza le regole di validazione.

Non duplicare regole business incoerenti tra interfacce differenti.

Per ogni migrazione necessaria:

- Documenta il motivo.
- Verifica lo schema di partenza.
- Gestisci i dati esistenti.
- Evita operazioni distruttive.
- Valuta l'idempotenza.
- Preserva la compatibilità quando possibile.
- Predisponi una strategia di ripristino.
- Testa su un database separato.

Non eseguire SQL direttamente in produzione senza autorizzazione.

Non inviare dati personali o documenti reali nei log di collaudo.

---

# 39. PRESTAZIONI

Ottimizza:

- Query Supabase.
- Paginazione lato server.
- Aggregazioni.
- Componenti React.
- Caricamento delle pagine.
- Dimensioni del bundle.
- Eventuali immagini.
- Richieste ripetute.
- Rendering di tabelle lunghe.
- Caricamento dei moduli.
- Navigazione.

Non introdurre librerie pesanti senza necessità.

Riutilizza le dipendenze esistenti.

Mantieni un'esperienza fluida anche su smartphone meno recenti.

Inserisci stati di caricamento coerenti.

Non sostituire problemi di prestazioni con limitazioni silenziose dei risultati.

---

# 40. PIANO DI IMPLEMENTAZIONE

Procedi mediante fasi coordinate.

Mantieni un unico ramo principale di sviluppo dedicato al restyling, con commit separati e verificabili.

## Fase 0 — Audit tecnico

- Analisi repository.
- Verifica patch precedenti.
- Inventario delle route.
- Analisi database.
- Analisi permessi.
- Identificazione componenti condivisi.
- Creazione documentazione.
- Test iniziali di riferimento.

## Fase 1 — Design system

- Palette.
- Tipografia.
- Design token.
- Pulsanti.
- Icone.
- Card.
- Stati.
- Spaziature.
- Alert.
- Componenti fondamentali.

## Fase 2 — Layout globale

- Header.
- Sidebar.
- Macroaree.
- Evidenziazione pagina attiva.
- Breadcrumb.
- Pulsante Torna indietro.
- Protezione modifiche non salvate.
- Navigazione responsive.
- Gestione delle aree per ruolo.

## Fase 3 — Tabelle e moduli

- Componenti generici.
- Eliminazione form nelle celle.
- Drawer e modali.
- Tabelle.
- Ricerca.
- Filtri.
- Paginazione.
- Terminologia.
- Feedback.
- Conferme.

## Fase 4 — Restyling delle pagine

Implementazione di tutti i requisiti specifici definiti nel presente capitolato.

Suddividi questa fase in sottoblocchi:

- Accesso e registrazione.
- Dashboard, soci e segreteria.
- Corsi e didattica.
- Calendario e impianti.
- Eventi.
- Organi sociali.
- Documenti.
- Contabilità.
- Attrezzature.
- Utenti e sistema.
- Scadenze.
- Altre aree.

## Fase 5 — Correzioni funzionali

- Duplicazioni.
- Salvataggi.
- Coerenza dei dati.
- Permessi.
- Contabilità.
- Scadenze.
- Registrazione e dichiarazioni.
- Direttori e allievi.
- Calendario.
- Inventario e revisioni.
- Prestiti.
- Notifiche.

Non rinviare a questa fase problemi di sicurezza che devono essere corretti prima per consentire uno sviluppo sicuro.

## Fase 6 — Mobile e tablet

- Verifica di tutte le pagine.
- Menu.
- Tabelle.
- Moduli.
- Calendario.
- Tastiera.
- Accessibilità.
- Compatibilità con i browser.

Il responsive design deve comunque essere considerato sin dalle prime fasi.

## Fase 7 — Collaudo

- Build.
- TypeScript.
- Lint.
- Test unitari.
- Test di integrazione.
- Test end-to-end.
- Test RLS.
- Test responsive.
- Test di regressione.
- Test delle eventuali migrazioni.
- Verifica documentazione.
- Anteprima Vercel.
- Release notes.

Non pubblicare in produzione automaticamente.

---

# 41. PIANO DI COLLAUDO OBBLIGATORIO

Esegui controlli effettivi, utilizzando un ambiente di test quando necessario.

Se manca l'infrastruttura di test, introduci strumenti appropriati senza compromettere il progetto.

Verifica almeno i seguenti scenari.

## Navigazione

- Sidebar presente in ogni pagina amministrativa.
- Pagina corrente evidenziata.
- Sottopagine correttamente evidenziate.
- Collegamenti diretti funzionanti.
- Ritorno agli elenchi.
- Conservazione dei filtri.
- Avviso modifiche non salvate.
- Chiusura dei moduli senza perdita inattesa dei dati.

## Moduli

- Creazione.
- Modifica.
- Annullamento.
- Validazione.
- Errori lato server.
- Doppio clic.
- Salvataggio.
- Refresh.
- Dati preesistenti.
- Eliminazioni autorizzate.

## Autenticazione

- Registrazione.
- Verifica email.
- Login.
- Logout.
- Recupero password.
- Sessione esistente.
- Password contenenti spazi.
- Ruoli differenti.

## Soci

- Ricerca.
- Scheda.
- Adesione.
- Tesseramento.
- Certificato.
- Dichiarazioni.
- Contatto di emergenza.
- Collegamenti familiari.

## Corsi

- Creazione edizione.
- Protezione duplicati.
- Assegnazione direttore.
- Assegnazione istruttori.
- Iscrizione allievo.
- Requisiti associativi.
- Capienza.
- Concorrenza.
- Lezioni.
- Presenze.
- Programma didattico.
- Stampe.

## Contabilità

- Registrazione entrate.
- Registrazione uscite.
- Pagamenti parziali.
- Pagamenti completi.
- Rettifiche.
- Movimenti automatici.
- Saldi.
- Categorie.
- Rendiconto.
- Esportazioni.

## Attrezzature

- Inserimento.
- Modifica.
- Revisione.
- Scadenza.
- Consegna.
- Restituzione.
- Doppia consegna.
- Coerenza disponibilità.

## Documenti

- Caricamento.
- Download.
- Anteprima.
- Permessi.
- Modifica.
- Visibilità.
- Eliminazioni consentite.

## Organi sociali

- Registrazione componente.
- Creazione seduta.
- Caricamento bozza.
- Votazione.
- Quorum.
- Approvazione.
- Versionamento.
- Immutabilità.

## Scadenze

- Conteggi completi.
- Filtri temporali.
- Stati.
- Coerenza con le sezioni sorgente.
- Collegamenti diretti.
- Notifiche duplicate.

## Mobile

- Menu chiuso inizialmente.
- Assenza di overflow globale.
- Moduli compilabili.
- Tabelle leggibili.
- Tastiera.
- Calendario.
- Pulsanti accessibili.
- Salvataggi.

## Sicurezza

- Accessi non autenticati.
- Accessi con ruolo insufficiente.
- Accessi diretti ad altre entità.
- Policy RLS.
- Storage privato.
- Escalation privilegi.
- Dati sanitari.
- Operazioni amministrative protette.

---

# 42. CRITERI DI ACCETTAZIONE

La versione 2.0 può essere considerata pronta soltanto quando:

1. Tutte le route sono state censite.
2. Tutte le richieste del capitolato sono tracciate.
3. Le pagine amministrative condividono un layout coerente.
4. La voce attiva della sidebar è sempre riconoscibile.
5. Ogni pagina interna offre un ritorno prevedibile.
6. Le modifiche non salvate sono protette.
7. Nessun form complesso viene aperto in una cella della tabella.
8. Non compaiono più diciture generiche come «Aggiungi nuovo record».
9. Non compaiono identificativi tecnici inutili nell'interfaccia ordinaria.
10. Le schede dei soci e dei corsi sono navigabili per sezioni.
11. Il calendario consente la creazione diretta delle lezioni.
12. La versione mobile non presenta il menu completamente espanso prima del contenuto.
13. Le operazioni contabili mantengono la coerenza dei dati.
14. I permessi e le policy sono stati verificati.
15. Le modifiche non compromettono le patch precedenti.
16. Le funzionalità già operative sono preservate.
17. I conteggi e le segnalazioni sono affidabili o dichiarano esplicitamente eventuali limitazioni residue.
18. Le migrazioni sono documentate e testate.
19. La build termina correttamente.
20. Non risultano regressioni bloccanti.
21. Le aree non ancora testate sono esplicitamente indicate.
22. È disponibile un'anteprima verificabile prima della produzione.

---

# 43. CONSEGNA DI OGNI FASE

Al termine di ogni fase, fornisci:

- Riepilogo delle modifiche.
- Elenco dei file modificati.
- Requisiti completati.
- Requisiti ancora aperti.
- Commit o pull request.
- Eventuali migrazioni.
- Test effettivamente eseguiti.
- Risultato dei test.
- Screenshot dell'anteprima, quando disponibili.
- Problemi riscontrati.
- Decisioni tecniche.
- Eventuali blocchi.
- Rischi residui.

Aggiorna IMPLEMENTATION_TRACKER.md.

Se una funzionalità non può essere verificata per mancanza di accesso al database, a Vercel o a un account con ruolo specifico, dichiaralo espressamente.

Non simulare verifiche.

---

# 44. PUBBLICAZIONE

Mantieni stabile la versione di produzione durante lo sviluppo.

Utilizza anteprime Vercel per il collaudo.

Non effettuare merge nel ramo di produzione senza autorizzazione.

Prima della pubblicazione:

- Controlla lo stato delle patch precedenti.
- Verifica tutte le migrazioni.
- Verifica la compatibilità del database.
- Prepara una strategia di rollback.
- Verifica i documenti ufficiali.
- Verifica gli ambienti di test.
- Verifica i permessi.
- Presenta il riepilogo finale.

Eventuali operazioni manuali su Supabase devono essere indicate chiaramente, fornendo il file SQL corretto e l'ordine di esecuzione.

Non richiedere accesso indiscriminato ad altri repository o servizi.

Lavora esclusivamente sul progetto autorizzato.

---

# 45. ISTRUZIONE OPERATIVA FINALE

Non interpretare questo capitolato come una richiesta di una semplice proposta estetica.

L'obiettivo è l'implementazione effettiva e completa della nuova versione del gestionale Sesto Continente.

Non limitarti a modificare globals.css o i colori.

Intervieni sull'architettura dell'interfaccia, sui componenti condivisi, sulle singole pagine e sui problemi funzionali effettivamente riscontrati.

Non lasciare funzionalità parzialmente implementate senza segnalarlo.

Non sacrificare sicurezza o integrità dei dati per velocizzare il restyling.

In presenza di un requisito ambiguo, analizza il funzionamento esistente e adotta la soluzione conservativa più coerente, documentando la decisione.

Considera tutte le pagine del progetto, anche quelle non esplicitamente fotografate.

Conserva questo capitolato come fonte di riferimento per tutte le successive fasi, evitando che i requisiti vengano persi cambiando conversazione.

**Inizia adesso dalla Fase 0: analisi completa del repository, verifica delle patch precedenti, censimento delle pagine, individuazione dei componenti condivisi, definizione delle dipendenze e creazione della documentazione di progetto.**

Procedi concretamente con questa fase. Non limitarti a descrivere come la svolgeresti.

Al termine consegna il risultato dell'audit e il piano operativo dettagliato, senza pubblicare modifiche in produzione.

Le successive fasi dovranno essere eseguite in sequenza attraverso istruzioni operative dedicate, mantenendo questo capitolato come riferimento vincolante.
