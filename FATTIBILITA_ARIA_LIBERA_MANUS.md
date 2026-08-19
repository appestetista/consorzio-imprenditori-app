# FATTIBILITÀ ARIA LIBERA / MANUS

Audit tecnico di fattibilità per trasformare l'app esistente in una web app agentica
aziendale collegata a Manus tramite API ufficiali.

**Audit in sola lettura. Nessun file di codice modificato. Nessuna chiamata a Manus effettuata.**

---

## 1. SINTESI ESECUTIVA

L'app è **reale e sostanziosa**: 54 pagine, 401 componenti, 65 funzioni lato server, 60 entità
dati. Non è un prototipo, e non va ricostruita.

**ARIA come interfaccia libera è tecnicamente fattibile.** Esiste già il punto di ingresso a
testo libero, esiste la piattaforma backend per costruire il connettore, ed esistono due
componenti di buona fattura riutilizzabili come fondamenta.

**L'integrazione con Manus non è oggi progettabile.** Non per un limite dell'app, ma perché
mancano contemporaneamente tre cose: (a) l'infrastruttura minima da committente — nessun
webhook, nessuna coda, nessuna interruzione reale; (b) il soggetto per conto del quale
commissionare — l'azienda non esiste come entità; (c) **la documentazione ufficiale di Manus**,
di cui non c'è traccia nel repository.

**Quattro blocchi tecnici, tutti verificati con prova:**

1. **Nessuna entità azienda.** `grep -rnE "company_id|tenant_id|organization_id|azienda_id|org_id"`
   su `src` e `base44` → **zero occorrenze**. L'azienda coincide con il record utente.
2. **Nessun endpoint webhook e nessuna verifica di firma.** Ricerca su tutto il repository:
   una sola occorrenza della parola "webhook", ed è una espressione regolare in un generatore
   di mockup (`AppPreview.jsx:162`). Zero HMAC, zero verifica firma.
3. **L'annullamento non esiste.** Non è "solo interfaccia", come si potrebbe supporre:
   il `signal` dell'`AbortController` **non viene mai passato alla chiamata di rete**, e la
   funzione `abort()` **non è invocata da nessun file** — `Home.jsx:59` destruttura solo
   `{ streamAI }`. È codice morto che protegge nulla.
4. **Modello dati non ispezionabile.** 60 entità referenziate, **4 schemi presenti**.
   Il 93% del modello dati esiste solo dentro Base44.

**Due fondamenta di qualità già scritte, da riusare e non riscrivere:**

- **`praticaStateMachine.jsx` — viva.** Macchina a stati completa: 9 stati, transizioni
  ammesse, attori autorizzati per transizione, permessi di caricamento documenti, eventi di
  storico con timestamp e attore. Importata da 3 file. È il modello architetturale per gli
  incarichi agentici.
- **`OperationalPlan.jsx` — morta ma corretta.** Renderer di piano con fasi, durata,
  **responsabile** e **costo stimato** per fase: esattamente i campi che servono per approvare
  un incarico. È irraggiungibile perché il suo unico importatore, `DecisionResponse.jsx`
  (546 righe), **non è importato da nessuno**.

**Conclusione:** fattibile, ma non ancora progettabile. Servono tre input da Giacomo prima di
scrivere una riga: la documentazione Manus, gli schemi delle entità, e la decisione
sull'azienda multi-utente.

---

## 2. PERIMETRO E METODOLOGIA

**Perimetro:** l'intero repository `appestetista/consorzio-imprenditori-app` al commit indicato
al § 3. Nessuna fonte esterna. Nessun dato da altri repository.

**Metodo:** lettura diretta dei file e ricerche testuali sull'albero completo (esclusi `.git` e
`node_modules`, quest'ultimo assente). Ogni affermazione tecnica riporta file, percorso, riga o
comando. Le conclusioni dell'audit precedente **non sono state assunte come corrette**: ogni
verifica mirata è stata rieseguita da zero, e dove il risultato differisce lo dichiaro (§ 14).

**Etichette usate:**

- **VERIFICATO** — dimostrato da file, percorso, comando o configurazione presenti nel repository.
- **NON VERIFICATO** — non dimostrabile dal repository con i controlli consentiti.
- **PROPOSTA** — miglioramento futuro, non esistente e non approvato.

**Cosa questo audit non può fare:** non può accertare cosa Manus sappia fare. La parola "manus"
non compare in nessun punto del repository (`grep -ri` → zero risultati). Ogni affermazione sulle
capacità di Manus sarebbe invenzione; non ne vengono fatte.

---

## 3. COMMIT INIZIALE ANALIZZATO

```
Repository:   appestetista/consorzio-imprenditori-app
Remote:       https://github.com/appestetista/consorzio-imprenditori-app
Branch:       main
HEAD:         6f6c151f8f6418dfc921303a636db8455a0f51ce
Commit:       "Update base44 packages" — base44-builder[bot], 23 lug 2026
git pull --ff-only origin main:  Already up to date.
git status --short:              (vuoto — working tree pulito)
```

---

## 4. DOCUMENTI LETTI E DOCUMENTI MANCANTI

### Documenti letti

`README.md` — **unico documento presente nel repository**. Contiene le istruzioni Base44
standard: clonazione, `npm install`, variabili `VITE_BASE44_APP_ID` e
`VITE_BASE44_APP_BASE_URL`, pubblicazione da Base44.com.

### Documenti obbligatori mancanti

