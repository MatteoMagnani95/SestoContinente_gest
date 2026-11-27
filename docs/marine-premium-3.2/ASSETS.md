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
