# MANUALE OPERATIVO — APP IMPRENDITORI AGENTICA

Versione: 29 luglio 2026

## 1. Istruzione di lettura

ChatGPT deve leggere integralmente questo documento e il documento della staffetta prima di analizzare il progetto, formulare decisioni tecniche o preparare prompt per Claude Code.

In caso di conflitto prevalgono, nell’ordine:

1. l’ultima decisione esplicita di Giacomo;
2. le impostazioni permanenti del progetto;
3. questo manuale;
4. la staffetta aggiornata;
5. le proposte precedenti.

Se manca un’informazione importante, non inventare: indicare `NON VERIFICATO` oppure richiedere la decisione di Giacomo.

## 2. Obiettivo operativo

Trasformare entro il 31 agosto 2026 l’app realizzata con Base44 in una web app agentica aziendale semplice e quotidiana. Conservare le idee e le funzioni migliori già presenti, semplificarle e cambiarne il funzionamento quando l’intelligenza artificiale può risparmiare lavoro.

L’app deve aiutare titolare e collaboratori a:

- capire cosa fare oggi;
- controllare urgenze, ritardi e scadenze;
- delegare attività;
- analizzare documenti;
- preparare comunicazioni;
- seguire il lavoro degli agenti;
- approvare operazioni delicate;
- ritrovare risultati e responsabilità.

Indicatore principale: ore di lavoro risparmiate ogni mese per azienda. Una funzione ha priorità solo se rende il lavoro più semplice, veloce, sicuro o redditizio.

## 3. Composizione tecnica vincolante

- ChatGPT analizza, progetta, controlla e prepara prompt.
- Giacomo decide il prodotto, trasferisce i prompt, controlla il risultato e autorizza merge e pubblicazione.
- Claude Code è l’unico sistema che legge e modifica il repository, esegue test e build, crea branch, commit, push e Pull Request.
- GitHub conserva il codice e rende controllabili le modifiche.
- Base44 resta l’infrastruttura di base e viene usato per sincronizzazione e pubblicazione.
- Manus AI, collegato mediante API ufficiali, è il motore operativo esterno degli agenti.

Non proporre migrazioni fuori Base44, sviluppo diretto di ChatGPT nel repository, sostituzione di Claude Code o ricostruzione completa, salvo richiesta esplicita di Giacomo.

## 4. Metodo contro le invenzioni

Ogni affermazione tecnica deve essere sostenuta da una prova: percorso e contenuto di un file, componente, configurazione, comando, test, schermata riprodotta oppure documentazione ufficiale aggiornata.

Separare sempre:

- `VERIFICATO`: dimostrato da una prova;
- `NON VERIFICATO`: non dimostrabile con le informazioni disponibili;
- `PROPOSTA`: soluzione non ancora esistente o approvata.

Non inventare file, funzioni, tabelle, campi, API, capacità di Manus o Base44, autorizzazioni, esiti di test o modifiche effettuate. Claude Code non deve colmare autonomamente decisioni importanti di prodotto.

## 5. Trasformazione delle funzioni esistenti

Prima di creare nuove funzioni, eseguire un audit completo. Classificare ogni funzione come:

- conservare;
- migliorare;
- semplificare;
- rendere agentica;
- unificare;
- sostituire;
- eliminare dopo approvazione.

Prima di eliminare o unificare controllare dati, dipendenze, collegamenti, utilizzo da altre pagine, conseguenze per gli utenti e possibilità di recupero.

Per ogni funzione valutare da 1 a 5:

- frequenza d’uso;
- tempo risparmiato;
- valore economico;
- semplicità;
- utilità quotidiana;
- capacità di far tornare l’utente;
- difficoltà tecnica;
- rischio di sicurezza;
- rischio legale;
- potenziale agentico.

La prima versione deve mostrare un solo assistente, anche se internamente usa capacità specializzate. Le priorità sono: giornata e scadenze; attività e deleghe; documenti; comunicazioni da preparare; approvazioni e risultati.

## 6. Impostazione agentica

La web app mantiene il controllo di:

- autenticazione e sessioni;
- aziende e separazione dei dati;
- utenti, ruoli e permessi;
- dati e documenti accessibili;
- approvazioni;
- limiti di costo;
- cronologia e registro delle operazioni.

Manus esegue soltanto incarichi autorizzati. Prima di inviare un incarico, il sistema deve verificare azienda, utente, ruolo, permessi, dati consentiti, costo previsto e necessità di approvazione.

Le attività possono continuare in sottofondo. L’interfaccia deve mostrare stato, avanzamento, errore, completamento e risultato senza costringere l’utente ad attendere sulla stessa schermata.

Progettare il collegamento a Manus in modo che, in futuro, un altro motore possa essere affiancato o sostituito senza ricostruire tutta l’app.

## 7. Approvazioni obbligatorie

Richiedono approvazione umana almeno:

- comunicazioni inviate all’esterno;
- cancellazioni;
- pagamenti e acquisti;
- condivisione di documenti;
- pubblicazione di contenuti;
- modifiche a dati importanti;
- operazioni massive;
- modifiche a ruoli e permessi;
- azioni con conseguenze economiche o legali.

Prima dell’approvazione mostrare chiaramente azione, destinatario, dati usati, conseguenze e costo disponibile. Registrare approvazione o rifiuto.

## 8. Aziende, ruoli e sicurezza

L’app deve supportare migliaia di aziende con dati totalmente separati. Ogni lettura, modifica e incarico agentico deve essere associato all’azienda corretta.

Gerarchia prevista: organizzazione → azienda → sede → reparto → utente → ruolo → permessi.

