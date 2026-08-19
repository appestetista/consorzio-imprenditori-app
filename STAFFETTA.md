# STAFFETTA — CONTESTO COMPLETO PER NUOVA SESSIONE

**Ultimo aggiornamento:** 19 agosto 2026, 13:11 UTC
**Progetto:** trasformazione di APP CONSORZIO IMPRENDITORI in web app agentica
**Destinatario:** chiunque riprenda il lavoro in una nuova finestra

> Leggi questo file per primo. Contiene tutto il contesto verificato, i blocchi aperti e le
> trappole da non ripetere. Ogni numero riportato è accompagnato dal comando che lo produce.

---

## 1. IDENTITÀ E AMBIENTE

| Voce | Valore |
|---|---|
| Repository | `appestetista/consorzio-imprenditori-app` |
| Remote | `https://github.com/appestetista/consorzio-imprenditori-app` |
| Account GitHub | `consorzioimprenditori` — CONSORZIO IMPRENDITORI SRLS (id 209485872) |
| Cartella di lavoro | `/home/user/consorzio-imprenditori-app` |
| Branch di riferimento | `main` |
| Commit base analizzato | `6f6c151f8f6418dfc921303a636db8455a0f51ce` — "Update base44 packages", 23 lug 2026 |
| Infrastruttura | Base44 (da conservare, non migrare) |
| Ambiente | container temporaneo — **quanto non è pubblicato va perso** |

**Attenzione al nome:** un prompt ha indicato il repository come `appestetista/imprenditori`.
Quel repository **non esiste**. Verificato con `list_repos`: l'unico repository `appestetista`
contenente "imprenditori" è `consorzio-imprenditori-app`. Trattalo come abbreviazione.

---

## 2. COSA È STATO FATTO IN QUESTA SESSIONE

| # | Incarico | Esito |
|---|---|---|
| 1 | Controlli preliminari (3 giri) | ✅ superati — repo, branch, commit, working tree puliti |
| 2 | **PROMPT 01** — Audit completo della trasformazione agentica | ✅ completato, consegnato **solo in chat** (era richiesto di non creare file). Chiuso con `STOP - PROBLEMA ARCHITETTURALE` |
| 3 | **PROMPT 05** — Fattibilità ARIA su Manus | ✅ completato → `FATTIBILITA_ARIA_LIBERA_MANUS.md` |
| 4 | Conservazione su Git (branch + commit + PR) | ⚠️ **parziale** — commit creato in locale, **push bloccato da 403** |
| 5 | **PROMPT 05-R** — Rigenerazione dell'audit di fattibilità | ✅ completato → `FATTIBILITA_ARIA_LIBERA_MANUS.md` riscritto (704 righe, 37.887 byte) |

**Nessun file di codice è mai stato modificato in questa sessione.**

---

## 3. STATO GIT REALE — LEGGERE PRIMA DI TOCCARE GIT

```
branch corrente:  main
HEAD:             6f6c151f8f6418dfc921303a636db8455a0f51ce
origin/main:      6f6c151f8f6418dfc921303a636db8455a0f51ce   (divergenza 0 0)

branch locali:
  main                                  6f6c151
  docs/audit-fattibilita-aria-manus     3a3963f  ← CONTIENE LAVORO NON PUBBLICATO
  claude/preliminary-repo-check-3bg09l  6f6c151

file non tracciati:
  FATTIBILITA_ARIA_LIBERA_MANUS.md
  STAFFETTA.md

branch su origin:  solo refs/heads/main
```

### 3.1 Il blocco 403 — non è un problema di rete

Il push è stato tentato per due canali distinti, entrambi respinti:

```
git push -u origin docs/audit-fattibilita-aria-manus
  → 403  (5 tentativi con attesa progressiva 2/4/8/16s)

API GitHub (create_branch via MCP)
  → 403 "Resource not accessible by integration"
```

**Diagnosi verificata:** non è il proxy (`recentRelayFailures` vuoto) e non è la rete
(`git ls-remote` funziona regolarmente). L'integrazione GitHub di questa sessione ha il
repository **in sola lettura**.

