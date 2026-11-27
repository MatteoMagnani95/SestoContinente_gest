# Asset Marine Premium — Fase 2
Prima illustrazione originale generata il 27/11/2026, 1536x1024, raffigurazione disegnata di due sub (donna/uomo), reef, fauna, bolle, attrezzatura, raggi. Non una fotografia né materiale didattico tecnico. Le esportazioni locali sono preparate nel pacchetto Marine_Premium_3.2_asset_e_prototipo.zip, NON ancora caricate sul repository: il connector GitHub accetta base64 ma non il trasferimento diretto dal container. Non referenziare i file nell'app finché non sono presenti.
Destinazione prevista: public/brand/marine-premium/.
| File | Dimensioni | Byte | SHA256 |
|---|---:|---:|---|
|marine-hero-1440.webp|1440x960|209738|68b04ebd489743ff7f1f5a33d2cba7e98816e686380f3ebe97ad5f9393f7b537|
|marine-hero-768.webp|768x512|76596|35aaf6d9734b3c70461f4a9918f2145c48e5f397d87dcc0d4ac675f1b303645f|
|marine-hero-480.webp|480x320|33776|f1d58f1bf64c8095d663ca0fb254b3764c9a098a167f491cca14cd5360751f61|
|marine-auth-768.webp|768x512|76596|35aaf6d9734b3c70461f4a9918f2145c48e5f397d87dcc0d4ac675f1b303645f|
|marine-nereia-640.webp|640x300|35958|86fa1f537dd8af264838f1b715b8e7bc66be49273e5869d8369fcfd20347957a|
Auth e hero 768 sono identici: riutilizzare un solo file quando si integra, senza duplicare download. Nereia ritaglio della stessa opera, non illustrazione indipendente. Asset separati ulteriori da realizzare se necessari. Non aggiungere decorazione SVG. Per loghi ufficiali mantenere BrandLogo e file /brand/sestocontinente-logo.png, /brand/sestocontinente-mark.png, /brand/nereia-logo.png già esistenti; prototipo offline ancora senza loghi originali, non ridisegnarli.
Controlli locali: decodifica WebP e integrità ZIP; 1440 <250 KiB, 768 <150 KiB, banner <90 KiB. HTML standalone aggiornato: 5 schermate a 320/390/768/1024/1440 px, 25 verifiche Chromium con set_content, nessun overflow orizzontale, immagine non decodificabile o errore JS. Accesso file:// bloccato dall'ambiente di test; contenuto HTML verificato con set_content. Non prova login, dati o autorizzazioni.
Token: app/marine-premium-tokens.css, scoped .sc-marine-preview, non importato; tests/v3-2-marine-premium-tokens.test.mjs. Verifiche equivalenti eseguite sui file letti dal branch: 12 coppie testuali min 5.70:1, 4 coppie bordo/focus min 3.39:1, scope e reduced motion OK. Non attestare WCAG completo prima del test browser dell'app reale.

## Revisione richiesta dall'utente
Il prototipo HTML precedente è respinto. Riferimenti vincolanti 01–06: fondo a tutta pagina, hero scuro con testo bianco e logo originale, separatore ondulato, quattro step, banner Nereia marino; nelle pagine auth e adesione scheda chiara a sinistra e identità/Nereia a destra, responsive. Non introdurre funzioni inesistenti del mockup. I due WebP 768 e 640 vengono integrati senza ricompressione; 1440/480 non ancora trasferiti. BrandLogo originale invariato. Nuova CSS attiva solo sulle superfici pubbliche e applicante, nessun deploy. Confronto screenshot reali ancora da svolgere; non attestare fedeltà pixel-perfect.

## Revisione 01–06: risoluzioni originali complete
Aggiunti hero 1440 e 480, senza ricompressione, test SHA256 e dimensioni; media query 480/768/1440. Auth 768 identico al hero 768, non duplicato. Fondo e illustrazione sono ancora la prima opera originale, non lo stesso fondale pulito e le scene separate del riferimento. La fedeltà richiede revisione screenshot e, se necessario, nuovi asset mirati. Loghi originali invariati.

## Asset distinti dopo confronto reale
Scene generate originali, ritagliate separatamente da un atlante di tre fasce senza testo o marchi. Hero principale precedente mantenuto con due sub; reef, testata e Nereia distinti. Dimensioni byte e SHA256:
- marine-reef-1440.webp — 76132 — 2ae08406665b22bc3f21f789ab77aba0ba3a7c03b07e1894250e37fc4f64a565
- marine-reef-768.webp — 27586 — 7d43434b99e8e7bd40c379da6d136dd9d103826d4cc81a8b0510dca37d4ae119
- marine-reef-480.webp — 11626 — 28cbfc5b77f2ba8ff74108743999a76ba2a730851962cc47685e8776a2849d87
- marine-auth-strip-1000.webp — 52516 — a23c949b28dc4340a094b18a75c6949395d08c65c59f1924748747b5a98a0298
- marine-auth-strip-480.webp — 14044 — d79cd71e1a491461e9b74a6089d3a5666fe641765856aea5b08f0638b3f805a7
- marine-nereia-scene-960.webp — 30492 — 7ab3236575d2ffc578cb8c8048458310bf931d135b8fb17296a3cb84ccc8147c
- marine-nereia-scene-480.webp — 8560 — d6d1231ea0b12d14d126eed37c0948cd540f7bf28f8abae801a12bc0edee931e
Le varianti sono referenziate da media query. Il vecchio marine-nereia-640.webp resta archiviato, non utilizzato dal CSS. Nessun logo alterato. Nessun SVG decorativo nuovo.