| Documento | Stato |
|---|---|
| `AGENTS.md` | **ASSENTE** |
| `CLAUDE.md` | **ASSENTE** |
| `MANUALE_OPERATIVO_APP_IMPRENDITORI_AGENTICA.md` | **ASSENTE** |
| Documento aggiornato della staffetta | **ASSENTE** |
| Altre regole applicabili | **ASSENTI** — `.github/`, `.claude/`, `docs/` non esistono |
| Documentazione ufficiale Manus | **ASSENTE** |

Verifica eseguita non solo sull'albero corrente ma sull'intera cronologia Git:

```
find . -path ./.git -prune -o -type f -iname '*.md' -print
  → ./README.md                     (unico risultato)

git log --all --diff-filter=A --name-only --pretty=format: | sort -u | grep -i 'md$'
  → README.md                       (unico .md mai aggiunto nella storia del repo)

find . -iname '*staffett*' -o -iname '*manuale*' -o -iname '*agentic*'
  → nessun risultato

grep -ri "manus" . --exclude-dir=.git
  → nessun risultato
```

**Il contenuto di questi documenti non viene inventato né dedotto.** Dove un requisito dipende
da essi, è marcato NON VERIFICABILE.

---

## 5. INVENTARIO TECNICO VERIFICATO

### 5.1 Architettura

| Livello | Tecnologia | Prova |
|---|---|---|
| Frontend | React 18.2 + Vite 6.1, JavaScript/JSX | `package.json`; `components.json` → `"tsx": false` |
| Lato server | Deno + TypeScript | `base44/functions/*/entry.ts` → `Deno.serve` |
| Rotte | react-router-dom 6.26 | `src/App.jsx` |
| Stato server | @tanstack/react-query 5.84 | `src/lib/query-client.js` |
| UI | shadcn/ui + Radix + Tailwind 3.4 | `components.json`, `src/components/ui/` |
| SDK | `@base44/sdk` ^0.8.40 | `src/api/base44Client.js` |

### 5.2 Numeri verificati

| Metrica | Valore | Comando |
|---|---|---|
| Pagine registrate | **54** | `grep -cE '^\s+"[A-Za-z]+":' src/pages.config.js` |
| File pagina | **54** | `ls src/pages/*.jsx \| wc -l` |
| Componenti | **401** | `find src/components -name '*.jsx' \| wc -l` |
| Funzioni Base44 | **65** | `find base44/functions -maxdepth 1 -mindepth 1 -type d \| wc -l` |
| — di cui con `entry.ts` | **65** (tutte) | `find base44/functions -name 'entry.ts' \| wc -l` |
| Entità referenziate | **60** | `grep -rhoE "base44\.entities\.[A-Za-z0-9_]+" src base44 \| sed 's/.*\.//' \| sort -u \| wc -l` |
| Schemi entità presenti | **4** | `ls base44/entities/*.jsonc \| wc -l` |

### 5.3 Struttura Base44

```
base44/
  config.jsonc      nome app + comandi build (install/build/serve, outputDirectory)
  entities/         4 schemi: AILimitsConfig, AppStats, CoefficienteRedditivita, UserStats
  functions/        65 cartelle, ciascuna con entry.ts (Deno.serve)
```

Superfici SDK usate: `base44.entities.<E>`, `base44.functions.invoke`,
`base44.auth.{me,updateMe,logout,redirectToLogin}`,
`base44.integrations.Core.{InvokeLLM,SendEmail,UploadFile,ExtractDataFromUploadedFile}`,
`base44.appLogs.logUserInApp`, `base44.asServiceRole`.

### 5.4 Autenticazione e sessioni — VERIFICATO

`src/lib/AuthContext.jsx` → `base44.auth.me()` → `normalizeUser()` → `useAuth()`.
Token gestito dall'SDK: letto da parametro URL `access_token` o da
`localStorage['base44_access_token']` (`src/lib/app-params.js`). Nessuna gestione password
nell'app. `src/api/base44Client.js` crea il client con `requiresAuth: true`.

`normalizeUser.jsx` esiste perché `auth.me()` e `User.filter()` restituiscono **forme diverse**
(campi a livello radice contro campi dentro `.data`) — sintomo di modello dati non uniforme.

### 5.5 Modello dati — VERIFICATO (con limite grave)

**4 schemi su 60.** Gli unici ispezionabili sono `AILimitsConfig`, `AppStats`,
`CoefficienteRedditivita`, `UserStats`. Le altre 56 entità — incluse `User`, `Event`, `Message`,
`ChatConversation`, `UsageLog`, `Nota`, `Cartella`, `FinancialGrant` — esistono **solo in Base44**.

Non è possibile sapere quali campi esistano, quali siano obbligatori, quali indici siano
definiti, né quali regole di accesso siano configurate. → **NON VERIFICABILE**

---

## 6. TABELLA DEI REQUISITI

