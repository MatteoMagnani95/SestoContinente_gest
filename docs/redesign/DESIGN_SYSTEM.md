# Gestionale Sesto Continente 2.0 — Fase 0
Data: 2026-11-26. Base esatta: `ea97e2663a3999527b2e3f868c19dfd5b4f646eb`. Ramo: `feature/gestionale-2.0-redesign`.
Nessun merge, modifica applicativa o SQL produzione in questa fase.

# Design system — specifica di fase 1, non implementato
- Token proposti: --navy #102B39, --teal #087E83, --ocean #3679B8, --aqua #65C9BE, --surface #F3F7F8, --white #FFFFFF; testo principale navy, secondario ardesia. Calcolare contrasto WCAG prima di approvare qualsiasi accoppiamento; aqua solo decorativo finché non verificato.
- Macroaree: petrolio segreteria, oceano didattica, viola calendario, ocra attrezzature, verde contabilità, ardesia documenti/sistema. Stati semantici con testo/icona; niente colore come unica informazione.
- Scala indicativa: 4/8/12/16/24/32px; raggio 8–12px, ombre minime; font sans di sistema inizialmente, valutare Inter/Manrope senza dipendenza remota. H1 28–34 desktop, 26–30 mobile, body 16. Target 44px, focus visibile, motion ridotto.
- Riuso: EditForm, CancelEditButton, RemoveRecord, LessonComposer, Cronologia, CertificateUploadForm, EligibleEnrollmentSelect, Dichiarazioni, SceltaImmagini. Evitare duplicare business logic.
- AppShell per role-aware navigation; shell staff condizionale fuori /gestionale senza imporre requireStaff a consigliere o responsabile evento. Non cambiare URL. Client island per pathname e focus; guard server invariati.
- DataTable con slot espliciti per azioni e mobile card; drawer/dialog a focus gestito fuori dalla tabella, form pending/error accessibili; URL query whitelist per filtri, edit e ritorno. Dirty tracking per form con snapshot iniziale e reset esplicito dopo successo.
- Validare tutte le dimensioni SC-36.5 e WCAG 2.2 AA; nessuna conformità dichiarata prima dei test.