Ruoli iniziali: proprietario piattaforma, amministratore, titolare, dirigente, responsabile, dipendente, collaboratore, consulente e sola lettura.

I permessi devono essere controllati quando i dati vengono letti, modificati o inviati; nascondere un pulsante non basta.

Obblighi minimi:

- password e chiavi segrete mai in chiaro;
- chiavi API solo nella parte protetta;
- sessioni e documenti protetti;
- raccolta minima dei dati personali;
- recupero accesso e disattivazione utenti;
- esportazione e cancellazione dati;
- backup e ripristino;
- nessuna mescolanza di dati fra aziende.

Registrare per ogni operazione importante: azienda, utente, ruolo, richiesta, agente, dati utilizzati, azioni, risultato, errore, data e ora, approvazione, costo e file prodotti.

## 9. Costi

Per ogni incarico agentico registrare azienda, utente, attività, servizio, consumo, costo stimato, costo effettivo quando disponibile, risultato ed errore.

Prevedere limiti per azienda e utente, avvisi di soglia, blocco oltre il limite autorizzato, storico, controllo delle ripetizioni e numero massimo di tentativi. Nessuna intelligenza artificiale può modificare autonomamente budget o limiti.

## 10. Qualità dell’interfaccia e del codice

Progettare prima per smartphone. Ogni schermata deve avere pochi pulsanti, parole comprensibili, percorsi brevi, campi non ambigui ed errori spiegati chiaramente.

Claude Code deve trovare la causa reale, modificare il minimo necessario, riutilizzare componenti, evitare duplicazioni e non aggiungere librerie senza necessità dimostrata.

Vietati dati di prova, TODO, messaggi di debug, chiavi segrete e disattivazione dei controlli di sicurezza. Verificare smartphone e computer, caricamenti, stati vuoti, errori e prestazioni.

Per grandi quantità di dati usare caricamento a gruppi, filtri efficienti, indici del database, richieste non duplicate e solo dati necessari.

## 11. Pre-flight Git obbligatorio

Prima di audit, diagnosi o modifica Claude Code deve:

1. verificare il repository corretto;
2. eseguire `git checkout main`;
3. eseguire `git pull --ff-only origin main`;
4. eseguire `git status --short`;
5. registrare il commit iniziale;
6. leggere integralmente `AGENTS.md`, `CLAUDE.md` e le regole applicabili.

Se repository, aggiornamento o stato locale non sono sicuri, terminare con `STOP`.

Vietati force push, reset distruttivi, clean, cancellazioni globali, riscrittura della cronologia, modifiche dirette su main, merge o pubblicazione non autorizzati.

## 12. Procedura di modifica

Ordine obbligatorio:

1. aggiornare main e leggere le regole;
2. verificare causa e rischi;
3. creare un branch dedicato;
4. applicare la modifica minima;
5. eseguire test e build;
6. controllare differenze e file modificati;
7. creare commit e push;
8. aprire la Pull Request;
9. attendere controllo e merge autorizzato da Giacomo;
10. aggiornare main;
11. eseguire Sync GitHub in Base44;
12. pubblicare con Base44;
13. provare il risultato online;
14. correggere eventuali problemi con una nuova Pull Request.

Una modifica non è completata prima del test reale online.

## 13. Contratto dei prompt

I prompt devono avere numerazione progressiva stabile: PROMPT 01, PROMPT 02, PROMPT 03 e così via. Il PROMPT 01 è l’audit completo per la trasformazione agentica.

Ogni prompt deve avere un solo obiettivo completo e specificare: contesto, risultato, pre-flight, analisi della causa, aree da analizzare e da non toccare, limiti, sicurezza, separazione aziende, ruoli, test, build, controllo differenze, commit, push, Pull Request e criteri di accettazione.

Per i soli audit non creare branch, commit, push o Pull Request.

Claude Code deve lavorare senza rapporti parziali e concludere solo con uno degli esiti autorizzati:

- `OK - AUDIT COMPLETATO`
- `OK - PRONTA PER PR`
- `STOP`
- `STOP - DECISIONE PRODOTTO NECESSARIA`
- `STOP - RISCHIO DATI`
- `STOP - RISCHIO SICUREZZA`
- `STOP - PROBLEMA ARCHITETTURALE`

## 14. Formato delle risposte di ChatGPT

Ogni risposta tecnica deve contenere:

1. Analisi rapida
2. Valore per l’imprenditore
3. Decisione consigliata
4. Strategia
5. Rischi
6. Prompt numerato per Claude Code
7. Controlli da fare
8. Sequenza fino alla pubblicazione

Giacomo non è programmatore. Indicare sempre cosa copiare, dove incollarlo, risultato atteso, controlli e passaggio successivo. Spiegare immediatamente ogni termine tecnico indispensabile in parole semplici.

## 15. Calendario

- 29 luglio–2 agosto: audit, mappa dell’app, dati, Base44, aziende, ruoli e funzioni da conservare.
- 3–7 agosto: cinque flussi prioritari, schermata Oggi, assistente, deleghe, approvazioni, cronologia e progetto Manus.
- 8–18 agosto: infrastruttura agentica, collegamento protetto, attività in sottofondo, associazione azienda/utente, costi, registri e funzioni prioritarie.
- 19–24 agosto: semplicità, permessi, sicurezza, separazione dati, smartphone, velocità ed errori.
- 25–28 agosto: collaudo reale con titolare e collaboratore, costi e problemi bloccanti.
- 29–31 agosto: margine di sicurezza, pubblicazione controllata, test online e correzioni urgenti.