| # | Requisito | Stato | Prova essenziale |
|---|---|---|---|
| 1 | Architettura attuale | ✅ VERIFICATO | § 5.1 |
| 2 | Struttura Base44 | ✅ VERIFICATO | § 5.3 |
| 3 | Autenticazione e sessioni | ✅ VERIFICATO | `AuthContext.jsx`, `app-params.js` |
| 4 | Modello dati | ❓ NON VERIFICABILE | 4 schemi su 60 |
| 5a | Entità **organizzazione** | ❌ NON PRESENTE | grep → zero |
| 5b | Entità **azienda** | ❌ NON PRESENTE | grep → zero; dati aziendali su `User` |
| 5c | Entità **sede** | ⚠️ INSUFFICIENTE | `CompanyBranch`, usata da 1 sola pagina |
| 5d | Entità **reparto** | ❌ NON PRESENTE | grep → zero |
| 5e | Entità **utente** | ✅ VERIFICATO | `User` (built-in Base44) |
| 5f | **Ruolo** | ⚠️ INSUFFICIENTE | 3 ruoli reali su 9 previsti |
| 5g | **Permessi** | ⚠️ INSUFFICIENTE | 14 sezioni definite, **2 verificate** |
| 6 | Separazione dati fra aziende | ❌ NON PRESENTE | nessuna chiave azienda esiste |
| 7 | Controlli permessi UI / server | ⚠️ INSUFFICIENTE | UI: 2 controlli; server: 23 funzioni su 65 |
| 8 | Attività, progetti, deleghe | ❌ NON PRESENTE | nessuna entità corrispondente |
| 8b | Scadenze | ⚠️ INSUFFICIENTE | `ScadenzaFiscale`: 2 riferimenti, 1 solo file |
| 8c | Documenti | ✅ VERIFICATO | `Cartella`, `FileCartella`, `Nota`, `CartellaView` |
| 9 | Sistemi di approvazione | ⚠️ INSUFFICIENTE | esiste per eventi; **zero per azioni AI** |
| 10 | Registri e cronologia | ⚠️ INSUFFICIENTE | `UsageLog` + `createHistoryEvent` (1 dominio) |
| 11a | Costi | ⚠️ INSUFFICIENTE | `cost_usd` in **2 punti**, di cui 1 fisso |
| 11b | Budget e soglie | ❌ NON PRESENTE | grep → nessun sistema di soglia |
| 11c | Avvisi di costo | ⚠️ INSUFFICIENTE | barre di consumo, nessun avviso preventivo |
| 11d | Numero massimo tentativi | ⚠️ INSUFFICIENTE | solo `wbFetchCache.jsx` e `consultaAI` |
| 12 | Funzioni asincrone | ❌ NON PRESENTE | nessuna coda, nessun job |
| 13 | Endpoint webhook | ❌ NON PRESENTE | zero |
| 14 | Verifica firme webhook | ❌ NON PRESENTE | zero HMAC |
| 15 | Interruzione reale | ❌ NON PRESENTE | signal non passato; `abort()` mai chiamato |
| 16 | Gestione errori e tentativi | ⚠️ INSUFFICIENTE | 1 ErrorBoundary; 15 file con catch silenziosi |
| 17 | Capacità utili per incarichi | ⚠️ INSUFFICIENTE | § 8 |
| 18 | Componenti riutilizzabili | ✅ VERIFICATO | § 8 |
| 19 | Codice non raggiungibile | ✅ VERIFICATO | § 6.1 |
| 20 | Dipendenze fra elementi | ✅ VERIFICATO | § 6.2 |
| 21 | Rischi | ✅ VERIFICATO | § 9 |
| 22 | Fattibilità integrazione Manus | ❓ NON VERIFICABILE | nessuna documentazione |
| 23 | Requisiti non verificabili | ✅ VERIFICATO | § 15 |
| 24 | Architettura per sostituibilità | 🔵 PROPOSTA | § 10 |
| 25 | Decisioni di prodotto | ✅ VERIFICATO | § 11 |

**Riepilogo:** 11 verificati · 11 presenti ma insufficienti · 10 non presenti · 3 non verificabili · 1 proposta.

### 6.1 Codice non raggiungibile — VERIFICATO

| File | Righe | Stato | Prova |
|---|---|---|---|
| `src/components/home/DecisionResponse.jsx` | 546 | **MORTO** | nessun file lo importa |
| `src/components/home/OperationalPlan.jsx` | ~90 | **MORTO** | importato solo da `DecisionResponse` |
| `src/components/home/generateAnalysisPdf.jsx` | 383 | **MORTO** | importato solo da `DecisionResponse` |
| `src/components/ProtectedRoute.jsx` | ~45 | **MORTO e ROTTO** | mai importato; usa 2 proprietà inesistenti |
| `abort()` in `useStreamingAI.jsx` | — | **MORTO** | nessun chiamante |

Circa **1.060 righe di codice funzionante ma irraggiungibile**, di cui la parte più preziosa per
il progetto agentico (piano strutturato, PDF, badge di attendibilità).

`ProtectedRoute` richiede da `useAuth()`: `isAuthenticated, isLoadingAuth, authChecked, authError,
checkUserAuth`. `AuthContext.jsx` espone: `user, isAuthenticated, isLoadingAuth,
isLoadingPublicSettings, authError, appPublicSettings, logout, navigateToLogin, checkAppState,
refreshUser`. **`authChecked` e `checkUserAuth` non esistono** (`grep -c "authChecked"
src/lib/AuthContext.jsx` → 0). Se montato, produrrebbe caricamento infinito.

### 6.2 Dipendenze verificate

- `Layout.jsx` monta 5 provider annidati e 8 elementi globali su ogni pagina.
- Comunicazione fra componenti via **eventi DOM globali** (`load-conversation`, `new-chat`,
  `toggle-chat-sidebar`) — accoppiamento non tracciabile staticamente.