Nota: `list_repos` riporta `can_push: true`, ma riflette i permessi dell'**account**, non quelli
dell'integrazione che agisce nella sessione.

**Rimedio (solo Giacomo o un amministratore):** claude.ai → Impostazioni → Connettori → GitHub,
abilitando il repository in scrittura per questo ambiente. Il README del proxy prescrive di non
insistere sui 403 ma di segnalarli: non riprovare in loop.

### 3.2 Da preservare

Il branch `docs/audit-fattibilita-aria-manus` contiene il commit `3a3963f`
("docs: aggiunge audit fattibilita ARIA Manus", 435 righe) **mai pubblicato**.
Non cancellarlo prima di aver messo in salvo il contenuto.

---

## 4. NUMERI VERIFICATI — usali, non ricontarli

| Metrica | Valore | Comando che lo produce |
|---|---|---|
| Pagine registrate | **54** | `grep -cE '^\s+"[A-Za-z]+":' src/pages.config.js` |
| File pagina | **54** | `ls src/pages/*.jsx \| wc -l` |
| Componenti | **401** | `find src/components -name '*.jsx' \| wc -l` |
| Funzioni Base44 | **65** | `find base44/functions -maxdepth 1 -mindepth 1 -type d \| wc -l` |
| — con `entry.ts` | **65** (tutte) | `find base44/functions -name 'entry.ts' \| wc -l` |
| Entità referenziate | **60** | `grep -rhoE "base44\.entities\.[A-Za-z0-9_]+" src base44 \| sed 's/.*\.//' \| sort -u \| wc -l` |
| Schemi entità presenti | **4** | `ls base44/entities/*.jsonc \| wc -l` |
| Funzioni con `asServiceRole` | **46** | `grep -lE "asServiceRole" base44/functions/*/entry.ts \| wc -l` |
| Funzioni con controllo admin | **23** | `grep -lE "role !== 'admin'" base44/functions/*/entry.ts \| wc -l` |
| Funzioni senza `auth.me()` | **6** | verifica per file |
| Controlli `permissions.*` nel frontend | **2** (su 14 sezioni) | `grep -rnoE "permissions\??\.[a-z_]+" src` |
| `.list()` senza filtro | **105** | conteggio su `src` |
| Punti con `cost_usd` | **2** (uno è fisso) | `grep -rn "cost_usd" src base44` |
| Righe totali | ~127.000 | `wc -l` su sorgenti |

### 4.1 Correzioni già applicate — non reintrodurle

Il primo audit (PROMPT 01) conteneva tre errori di conteggio, corretti in PROMPT 05-R:

| Dato | Valore errato | **Valore corretto** |
|---|---|---|
| Funzioni Base44 | 71 | **65** |
| Entità referenziate | 59 | **60** |
| Funzioni con controllo admin | 24 | **23** |

Se trovi 71 / 59 / 24 in materiale precedente, è superato.

---

## 5. I QUATTRO BLOCCHI ARCHITETTURALI

### B1 — Non esiste l'entità azienda · GRAVITÀ ALTA

```
grep -rnE "company_id|tenant_id|organization_id|azienda_id|org_id|sede_id|reparto_id" src base44
  → NESSUNA OCCORRENZA
```

L'azienda **è** il record utente. In `src/components/utils/normalizeUser.jsx` circa 50 campi
aziendali stanno su `User`: `company_name`, `vat_number`, `codice_fiscale`, `codice_sdi`,
`forma_giuridica`, `regime_fiscale`, `periodicita_iva`, `settore`, `ateco_code`,
`fatturato_annuo`, `numero_dipendenti`, `numero_soci`, `capitale_sociale`, indirizzo completo.

`CompanyBranch` esiste ma è filtrata per `user_email` (`ComplianceAziendale.jsx:180`) — è una
sede *dell'utente*, non *dell'azienda* — ed è usata da **una sola pagina**.

