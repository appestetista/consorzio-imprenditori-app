import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const TEMI = [
  {
    categoria: 'Fiscale',
    tema: 'IRPEF italiana 2025-2026',
    checklist: `- Scaglioni: quanti, soglie €, aliquote %
- Calcolo progressivo: esempi su 25K, 40K, 75K
- Detrazioni lavoro dipendente: importi per fascia + formule
- Detrazioni lavoro autonomo: importi per fascia
- Bonus redditi fino 20K: % per sotto-fascia
- Detrazione aggiuntiva 20K-40K
- Trattamento integrativo 1.200€: condizioni
- No tax area: importi per dipendenti, pensionati, autonomi
- Detrazioni familiari: chi, limiti, eta, novita 2025
- Limite detrazioni >75K: importi base, coefficienti figli
- Sterilizzazione >200K
- Novita 2026 se disponibili`
  },
  {
    categoria: 'Fiscale',
    tema: 'IRES imposta societa di capitali 2025-2026',
    checklist: `- Aliquota ordinaria %
- Base imponibile: come si calcola da bilancio
- Acconti: date, percentuali, soglia unica soluzione
- Perdite fiscali: riporto, limite 80%, eccezione primi 3 anni
- Addizionali settoriali
- IRES premiale se introdotta
- Rapporto con IRAP`
  },
  {
    categoria: 'Fiscale',
    tema: 'IVA italiana completa 2025-2026',
    checklist: `- Aliquote: 22%, 10%, 4% con elenco beni/servizi
- Operazioni esenti art.10: elenco
- Liquidazione mensile/trimestrale: soglie, scadenze, maggiorazione
- Acconto IVA 27/12: 3 metodi
- LIPE: scadenze
- Dichiarazione annuale: scadenza
- Split payment, reverse charge, OSS/IOSS
- Fattura elettronica: tempi SDI, conservazione`
  },
  {
    categoria: 'Fiscale',
    tema: 'Regime forfettario completo 2025-2026',
    checklist: `- Requisiti: ricavi 85K, spese personale 20K, reddito dip 35K
- Cause esclusione: elenco COMPLETO (almeno 7)
- Fuoriuscita: 85K-100K vs >100K
- Imposta 15% e 5% startup: requisiti
- Coefficienti redditivita ATECO: tabella 10+ codici
- Contributi INPS per gestione + riduzione 35%
- Scadenze versamento
- Vantaggi, obblighi rimasti, rettifica IVA 2025`
  },
  {
    categoria: 'Fiscale',
    tema: 'Contributi INPS 2025 tutte le categorie',
    checklist: `- Dipendenti: aliquota azienda per voce + aliquota dipendente + massimale
- Gestione Separata: tutte casistiche con aliquote
- Artigiani: aliquota, minimale, fissi, eccedenza
- Commercianti: idem
- Riduzione forfettari 35%
- Casse professionali: cenni
- Esonero contributivo se vigente`
  },
  {
    categoria: 'Fiscale',
    tema: 'IRAP imposta regionale 2025',
    checklist: `- Aliquota base, variazioni regionali
- Base imponibile dal CE
- Deduzioni cuneo fiscale
- Soggetti esclusi
- Scadenze`
  },
  {
    categoria: 'Investimenti',
    tema: 'Transizione 5.0 credito imposta 2024-2025-2026',
    checklist: `- TABELLA 9 aliquote (3 fasce x 3 livelli risparmio)
- Requisiti certificazione
- Beni ammessi, formazione, fotovoltaico
- Cumulabilita, scadenze, proroga 2026`
  },
  {
    categoria: 'Investimenti',
    tema: 'Credito imposta R&S Innovazione Design 2025',
    checklist: `- Per tipo: aliquota % e massimale €
- Spese ammissibili
- Obblighi documentali
- Cumulabilita, utilizzo F24, controlli`
  },
  {
    categoria: 'Investimenti',
    tema: 'Fondo di Garanzia PMI 2025',
    checklist: `- Copertura %, importo max
- Beneficiari, 3 tipologie operazione
- Costi, rating, startup innovative
- Come fare domanda`
  },
  {
    categoria: 'Legale',
    tema: 'GDPR e privacy obblighi PMI Italia 2025',
    checklist: `- Obblighi: registro, informativa, responsabili, sicurezza, data breach
- DPO: quando serve
- Sanzioni: importi
- Cookie, marketing, soft spam, RPO`
  },
  {
    categoria: 'Legale',
    tema: 'Sicurezza lavoro D.Lgs. 81/2008 obblighi 2025',
    checklist: `- DVR, RSPP, medico competente
- Formazione: ore per rischio
- Preposti, RLS
- Sanzioni per violazione
- Patente crediti edilizia, INL`
  },
  {
    categoria: 'Personale/HR',
    tema: 'Contratti di lavoro Italia 2025 tutte le tipologie',
    checklist: `- Indeterminato: prova, licenziamento, tutele crescenti
- Determinato: causali, 12/24 mesi, proroghe, NASpI, stop&go
- Apprendistato 3 livelli
- Co.co.co., intermittente, smart working
- Incentivi assunzione vigenti`
  },
  {
    categoria: 'Personale/HR',
    tema: 'TFR trattamento fine rapporto 2025',
    checklist: `- Formula calcolo
- Rivalutazione, imposta 17%
- Destinazione sotto/sopra 49 dip
- Silenzio-assenso, anticipo, tassazione
- Costo azienda %`
  },
  {
    categoria: 'Legale',
    tema: 'D.Lgs. 231/2001 responsabilita enti 2025',
    checklist: `- Cosa prevede
- Categorie reati
- Modello 231: componenti
- Sanzioni pecuniarie e interdittive
- Rilevanza PMI, costi`
  },
  {
    categoria: 'Operativa',
    tema: 'Adempimenti contabili fatturazione elettronica PMI 2025',
    checklist: `- Fattura elettronica: formato, SDI, tempi
- Corrispettivi, registri
- Dichiarazioni con scadenze esatte
- Bilancio: termini, deposito, abbreviato`
  }
];

