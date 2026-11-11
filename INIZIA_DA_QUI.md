# Sesto Continente — Da dove iniziare

Questo pacchetto contiene il **codice sorgente** della prima implementazione del gestionale. Non è un'app già pubblicata e non viene installata con un doppio clic.

## Se non hai mai configurato un'app web

Il gestionale richiede due servizi separati:

1. **Supabase** ospita il database e gestisce gli account utenti.
2. **Next.js** è l'applicazione web, che può funzionare prima sul tuo computer e poi su un servizio di hosting.

Non occorre entrare nel sito `sestocontinente.it` e non sono necessarie modifiche al sito pubblico.

## Primo collaudo (solo dati inventati)

1. Crea un account gratuito su Supabase e un progetto di prova.
2. Copia ed esegui il file `supabase/migrations/0001_fase1.sql` nell'editor SQL del progetto Supabase.
3. Copia `.env.example` con il nome `.env.local` e aggiungi le chiavi pubbliche del progetto.
4. Installa Node.js sul computer, poi apri un terminale nella cartella del progetto.
5. Digita `npm install`, poi `npm run dev`.
6. Nel browser apri `http://localhost:3000`.
7. Crea un account di test e usa la guida nel file `README.md` per renderlo amministratore, poi crea una seconda domanda di prova.

**Non utilizzare dati reali:** mancano ancora le informative definitive, alcuni controlli e il collaudo con un database operativo.

Se incontri un messaggio di errore, non inserire password o chiavi private nella chat: comunica il testo dell'errore oscurando i dati sensibili.