**Conseguenze:** un'azienda con due persone non è rappresentabile; incarichi, costi e limiti non
sono attribuibili all'azienda; la separazione dati fra aziende non è nemmeno esprimibile; la
priorità 2 di prodotto (attività, progetti, **deleghe**) è irrealizzabile.

### B2 — Modello dati non ispezionabile · GRAVITÀ ALTA

**4 schemi su 60 entità.** Presenti solo: `AILimitsConfig`, `AppStats`, `CoefficienteRedditivita`,
`UserStats`. Le altre 56 — incluse `User`, `Event`, `Message`, `ChatConversation`, `UsageLog`,
`Nota`, `Cartella`, `FinancialGrant` — esistono **solo dentro Base44**.

Non si possono conoscere campi, obbligatorietà, indici né regole di accesso.

### B3 — Nessun webhook, nessuna verifica di firma · GRAVITÀ ALTA

```
grep -rn "webhook" src base44 -i
  → 1 solo risultato: src/pages/AppPreview.jsx:162 (regex in un generatore di mockup)

grep -rniE "hmac|createHmac|x-signature|timingSafeEqual|verifySignature" src base44
  → solo falso positivo: "fetc[hMac]roData"
```

### B4 — L'interruzione non esiste · GRAVITÀ ALTA

**Non è "solo interfaccia": è del tutto scollegata.** In `src/components/home/useStreamingAI.jsx`:

- riga 34 — crea `new AbortController()`
- riga ~72 — `base44.functions.invoke('consultaAI', {...})` **senza passare il `signal`**
- riga 77 — controlla `controller.signal.aborted` **dopo** che l'attesa è conclusa
- `abort()` (riga 173) — **nessun chiamante**: `Home.jsx:59` destruttura solo `{ streamAI }`

Il costo è sempre sostenuto. L'utente che crede di annullare non annulla nulla.

---

## 6. CODICE MORTO — ~1.060 righe recuperabili

| File | Righe | Perché è morto |
|---|---|---|
| `src/components/home/DecisionResponse.jsx` | 546 | nessun file lo importa |
| `src/components/home/generateAnalysisPdf.jsx` | 383 | importato solo da `DecisionResponse` |
| `src/components/home/OperationalPlan.jsx` | ~90 | importato solo da `DecisionResponse` |
| `src/components/ProtectedRoute.jsx` | ~45 | mai importato **e rotto** (vedi sotto) |
| `abort()` in `useStreamingAI.jsx` | — | nessun chiamante |

**`ProtectedRoute` è rotto**: richiede da `useAuth()` le proprietà `authChecked` e
`checkUserAuth`, che `AuthContext.jsx` **non espone**
(`grep -c "authChecked" src/lib/AuthContext.jsx` → 0). Se montato, darebbe caricamento infinito.

`AuthContext` espone: `user, isAuthenticated, isLoadingAuth, isLoadingPublicSettings, authError,
appPublicSettings, logout, navigateToLogin, checkAppState, refreshUser`.

**Il renderer vivo è `SimpleAIResponse.jsx`** (importa `StreamingReveal`, `ContextFollowup`,
`EntertainQuestions`, `WebSearchBanner`, `ThinkingProgressBar`, `AIThinkingAnimation`).

---

## 7. ELEMENTI RIUTILIZZABILI — non riscriverli

### `src/components/fiscalita/praticaStateMachine.jsx` · **VIVO, di buona fattura**

Importato da `ConsultantPraticheList.jsx`, `ConsultantPraticaView.jsx`, `UserPraticaView.jsx`.
Esporta 7 elementi: `canTransition`, `getAvailableTransitions`, `canUploadDocument`,
`createHistoryEvent`, `createDocumentUploadEvent`, `STATUS_LABELS`, `TRANSITION_LABELS`.