- `src/pages.config.js` è **auto-generato** (dichiarato nell'intestazione del file): modificarlo
  a mano viene sovrascritto da Base44.
- `praticaStateMachine.jsx` → importato da `ConsultantPraticheList.jsx`,
  `ConsultantPraticaView.jsx`, `UserPraticaView.jsx`.
- `SimpleAIResponse.jsx` → importa `StreamingReveal`, `ContextFollowup`, `EntertainQuestions`,
  `WebSearchBanner`, `ThinkingProgressBar`, `AIThinkingAnimation`. È il renderer **vivo**.

---

## 7. BLOCCHI TECNICI

### B1 — Non esiste l'azienda · GRAVITÀ ALTA

```
grep -rnE "company_id|tenant_id|organization_id|azienda_id|org_id|sede_id|reparto_id" src base44
  → NESSUNA OCCORRENZA
```

L'azienda **è** il record utente: `company_name`, `vat_number`, `codice_fiscale`, `codice_sdi`,
`forma_giuridica`, `regime_fiscale`, `settore`, `ateco_code`, `fatturato_annuo`,
`numero_dipendenti` sono campi di `User` (`src/components/utils/normalizeUser.jsx`).

`CompanyBranch` esiste ma è filtrata per `user_email` (`ComplianceAziendale.jsx:180`), quindi è
una sede *dell'utente*, non *dell'azienda*, ed è usata da una sola pagina.

**Conseguenze:** un'azienda con due persone non è rappresentabile; non si possono attribuire
incarichi, costi o limiti all'azienda; la separazione dei dati fra aziende non è nemmeno
esprimibile; deleghe e progetti condivisi sono irrealizzabili.

### B2 — Nessun webhook, nessuna verifica di firma · GRAVITÀ ALTA

```
grep -rn "webhook" src base44 -i
  → src/pages/AppPreview.jsx:162  (espressione regolare in un generatore di mockup)

grep -rniE "hmac|createHmac|x-signature|x-hub-signature|timingSafeEqual|verifySignature" src base44
  → solo falsi positivi ("fetc[hMac]roData")
```

Un motore esterno asincrono non ha dove notificare il completamento. E un endpoint aggiunto
senza verifica di firma sarebbe chiamabile da chiunque ne conosca l'URL, per dichiarare
incarichi completati, iniettare risultati falsi o innescare costi.

### B3 — L'interruzione non esiste · GRAVITÀ ALTA

Reperto più netto di quanto si potrebbe supporre. In `src/components/home/useStreamingAI.jsx`:

```js
const controller = new AbortController();       // riga 34
...
const aiResponse = await base44.functions.invoke('consultaAI', {   // riga ~72
  message, conversationHistory: conversationHistory || '',
});                                              // ← nessun signal passato
if (controller.signal.aborted) return;           // riga 77 — controllo DOPO l'attesa
```

Il `signal` è controllato solo **dopo** che la chiamata è già stata completata, e non è mai
passato alla chiamata di rete. Inoltre:

```
grep -rn "\.abort()" src --include=*.jsx  (escluso useStreamingAI)
  → NESSUN CHIAMANTE ESTERNO

src/pages/Home.jsx:59:  const { streamAI } = useStreamingAI();   ← abort non è nemmeno estratto
```

**L'annullamento non è "solo visivo": non è collegato a nulla.** Il costo è sempre sostenuto.

### B4 — Modello dati non ispezionabile · GRAVITÀ ALTA

4 schemi su 60 entità. Non è possibile progettare la persistenza di incarichi, stati,
approvazioni e costi su un modello che il codice non descrive.

### B5 — Nessuna infrastruttura asincrona · GRAVITÀ MEDIA

Nessuna coda, nessun job, nessuno stato persistito di lavorazione. Le funzioni Deno sono
richiesta/risposta sincrona. Le automazioni pianificate esistono ma sono configurate in Base44
e **non verificabili dal repository**.

---

## 8. CAPACITÀ GIÀ RIUTILIZZABILI

### C1 — `praticaStateMachine.jsx` · **VIVA, di buona fattura**

`src/components/fiscalita/praticaStateMachine.jsx` (4.740 byte). Esporta 7 elementi:
`canTransition`, `getAvailableTransitions`, `canUploadDocument`, `createHistoryEvent`,
`createDocumentUploadEvent`, `STATUS_LABELS`, `TRANSITION_LABELS`.

Contiene: 9 stati (`pending`, `assigned`, `in_analysis`, `docs_requested`, `docs_received`,
`report_ready`, `in_progress`, `completed`, `cancelled`); mappa delle transizioni ammesse;
**`TRANSITION_ACTORS`** (chi può compiere quale transizione — già per ruolo);
`UPLOAD_PERMISSIONS`; `canTransition()` che restituisce anche la motivazione del rifiuto;
eventi di storico con `timestamp`, `action`, `from_status`, `to_status`, `actor_email`,
`actor_role`, `note`; etichette leggibili in italiano; stati finali e stato `cancelled`.

**È il modello architetturale già scritto per gli incarichi agentici.** Manca solo l'attore
automatico e gli stati propri della delega esterna.

### C2 — `OperationalPlan.jsx` · **MORTA ma corretta**

Schema del piano già previsto: `titolo_piano`, `durata_totale`, `budget_stimato`, `fasi[]` con
`numero`, `nome`, `durata`, **`responsabile`**, **`costo_stimato`**, `azioni[]`.

Prevede già responsabile e costo per fase: i due campi indispensabili per approvare un incarico.
`DecisionResponse.jsx` la accompagna con badge `[VERIFICATO]` / `[STIMA]` / `[DA CONFERMARE]`
sui contenuti generati e con la persistenza del piano
(`ChatConversation.update(id, { ha_piano: true, piano_json: ... })`, riga 389).

**Va ricollegata, non riscritta.**

### C3 — `consultaAI/entry.ts` · modello di chiamata a motore esterno

Già contiene lo scheletro corretto: chiave da variabile d'ambiente
(`Deno.env.get("OPENAI_API_KEY")`), timeout esplicito (`AbortSignal.timeout`), tentativi
progressivi a 3 livelli con degrado controllato, calcolo del costo reale dai token restituiti,
registrazione in `UsageLog` con campo **`provider`** già previsto.

### C4 — Altri elementi riutilizzabili

| Elemento | Percorso | Perché serve |
|---|---|---|
| `classifyIntent.jsx` | `src/components/home/` | 7 categorie, ~400 parole chiave, **costo zero**; è l'instradatore già scritto |
| Caricamento allegati | `src/components/home/AttachmentMenu.jsx` | 3 vie (fotocamera/foto/file) già funzionanti |
| Sistema documentale | `CartellaView`, `FileStrip`, `Cartella`, `FileCartella`, `Nota` | archiviazione risultati |
| `deleteMessage/entry.ts` | `base44/functions/` | **unico** esempio di autorizzazione per singolo record |
| `wbFetchCache.jsx` | `src/components/import-export/` | cache + limite concorrenza + **ritentativo con attesa progressiva (1s, 2s, 4s)** — schema riusabile |
| `AILimitsConfig` | `base44/entities/` | limiti configurabili da database, estensibile a nuove azioni |
| Approvazione eventi | `Event.approval_status` (16 occorrenze) | flusso di approvazione umana già reale |
| `PraticaTimeline.jsx` | `src/components/fiscalita/` | visualizzatore di cronologia già pronto |

---

## 9. RISCHI

### 9.1 Sicurezza

| # | Rischio | Prova | Gravità |
|---|---|---|---|
| S1 | Limite AI aggirabile: `checkAndTrackAIUsage` prende `user_email` dal corpo della richiesta e non lo confronta mai con `user.email` di `auth.me()` | `base44/functions/checkAndTrackAIUsage/entry.ts` | **Alta** |
| S2 | Contatore consumi scritto dal browser | `src/pages/Home.jsx` → `base44.auth.updateMe({ consulenze_usate_mese: newCount })` | **Alta** |
| S3 | Nessuna protezione di rotta: ogni pagina raggiungibile da URL | `src/App.jsx`; `ProtectedRoute` mai importato | **Alta** |
| S4 | 46 funzioni su 65 usano `asServiceRole` (bypassa le regole di accesso) | `grep -lE "asServiceRole" base44/functions/*/entry.ts \| wc -l` → 46 | **Alta** |
| S5 | 6 funzioni senza `auth.me()`: `scheduledGrantFetch`, `sendAstaReminders`, `sendConsultationReminders`, `sendEventWhatsAppNotification`, `updateUserStats`, `verifyInvite` (solo l'ultima intenzionalmente pubblica) | verifica per file | **Alta se invocabili** |
| S6 | Nessuna verifica di firma su ingressi esterni | zero HMAC | **Alta** (futura) |
| S7 | Impersonificazione con stato in `sessionStorage`, verifica non ripetuta per operazione | `ImpersonationContext.jsx` | Media |

### 9.2 Separazione dei dati

| # | Rischio | Prova | Gravità |
|---|---|---|---|
| D1 | **Nessuna chiave azienda esiste**: la separazione fra aziende non è esprimibile | grep → zero | **Alta** |
| D2 | 105 chiamate `.list()` senza filtro nel frontend, incl. `User.list()` ×26 e `Consultant.list()` ×26 | conteggio su `src` | **Alta se le regole Base44 non filtrano** |
| D3 | Alcune `.list()` non filtrate sono in componenti accessibili a non-admin (`InviteEventDialog`, `EventZoneManager`, `ConsultantBubble`, `QRCodePrenotazioniTab`, `RequestDetailView`) | percorsi verificati | **Alta se RLS assente** |
| D4 | Impossibile sapere quali entità abbiano associazione utente | 56 schemi assenti | ❓ NON VERIFICABILE |

### 9.3 Permessi

| # | Rischio | Prova | Gravità |
|---|---|---|---|
| P1 | 14 sezioni di permesso definite, **2 verificate nel frontend** (`CulturaAziendale.jsx:204`, `AdminPanel.jsx:257`) | grep | **Alta** |
| P2 | 3 ruoli reali (`admin`, `user`, `consulente`) contro 9 previsti | grep sui confronti di ruolo | Media |
| P3 | Controllo admin lato server su 23 funzioni su 65 | `grep -lE "role !== 'admin'"` → 23 | Media |
| P4 | `AdminGuard` è client-side: reindirizza, non impedisce il caricamento dei dati | `src/components/admin/AdminGuard.jsx` | Media |

### 9.4 Costi

| # | Rischio | Prova | Gravità |
|---|---|---|---|
| K1 | `cost_usd` compare in **2 soli punti** dell'intero repository, di cui uno è il valore fisso inventato `0.002` | `useStreamingAI.jsx:59`; `consultaAI/entry.ts:195` | **Alta** |
| K2 | Nessun sistema di budget, soglia o tetto di spesa | grep → nessun risultato pertinente | **Alta** |
| K3 | Nessun costo stimato **prima** dell'esecuzione, mai | assenza verificata | **Alta** |
| K4 | Registrazione costi *fire-and-forget*: se il log fallisce, il costo è sostenuto ma non registrato | `.catch(() => {})` in `consultaAI` | Media |
| K5 | Prezzi cablati come costanti (`0.00000015` / `0.00000060`) | `EuroTokenConverter.jsx`, `consultaAI` | Media |
| K6 | Processi pianificati con costo fisso indipendente dal numero di clienti | `scheduledGrantFetch` (359 righe) | **Alta** |

### 9.5 Affidabilità

| # | Rischio | Prova | Gravità |
|---|---|---|---|
| A1 | **Nessuna interruzione reale** (B3) | signal non passato, `abort()` mai chiamato | **Alta** |
| A2 | Nessuna ripresa: tutto sincrono e in memoria; chiudere il browser perde tutto | assenza di stato persistito | **Alta** |
| A3 | Errori AI deliberatamente nascosti: `consultaAI` degrada su 4 livelli e non mostra mai un errore — un guasto sistematico è indistinguibile dal funzionamento normale | `consultaAI/entry.ts` | Media |
| A4 | 15 file con `catch` silenziosi | conteggio | Media |
| A5 | Una sola barriera d'errore, confinata a import/export | `AnalysisErrorBoundary.jsx` | Media |
| A6 | Ritentativi presenti solo in `wbFetchCache.jsx` e nei 3 livelli di `consultaAI` | grep | Media |
| A7 | Il salvataggio della conversazione può fallire silenziosamente | `saveConversation` in `Home.jsx` | Media |

### 9.6 Dipendenza da Manus

| # | Rischio | Gravità |
|---|---|---|
| M1 | **Nessuno strato di astrazione**: `provider` è solo un'etichetta in `UsageLog`, non una scelta architetturale | **Alta** |
| M2 | Modelli cablati: `gpt-4o-mini` ×7, `gpt-4o` ×2, `whisper-1` ×1 | Media |
| M3 | **34 superfici chiamano `InvokeLLM` direttamente**, di cui **14 dal browser** — ognuna sarebbe un punto di modifica separato | **Alta** |
| M4 | Formato webhook, algoritmo di firma e politica di annullamento sono decisi dal motore e **non conoscibili** senza documentazione | **Alta** |
| M5 | Se i risultati restassero sul motore, cambiare motore significherebbe perdere lo storico dei clienti | **Alta** |

---

## 10. ARCHITETTURA PROPOSTA — **PROPOSTA**

> Tutto ciò che segue è **PROPOSTA**: non esiste nel repository e non è approvato.
> Nessuna riga è stata scritta.

### 10.1 Principio guida

**Il motore non deve mai essere l'autorità.** L'app decide chi può, quanto può spendere, cosa
richiede approvazione, e conserva il risultato. Il motore esegue passi già definiti e
autorizzati. Questa è l'unica configurazione in cui Manus resta affiancabile e sostituibile.

### 10.2 Strati proposti

```
   ARIA (interfaccia libera)        ← esiste: Home.jsx + classifyIntent
        ↓
   Comprensione e piano             ← esiste ma morto: OperationalPlan + DecisionResponse
        ↓
   ── CANCELLO DI AUTORIZZAZIONE ── ← da costruire: ruolo + limite + budget + approvazione
        ↓
   Incarico persistito              ← da costruire: entità + coda + stati
        ↓
   Adattatore di motore             ← DA COSTRUIRE PER PRIMO (interfaccia unica interna)
        ↓
   Manus  /  altro motore  /  chiamata diretta
        ↓
   Ricezione firmata del risultato  ← da costruire: webhook + HMAC
        ↓
   Archiviazione + cronologia + costo effettivo   ← esiste in parte: UsageLog, Cartella
```

### 10.3 Regola di sequenza — non negoziabile

**Lo strato di astrazione va costruito prima della prima riga di integrazione con Manus.**

Integrare prima e astrarre dopo non funziona: il formato del motore si diffonderebbe in decine
di punti, e l'astrazione successiva costerebbe più di una riscrittura. Lo dimostra il caso
presente: i 34 punti che oggi chiamano `InvokeLLM` direttamente sono esattamente il risultato
di questo schema applicato a OpenAI.

### 10.4 Interfaccia interna minima proposta

Quattro operazioni, indipendenti dal motore: **commissiona**, **interroga stato**, **annulla**,
**ricevi risultato**. Ogni motore vi si adatta tramite un adattatore dedicato. Gli stati sono
quelli dell'app (generalizzati da `praticaStateMachine`), non quelli del motore.

---

## 11. DECISIONI BLOCCANTI PER GIACOMO

**Senza queste risposte la progettazione non può iniziare**

1. **Un'azienda può avere più persone?** Determina se la trasformazione è un'aggiunta o una
   ricostruzione del modello dati. È la decisione più importante del progetto.
2. **Si esportano gli schemi delle 56 entità mancanti da Base44 nel repository?** Senza, la
   persistenza degli incarichi è cieca.
3. **Esiste documentazione ufficiale di Manus?** Senza, i requisiti 13, 14, 15 e 22 non sono
   progettabili, non solo non implementabili.
4. **La sostituibilità del motore è un requisito o un auspicio?** Determina l'ordine dei lavori
   (§ 10.3).
5. **Chi costruisce il piano: ARIA o Manus?** Determina la sostituibilità per tutto il progetto.

**Di responsabilità — prima di qualsiasi esecuzione**

6. Quali azioni ARIA può compiere senza chiedere approvazione?
7. Quale soglia di spesa fa scattare l'approvazione obbligatoria?
8. Chi risponde di un'azione sbagliata compiuta dal motore?
9. Si possono inviare documenti aziendali dei clienti a un motore esterno? Con quale base
   giuridica e quale informativa?
10. Un incarico annullato ma già avviato: chi ne paga il costo?

**Di prodotto**

11. ARIA accetta qualsiasi obiettivo o solo obiettivi entro un catalogo dichiarato?
12. Quali dei 9 ruoli previsti servono nella prima versione?
13. I limiti sono per azienda, per utente, o entrambi?
14. I risultati restano di proprietà dell'azienda cliente ed esportabili?
15. Per quanto tempo si conserva la cronologia e chi può consultarla?

---

## 12. PIANO PROGRESSIVO — **PROPOSTA, senza implementazione**

Ordine determinato dalle dipendenze tecniche, non dalla preferenza.

| Fase | Contenuto | Perché in questa posizione | Prerequisito |
|---|---|---|---|
| **0** | Esportare gli schemi delle 56 entità mancanti | Ogni fase successiva scrive dati | Decisione 2 |
| **1** | Decidere e realizzare il modello azienda | Nessun incarico è attribuibile senza soggetto | Decisione 1 |
| **2** | Rendere i limiti non aggirabili e misurare tutti i costi | Senza, nessun budget è difendibile | Decisioni 7, 13 |
| **3** | Applicare i permessi alle 12 sezioni scoperte e proteggere le rotte | I permessi sono già assegnati: manca l'applicazione. Miglior rapporto valore/sforzo | Decisione 12 |
| **4** | Costruire l'adattatore di motore (interfaccia interna unica) | **Prima** di qualsiasi integrazione (§ 10.3) | Decisione 4 |
| **5** | Entità incarico + coda + stati, generalizzando `praticaStateMachine` | Base della delega | Fasi 0, 1 |
| **6** | Approvazioni con costo stimato preventivo | Cancello prima dell'esecuzione | Decisioni 6, 7, 8 |
| **7** | Webhook con verifica di firma | Ricezione asincrona sicura | Decisione 3 (documentazione Manus) |
| **8** | Interruzione reale e ripresa | Richiede stato persistito (fase 5) | Decisione 10 |
| **9** | Ricollegare `OperationalPlan` / `DecisionResponse` e dare schema a `consultaAI` | Rende visibile il piano | Fase 5 |
| **10** | Integrazione Manus tramite l'adattatore | Ultima, mai prima della fase 4 | Tutte le precedenti |

**Nessuna di queste fasi è stata avviata. Nessun codice è stato scritto.**

---

## 13. ELENCO COMPLETO DELLE PROVE

### File letti integralmente

`package.json` · `base44/config.jsonc` · `README.md` · `vite.config.js` · `jsconfig.json` ·
`components.json` · `eslint.config.js` · `postcss.config.js` · `.gitignore` · `index.html` ·
`src/main.jsx` · `src/App.jsx` · `src/Layout.jsx` · `src/pages.config.js` ·
`src/api/base44Client.js` · `src/lib/app-params.js` · `src/lib/query-client.js` ·
`src/lib/utils.js` · `src/lib/AuthContext.jsx` · `src/lib/PageNotFound.jsx` ·
`src/lib/NavigationTracker.jsx` · `src/utils/index.ts` · `src/components/ProtectedRoute.jsx` ·
`src/components/UserNotRegisteredError.jsx` · `src/components/utils/normalizeUser.jsx` ·
`src/components/admin/AdminGuard.jsx` · `src/components/admin/ImpersonationContext.jsx` ·
`src/components/hooks/useAILimits.jsx` · `src/components/common/PremiumAIGate.jsx` ·
`src/components/common/UsageCounter.jsx` · `src/components/home/useStreamingAI.jsx` ·
`src/components/home/classifyIntent.jsx` · `src/components/home/AttachmentMenu.jsx` ·
`src/components/home/OperationalPlan.jsx` · `src/components/fiscalita/praticaStateMachine.jsx` ·
`src/components/pricing/EuroTokenConverter.jsx` · `src/pages/Pricing.jsx` ·
`src/pages/Home.jsx` (parziale) · i 4 schemi in `base44/entities/` · 12 file
`base44/functions/*/entry.ts`

### Prove per reperto chiave

| Reperto | Prova |
|---|---|
| Nessuna entità azienda | `grep -rnE "company_id\|tenant_id\|organization_id\|azienda_id\|org_id\|sede_id\|reparto_id" src base44` → nessuna occorrenza |
| Nessun webhook | `grep -rn "webhook" src base44 -i` → 1 risultato, `AppPreview.jsx:162` (regex in un mockup) |
| Nessun HMAC | `grep -rniE "hmac\|createHmac\|x-signature\|timingSafeEqual\|verifySignature"` → solo falso positivo `fetc[hMac]roData` |
| Interruzione inesistente | `useStreamingAI.jsx:34` crea il controller; riga ~72 invoca senza `signal`; riga 77 controlla dopo; `Home.jsx:59` non estrae `abort` |
| 65 funzioni | `find base44/functions -maxdepth 1 -mindepth 1 -type d \| wc -l` → 65; `find … -name entry.ts \| wc -l` → 65 |
| 60 entità, 4 schemi | `grep -rhoE "base44\.entities\.[A-Za-z0-9_]+" src base44 \| sed 's/.*\.//' \| sort -u \| wc -l` → 60; `ls base44/entities/*.jsonc \| wc -l` → 4 |
| `praticaStateMachine` viva | 3 importatori verificati; 7 export |
| `OperationalPlan` morta | unico importatore `DecisionResponse.jsx:11`, che non è importato da nessuno |
| `ProtectedRoute` rotto | richiede `authChecked`/`checkUserAuth`; `grep -c "authChecked" src/lib/AuthContext.jsx` → 0 |
| 2 controlli permessi | `CulturaAziendale.jsx:204`, `AdminPanel.jsx:257` contro 14 sezioni in `assignUserType/entry.ts` |
| 46 `asServiceRole` | `grep -lE "asServiceRole" base44/functions/*/entry.ts \| wc -l` → 46 |
| 23 controlli admin | `grep -lE "role !== 'admin'" base44/functions/*/entry.ts \| wc -l` → 23 |
| 6 funzioni senza `auth.me()` | verifica per file |
| Costi misurati in 2 punti | `grep -rn "cost_usd" src base44` → 2 risultati |
| Documenti obbligatori assenti | `find` + `git log --all --diff-filter=A` → solo `README.md` |
| Manus assente | `grep -ri "manus"` → nessun risultato |

---

## 14. COMANDI UTILIZZATI E RISULTATI

Tutti in sola lettura, tranne il pre-flight esplicitamente richiesto.

| Comando | Risultato |
|---|---|
| `git remote -v` | `appestetista/consorzio-imprenditori-app` ✅ |
| `git checkout main` | `Switched to branch 'main'` |
| `git pull --ff-only origin main` | `Already up to date.` |
| `git status --short` | vuoto (prima della scrittura di questo file) |
| `git rev-parse HEAD` | `6f6c151f8f6418dfc921303a636db8455a0f51ce` |
| `git log --all --diff-filter=A --name-only` | unico `.md` mai aggiunto: `README.md` |
| `find`, `grep`, `wc`, `ls`, `sed`, `cat` | letture — risultati riportati ai § 5-13 |

### Correzioni rispetto all'audit precedente

Le verifiche sono state rifatte da zero, come richiesto. Tre risultati differiscono e vengono
corretti qui:

| Dato | Audit precedente | **Valore corretto** | Comando |
|---|---|---|---|
| Funzioni Base44 | 71 | **65** | `find base44/functions -maxdepth 1 -mindepth 1 -type d \| wc -l` |
| Entità referenziate | 59 | **60** | ricerca estesa a `src` **e** `base44` |
| Funzioni con controllo admin | 24 | **23** | `grep -lE "role !== 'admin'" \| wc -l` |

Inoltre il reperto sull'interruzione risulta **più grave** di quanto precedentemente descritto:
non è "solo interfaccia", è del tutto scollegata (§ B3).

### Comandi NON eseguiti

`npm run lint`, `npm run typecheck`, `npm run build`, `npm run dev` — **non eseguibili**:
`node_modules` è assente e l'installazione di dipendenze è vietata dal perimetro dell'audit.
→ **NON VERIFICATO. Nessun test è stato eseguito e nessun risultato di test è dichiarato.**

---

## 15. LIMITI DELL'AUDIT

1. **Documentazione Manus assente.** I requisiti 13, 14, 15 e 22 dipendono dal formato dei
   webhook, dall'algoritmo di firma, dalla politica di annullamento e dal contratto di
   interfaccia del motore. Nessuno è conoscibile dal repository.
2. **56 schemi di entità su 60 assenti.** Struttura, obbligatorietà, indici e regole di accesso
   non ispezionabili.
3. **Regole di accesso Base44 non verificabili.** Non si può stabilire se `User.list()` sia
   realmente filtrata. I rischi D2 e D3 restano quindi **possibili ma non dimostrati**: non li
   dichiaro né innocui né confermati.
4. **Automazioni pianificate non verificabili.** Quali siano attive, con quale frequenza e con
   quale costo è configurato in Base44.
5. **Nessuna esecuzione dell'app.** Nessun test, nessuna prova visiva, nessuna misura di
   prestazione reale.
6. **Nessun dato d'uso.** Il repository non contiene analitiche: frequenza d'uso, aziende
   attive, consumi medi non sono deducibili.
7. **Protezione HTTP delle funzioni non verificabile.** Se le 6 funzioni senza `auth.me()` siano
   raggiungibili dall'esterno dipende dalla configurazione Base44.

---

## 16. CONCLUSIONE DI FATTIBILITÀ

**ARIA come interfaccia libera: FATTIBILE.** Il punto di ingresso esiste ed è già la pagina
principale; l'instradatore a costo zero esiste; la piattaforma backend per costruire il
connettore esiste ed è matura.

**Integrazione con Manus: NON ANCORA PROGETTABILE.** Non per un difetto insormontabile
dell'app, ma perché mancano contemporaneamente l'infrastruttura da committente (webhook,
coda, interruzione, approvazioni), il soggetto committente (l'azienda) e il contratto di
interfaccia del motore (documentazione Manus).

**Sostituibilità del motore: oggi nulla.** Diventa alta solo se lo strato di astrazione precede
l'integrazione. L'ordine non è negoziabile, ed è la raccomandazione tecnica più importante di
questo documento.

**Il lavoro esistente non va buttato.** `praticaStateMachine` è la macchina a stati già scritta;
`OperationalPlan` è il renderer di piano già corretto, con responsabile e costo per fase;
`consultaAI` è il modello di chiamata a motore esterno. Circa 1.060 righe di codice valido sono
irraggiungibili per un anello mancante nella catena di import: recuperarle costa poco e vale
molto.

**Servono tre input da Giacomo prima di scrivere una riga:** la documentazione ufficiale di
Manus, gli schemi delle 56 entità mancanti, e la decisione sull'azienda multi-utente.

---

## 17. CONTROLLO FINALE

```
Repository:  appestetista/consorzio-imprenditori-app
Branch:      main
HEAD:        6f6c151f8f6418dfc921303a636db8455a0f51ce
```

✅ Nessun file di codice modificato
✅ Nessun file eliminato
✅ Nessun branch creato o cambiato durante l'audit (solo il `checkout main` del pre-flight)
✅ Nessun commit · Nessun push · Nessuna Pull Request · Nessun merge
✅ Base44 non modificata · App non pubblicata
✅ Nessuna chiave, token o credenziale inserita
✅ Nessuna dipendenza installata
✅ **Nessuna chiamata a Manus effettuata**
✅ Unico file creato: `FATTIBILITA_ARIA_LIBERA_MANUS.md`