function buildKBPrompt(tema, checklist) {
  return `Sei un consulente fiscale/legale senior italiano. Devi creare una scheda normativa VERIFICATA.

PROCEDURA OBBLIGATORIA:
1. CERCA su fonti ISTITUZIONALI (agenziaentrate.gov.it, inps.it, gazzettaufficiale.it, normattiva.it, mimit.gov.it, lavoro.gov.it, inail.it, garanteprivacy.it)
2. CERCA ANCHE su fonti SPECIALIZZATE (fiscoetasse.com, fiscomania.com, informazionefiscale.it, altalex.com, pmi.it, ipsoa.it)
3. Per OGNI dato numerico: CONFRONTA cosa dicono le fonti istituzionali e quelle specializzate
4. Se concordano: segna [V] (verificato)
5. Se discordano: cerca il TESTO DI LEGGE ORIGINALE su normattiva.it e usa quello, segna [V3] (verificato 3 fonti)
6. Se trovi il dato su una sola fonte: segna [P] (parziale)
7. Se NON trovi il dato: segna [?] (da confermare con commercialista)
8. NON INVENTARE MAI un dato. Meglio [?] che un numero falso.

TEMA: ${tema}

DATI DA TROVARE E VERIFICARE:
${checklist}

SCRITTURA FINALE — LINGUAGGIO IMPRENDITORIALE:
- Spiega ogni termine tecnico: "IRAP (l'imposta regionale che paghi sulla produzione della tua azienda)"
- Per ogni aliquota: aggiungi esempio "In pratica: su un reddito di 40.000€, paghi X€"
- Per ogni scadenza: "Entro il [data] devi [cosa]. Se non lo fai: sanzione da X€ a Y€"
- Per ogni obbligo: "Serve a [perche]. Se non ce l'hai rischi [cosa concreta]"
- Tono: consulente che parla chiaro, usa "tu" e "la tua azienda", mai "il contribuente"
- NON tagliare niente. Il testo deve essere COMPLETO.

Rispondi SOLO con JSON valido:
{
  "categoria": "stringa",
  "titolo": "stringa",
  "contenuto": "testo LUNGO e COMPLETO",
  "anno": "2025-2026",
  "fonte": "elenco fonti principali",
  "riferimento_normativo": "norme di riferimento",
  "livello_affidabilita": "alto|medio|parziale"
}`;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const results = [];
  let created = 0;

  for (let i = 0; i < TEMI.length; i++) {
    const t = TEMI[i];
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: buildKBPrompt(t.tema, t.checklist),
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            categoria: { type: "string" },
            titolo: { type: "string" },
            contenuto: { type: "string" },
            anno: { type: "string" },
            fonte: { type: "string" },
            riferimento_normativo: { type: "string" },
            livello_affidabilita: { type: "string" }
          },
          required: ["categoria", "titolo", "contenuto"]
        }
      });

      let parsed = result;
      if (typeof result === 'string') {
        try {
          let c = result.trim();
          if (c.startsWith('```')) c = c.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
          parsed = JSON.parse(c);
        } catch {
          parsed = {
            categoria: t.categoria,
            titolo: t.tema,
            contenuto: result,
            anno: '2025-2026',
            fonte: 'Multi-fonte',
            riferimento_normativo: 'Vedi testo',
            livello_affidabilita: 'parziale'
          };
        }
      }

      await base44.asServiceRole.entities.KnowledgeBase.create({
        ...parsed,
        attivo: true,
        data_ultimo_aggiornamento: new Date().toISOString().split('T')[0]
      });

      created++;
      results.push({ tema: t.tema, status: 'ok' });
    } catch (err) {
      console.error('KB ERRORE:', t.tema, err?.message);
      results.push({ tema: t.tema, status: 'error', error: err?.message });
    }
  }

  return Response.json({ created, total: TEMI.length, results });
});