Contiene 9 stati (`pending`, `assigned`, `in_analysis`, `docs_requested`, `docs_received`,
`report_ready`, `in_progress`, `completed`, `cancelled`), transizioni ammesse, **attori
autorizzati per transizione**, permessi di caricamento documenti, eventi di storico con
`timestamp`/`actor_email`/`actor_role`, etichette in italiano.

**È il modello architetturale già scritto per gli incarichi agentici.** Manca solo l'attore
automatico e gli stati della delega esterna.

### `src/components/home/OperationalPlan.jsx` · morto ma **corretto**

Schema già previsto: `titolo_piano`, `durata_totale`, `budget_stimato`, `fasi[]` con `numero`,
`nome`, `durata`, **`responsabile`**, **`costo_stimato`**, `azioni[]`. Sono esattamente i campi
che servono per approvare un incarico. Va **ricollegato**, non riscritto.

### Altri

| Elemento | Percorso | Perché serve |
|---|---|---|
| `classifyIntent.jsx` | `src/components/home/` | 7 categorie, ~400 parole chiave, **costo zero** — instradatore già pronto |
| `consultaAI/entry.ts` | `base44/functions/` | modello di chiamata a motore esterno: chiave da env, timeout, 3 livelli di degrado, costo reale, campo `provider` |
| `deleteMessage/entry.ts` | `base44/functions/` | **unico** esempio di autorizzazione per singolo record |
| `wbFetchCache.jsx` | `src/components/import-export/` | cache + limite concorrenza + ritentativo con attesa progressiva (1s, 2s, 4s) |
| `AttachmentMenu.jsx` | `src/components/home/` | caricamento a 3 vie già funzionante |
| Sistema documentale | `CartellaView`, `FileStrip`, `Cartella`, `FileCartella`, `Nota` | archiviazione risultati |
| `AILimitsConfig` | `base44/entities/` | limiti configurabili da database |
| `PraticaTimeline.jsx` | `src/components/fiscalita/` | visualizzatore cronologia pronto |

---

## 8. RISCHI APERTI

### Sicurezza

