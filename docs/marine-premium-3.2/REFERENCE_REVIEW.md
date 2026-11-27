# Riesame diretto dei mockup 01–06
Fonte: Sesto_Continente_3_Marine_Premium_mockup(1).zip; sei PNG aperti singolarmente. Non riportare dati dimostrativi/prefill del riferimento. Le screenshot QA 46043582287 non erano disponibili durante questo intervento: confronto con sorgente, non verifica del rendering.
01: hero a tutta larghezza, logo a destra, CTA con icone, onda, 4 schede con icone, Nereia arrotondato separato. Adeguato CSS e icone. Link Nereia non inventato.
02: login a sinistra, pannello chiaro e banner Nereia a destra, link home, onda su testata, fondo marino e bordo inferiore. Adeguato.
03: stessa struttura; step orizzontali, form e dichiarazioni originali. Adeguato senza cambiare consenso.
04: titolo Verifica la tua email, passo 2, avviso e azioni effettive. Non mostrare indirizzo o conferma di invio non attestata; mantieni accesso/reinvio esistenti, nessuna nuova action.
05: testata illustrata, titolo Compila la domanda, passo 3, pannello destro e link home. Mantenere tutti i campi reali, requisiti minori, consensi, guardia e flusso di revisione.
06: titolo Domanda inviata soltanto con stato inviato, passo 4, avviso in revisione solo quando inviato/in verifica; conservare dettagli, dichiarazioni, progressione di pratica e azioni condizionali originali. Non inventare download.
Restano differenze: fondale originale condiviso tra sezioni vs scene distinte del riferimento; logo Nereia ufficiale può non essere bianco, mantenere originale; verifica screenshot a 390/1440 e confronto desktop puntuale obbligatori. Nessuna modifica area riservata, database, RPC, deploy. Non considerare approvata la fase prima del confronto reale.

## Confronto reale acquisito — c2242fc, 27/11/2026
Artifact 15221971189 da run 46043582287: 12 PNG, sei schermate x 390/1440. Tutte le sei immagini desktop aperte e confrontate con i PNG 01–06 originali (non il concept HTML). NON sono del commit af33a0f. Il confronto visivo seguente è del render c2242fc, distinto dalle correzioni successive.
01: hero incorniciato e fondale ripetuto invece di tutta larghezza, schede numerate senza icone, titolo processo piccolo, banner riusa sub, footer bianco; af33a0f corregge layout/icone, nuovo pass aggiunge contrasto, banner indipendente, footer marino.
02: sub giganteschi dietro il form, fondale ripetuto, testata troppo uniforme, riquadro destro piatto; nuovo reef senza sub, testata femminile separata, pannello acqua, spazi ridotti. Conservare breadcrumb, accesso/recovery/reinvio.
03: pagina e modulo troppo alti, mantenere privacy, scelta facoltativa e avviso COLLAUDO; ridotte spaziature, nuovo stepper con collegamento orizzontale, nessuna rimozione campi.
04: titolo Crea il tuo account anziché Verifica la tua email, avviso e azioni divergenti; af33a0f corregge titolo e step. Mantenere informazioni non rivelatrici e azioni vere; nessun indirizzo precompilato dal mockup.
05: assenza testata e step 3, modulo lungo per campi reali; af33a0f aggiunge testata/step, nuovo pass amplia colonna modulo e compatta griglia. Non ridurre campi o requisiti; lo screenshot sarà necessariamente più lungo del mockup.
06: titolo e stato non in evidenza; af33a0f aggiunge titolo condizionale e avviso; nuovo pass enfatizza il pannello informativo. Conservare dettagli e dichiarazioni, non inventare download, mantenere logout e account autenticati.
Nuovi asset indipendenti generati e ottimizzati; il confronto definitivo è aperto finché gli screenshot dello SHA aggiornato non sono acquisiti e verificati. Non estendere all'area riservata, non effettuare deploy o merge.

## Verifica reale 3cc0223 — 27/11/2026
Artifact 15221893146, 12 PNG reali. Confronto delle sei schermate desktop con riferimenti 01–06 e revisione del layout. Hero a tutta larghezza, pannelli distinti, testata e footer riscontrati; restano un fondale troppo realistico e un link Torna alla home duplicato dalla navigazione originale. L'utente approva la nuova direzione artistica pittorica (tre illustrazioni) e richiede qualità anti AI-slop. Nuovo pass limitato ad asset e stile pubblico, rimozione del link supplementare (AppShell invariato). Nessun cambiamento ai campi, consensi, sicurezza o account. Il nuovo commit richiede nuovi screenshot; quelli di 3cc0223 non rappresentano le nuove illustrazioni. Nessun GO prima di approvazione delle sei schermate complete.

## Verifica reale 89b5a85 — 27/11/2026
Artifact 15222997879 / run 46046850795, 12 PNG (1440 e 390). CI 46046850757: 333 statici, 70 browser, database e audit OK. QA autenticata OFF e flusso reale di registrazione/adesione completati; benchmark del commit in corso al momento della revisione.
01: direzione pittorica coerente, logo ufficiale, quattro passi, CTA reali; inquadratura alta taglia parzialmente il secondo sub, mobile troppo scuro, CTA header poco evidenti. Corretto crop, gradiente mobile e CTA header solo homepage.
02: testata e Nereia coerenti, moduli leggibili e recupero/reinvio preservati; bordo rettangolare netto del reef laterale. Corretto con strati di gradiente delle dimensioni esatte del frammento.
03: stesso difetto del reef; mantenere avvisi sintetici e consensi, non comprimere campi.
04: stessa correzione reef; messaggi non rivelatori e invio reale preservati.
05: modulo reale più lungo del riferimento, campi obbligatori e facoltativi non rimossi. Mobile: brand si dispone lettera per lettera nell'header, pur senza overflow orizzontale. Correzione grid header circoscritta alle superfici applicant.
06: stato, dichiarazioni, riepilogo corretti; medesimo difetto mobile e reef, stessa correzione. Nessun download o azione inventata.
Nuovo gate QA: verifica righe effettive del nome brand (max 2), larghezza minima e header applicant <=160px, logout visibile a viewport mobile. Il gate anti AI-slop visivo resta manuale; immagini stilizzate approvate ma non materiale tecnico subacqueo. Nessuna alterazione a area riservata o azioni. Gli screenshot 89b5a85 sono evidenza reale pre-correzione, non dell'ultimo commit.