| # | Rischio | Prova |
|---|---|---|
| S1 | **Limite AI aggirabile**: `checkAndTrackAIUsage` prende `user_email` dal corpo della richiesta e non lo confronta mai con `user.email` di `auth.me()` | `base44/functions/checkAndTrackAIUsage/entry.ts` |
| S2 | **Contatore scritto dal browser**: `base44.auth.updateMe({ consulenze_usate_mese: newCount })` | `src/pages/Home.jsx` |
| S3 | **Nessuna protezione di rotta**: ogni pagina raggiungibile da URL | `src/App.jsx` |
| S4 | 46 funzioni su 65 usano `asServiceRole` (bypassa le regole di accesso) | conteggio |
| S5 | 6 funzioni senza `auth.me()`: `scheduledGrantFetch`, `sendAstaReminders`, `sendConsultationReminders`, `sendEventWhatsAppNotification`, `updateUserStats`, `verifyInvite` (solo l'ultima intenzionalmente pubblica) | verifica per file |
| S6 | Impersonificazione con stato in `sessionStorage`, verifica non ripetuta per operazione | `ImpersonationContext.jsx` |

### Separazione dati

- **105 `.list()` senza filtro**, incl. `User.list()` ×26 e `Consultant.list()` ×26.
- Alcune sono in componenti **accessibili a non-admin**: `InviteEventDialog`, `EventZoneManager`,
  `ConsultantBubble`, `QRCodePrenotazioniTab`, `RequestDetailView`.
- **Se le regole di accesso Base44 non filtrano, un utente qualsiasi che apra il dialogo di
  invito evento ottiene l'elenco di tutte le aziende con i dati fiscali.**
- ⚠️ **NON VERIFICABILE dal repository** — non dichiararlo né sicuro né compromesso. Va
  controllato nella console Base44.

### Permessi

- 14 sezioni definite in `assignUserType/entry.ts`, **2 verificate** nel frontend
  (`CulturaAziendale.jsx:204`, `AdminPanel.jsx:257`).
- Ruoli reali: `admin`, `user`, `consulente` — **3 su 9** previsti. Mancano: proprietario
  piattaforma, titolare, dirigente, responsabile, dipendente, collaboratore, sola lettura.
- `AdminGuard` è client-side: reindirizza, non impedisce il caricamento dati.

### Costi

- `cost_usd` in **2 soli punti**, di cui uno è il valore **fisso inventato** `0.002`
  (`useStreamingAI.jsx:59`).
- **34 superfici AI non misurate** (20 funzioni server + 14 chiamate `InvokeLLM` dal browser).
- Nessun budget, nessuna soglia, nessun costo stimato **prima** dell'esecuzione.
- Registrazione *fire-and-forget* (`.catch(() => {})`): se il log fallisce, il costo è sostenuto
  ma non registrato.
- Prezzi cablati come costanti (`0.00000015` / `0.00000060`).
- `scheduledGrantFetch` (359 righe) fa scraping di ~15 portali: **costo fisso indipendente dal
  numero di clienti**.

### Affidabilità

- Una sola barriera d'errore (`AnalysisErrorBoundary.jsx`), confinata a import/export.
- **15 file con `catch` silenziosi.**
- `consultaAI` nasconde deliberatamente gli errori (4 livelli di degrado): un guasto sistematico
  è indistinguibile dal funzionamento normale.
- Il salvataggio conversazione può fallire silenziosamente (`saveConversation` in `Home.jsx`).

---

## 9. CONTRADDIZIONI APERTE

| # | Contraddizione | Prova |
|---|---|---|
| 1 | **Prezzo: obiettivo 50 € vs 39 € cablato** in 5+ punti, incluso l'identificativo dato `impresa_39` che finisce nel database | `Pricing.jsx`, `PremiumAIGate.jsx` |
| 2 | **IVA**: dichiarata decisione aperta, ma `Pricing.jsx` scrive già "IVA esclusa" | `Pricing.jsx` |
| 3 | **Due sistemi di limite paralleli**: 50 consulenze (client, aggirabile) e 500.000 token (server, solido), non riconciliati | `Home.jsx`, `consultaAI/entry.ts` |
| 4 | FAQ promettono "strumenti gratuiti illimitati", ma quegli strumenti usano `InvokeLLM` e generano costo non misurato | `Pricing.jsx` |
| 5 | `useStreamingAI` **non fa streaming**: simula l'effetto macchina da scrivere (il commento nel file lo ammette) | `useStreamingAI.jsx` |
| 6 | **Segnaposto in produzione**: `INSERISCI_IBAN` e `INSERISCI_NUMERO` | `Pricing.jsx:276`, `:287` |
| 7 | Stripe fra le dipendenze, **zero uso**; il pagamento è per bonifico manuale | `package.json` |
| 8 | `manifest.json` referenziato in `index.html` ma **inesistente** → 404 | `index.html` |
| 9 | Due librerie date: `moment` **e** `date-fns` | `package.json` |
| 10 | Due domini: `695e2f74bb7d2636b5606a98.base44.app` e `app.consorzioimprenditori.com` | funzioni Base44 |
| 11 | Dominio Supabase (`qtrypzzcjebvfcihiynt.supabase.co`) in una funzione — **non spiegato** | funzioni Base44 |
| 12 | ~4.500 righe di logica server senza interfaccia: `calcolaImposte` (611), `exportDecisionEngine` (579), `wtoTradeIntelligence` (530), `confrontoRegimi`, `simulateFiscal`, `stressTest`, `logisticsQuote`… | 34 funzioni non invocate dal frontend |

---

## 10. DOCUMENTI MANCANTI — NON INVENTARLI

Verificato **sull'intera cronologia Git**, non solo sull'albero corrente:

```
git log --all --diff-filter=A --name-only --pretty=format: | sort -u | grep -i 'md$'
  → README.md      (unico file .md mai aggiunto nella storia del repository)
```

| Documento | Stato |
|---|---|
| `AGENTS.md` | **mai esistito** |
| `CLAUDE.md` | **mai esistito** |
| `MANUALE_OPERATIVO_APP_IMPRENDITORI_AGENTICA.md` | **mai esistito** |
| Documento della staffetta | **mai esistito** — questo file lo crea per la prima volta |
| `.github/`, `.claude/`, `docs/` | le cartelle non esistono |
| Documentazione ufficiale Manus | **assente** |

**`grep -ri "manus"` sull'intero repository → zero risultati.**

Conseguenza da tenere ferma: **non si può affermare nulla sulle capacità di Manus**. I requisiti
che dipendono dal suo contratto di interfaccia (webhook, firma, annullamento, formato risultati)
non sono progettabili finché la documentazione non arriva.

---

## 11. DECISIONI APERTE PER GIACOMO

### Bloccanti — senza risposta non si progetta

1. **Un'azienda può avere più persone?** Determina se è un'aggiunta o una ricostruzione del
   modello dati. È la decisione più importante del progetto.
2. **Si esportano gli schemi delle 56 entità mancanti da Base44?**
3. **Esiste documentazione ufficiale di Manus?**
4. **La sostituibilità del motore è un requisito o un auspicio?** Determina l'ordine dei lavori.
5. **Chi costruisce il piano: ARIA o Manus?**

### Di responsabilità

6. Quali azioni ARIA può compiere senza chiedere approvazione?
7. Quale soglia di spesa fa scattare l'approvazione obbligatoria?
8. Chi risponde di un'azione sbagliata compiuta dal motore?
9. Si possono inviare documenti aziendali dei clienti a un motore esterno? Con quale base
   giuridica?
10. Un incarico annullato ma già avviato: chi ne paga il costo?
11. Chi risponde di un obbligo di compliance generato dall'AI e risultato errato?

### Di prodotto

12. Prezzo definitivo: 39 € o 50 €? E l'identificativo `impresa_39` già nei dati?
13. IVA inclusa o esclusa?
14. Quali dei 9 ruoli servono nella prima versione?
15. I limiti sono per azienda, per utente, o entrambi?
16. **Simulatore App** (41 componenti): canale commerciale attivo o residuo?
17. **Import/Export** (56 componenti): quante aziende lo usano davvero?
18. **Video** (3 pagine): impegno verso i soci o accessorio?
19. **Aste immobiliari**: attinenza al core + **liceità dello scraping** da `gobid.it` e
    `asteannunci.it`?
20. Valori reali per `INSERISCI_IBAN` e `INSERISCI_NUMERO`.

---

## 12. TRAPPOLE — NON RIPETERE QUESTI ERRORI

| Trappola | Perché |
|---|---|
| `src/pages.config.js` | **File AUTO-GENERATO** (dichiarato nella sua intestazione). Modificarlo a mano viene sovrascritto da Base44 |
| `src/lib/AuthContext.jsx`, `src/api/base44Client.js`, `src/lib/app-params.js` | Nucleo di autenticazione. **Esclusi da lint e typecheck** (`eslint.config.js` e `jsconfig.json` escludono `src/lib/**` e `src/api`): un errore qui non verrebbe intercettato |
| `base44/functions/assignUserType/entry.ts` | Decide chi accede all'app. Un errore blocca **tutti** gli utenti |
| `motoreCalcoloFiscale.jsx`, `useTabelleContributive.jsx` | Calcoli con conseguenze fiscali reali |
| `src/components/ui/` (57 file) | shadcn/ui — base di tutta l'interfaccia |
| I 4 schemi in `base44/entities/` | Gli unici schemi esistenti |
| Eliminare aree "inutili" | `AppProject`, `AstaSalvata`, `Video` potrebbero contenere dati reali di clienti. `VideoVisitContext` e `VantaggiSideTab` sono montati in `Layout.jsx`, quindi globali |
| `npm install` | **Vietato** negli audit finora. `node_modules` è assente → lint, typecheck e build **non eseguibili** |
| Dichiarare test superati | **Nessun test esiste**: nessuno script `test`, nessun framework fra le dipendenze |
| Insistere sui 403 | Il README del proxy prescrive di segnalarli, non di riprovare in loop |

---

## 13. PIANO PROGRESSIVO PROPOSTO — **PROPOSTA, non avviato**

Ordine determinato dalle dipendenze tecniche.

| Fase | Contenuto | Prerequisito |
|---|---|---|
| 0 | Esportare gli schemi delle 56 entità mancanti | Decisione 2 |
| 1 | Decidere e realizzare il modello azienda | Decisione 1 |
| 2 | Rendere i limiti non aggirabili e misurare tutti i costi | Decisioni 7, 15 |
| 3 | Applicare i permessi alle 12 sezioni scoperte e proteggere le rotte | Decisione 14 |
| 4 | **Costruire l'adattatore di motore** (interfaccia interna unica) | Decisione 4 |
| 5 | Entità incarico + coda + stati, generalizzando `praticaStateMachine` | Fasi 0, 1 |
| 6 | Approvazioni con costo stimato preventivo | Decisioni 6, 7, 8 |
| 7 | Webhook con verifica di firma | Decisione 3 |
| 8 | Interruzione reale e ripresa | Fase 5 |
| 9 | Ricollegare `OperationalPlan`/`DecisionResponse`, dare schema a `consultaAI` | Fase 5 |
| 10 | Integrazione Manus tramite l'adattatore | Tutte le precedenti |

### Regola non negoziabile

**Lo strato di astrazione (fase 4) va costruito PRIMA della prima riga di integrazione con
Manus.** Integrare prima e astrarre dopo non funziona: il formato del motore si diffonde
ovunque. Lo dimostra il caso presente — i 34 punti che oggi chiamano `InvokeLLM` direttamente
sono il risultato esatto di questo schema applicato a OpenAI.

---

## 14. PUNTO DI RIPRESA PER LA PROSSIMA SESSIONE

### Da fare per prime cose

1. **Pre-flight**: verificare repo, `git checkout main`, `git pull --ff-only origin main`,
   `git status --short`, `git rev-parse HEAD`. Atteso: `6f6c151…`, working tree con i due file
   non tracciati.
2. **Mettere in salvo il lavoro non pubblicato** (§ 3.2) — o sbloccando il 403, o esportando i
   file. Il container è temporaneo.
3. **Leggere `FATTIBILITA_ARIA_LIBERA_MANUS.md`** (704 righe): contiene la matrice completa dei
   15 requisiti con prove, rischi e architettura proposta.

### Da chiedere a Giacomo prima di progettare

Le 5 decisioni bloccanti del § 11. Senza le prime tre, qualunque progettazione
dell'integrazione Manus sarebbe costruita su ipotesi.

### Metodo da mantenere

- Etichettare sempre **VERIFICATO / NON VERIFICATO / PROPOSTA**.
- Ogni affermazione tecnica con prova: file, percorso, riga o comando.
- Non confondere l'esistenza del frontend con l'esistenza della logica.
- Non dichiarare funzionante ciò che non è stato provato.
- Non completare da soli le decisioni di prodotto mancanti.
- Se due elementi si contraddicono, riportarli entrambi senza scegliere.

---

## 15. FILE PRODOTTI IN QUESTA SESSIONE

| File | Righe | Stato |
|---|---|---|
| `FATTIBILITA_ARIA_LIBERA_MANUS.md` | 704 (37.887 byte) | non tracciato, **non pubblicato** |
| `STAFFETTA.md` | questo file | non tracciato, **non pubblicato** |
| commit `3a3963f` su `docs/audit-fattibilita-aria-manus` | 435 | in locale, **non pubblicato** |

L'audit PROMPT 01 (inventario completo di pagine, entità, funzioni, punteggi di valore,
esperienza d'uso, sostenibilità dei 50 €) esiste **solo nella cronologia della conversazione
originale**: non è mai stato salvato come file, perché quel prompt lo vietava espressamente.
Se serve, va rigenerato.
