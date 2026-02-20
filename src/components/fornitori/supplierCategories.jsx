import { Factory, Briefcase, Landmark, Monitor, Megaphone, ShoppingCart, Truck, Building, Users, HardHat, HeartPulse, Award, Leaf, Scale, Globe } from 'lucide-react';

const SUPPLIER_CATEGORIES = [
  {
    id: 'produzione',
    label: '1. Produzione e Core Business',
    icon: Factory,
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10',
    borderColor: 'border-orange-400/30',
    subcategories: [
      { group: 'Materie prime e componenti', items: [
        { name: 'Fornitori materie prime', example: 'Es: "Cerco un fornitore di acciaio inox 304 per la nostra produzione di pentole"' },
        { name: 'Fornitori semilavorati', example: 'Es: "Cerco un fornitore di lamiere preverniciate per pannelli industriali"' },
        { name: 'Fornitori componentistica', example: 'Es: "Cerco un fornitore di schede elettroniche per i nostri quadri di comando"' },
        { name: 'Fornitori packaging ed etichette', example: 'Es: "Cerco un fornitore di scatole alimentari personalizzate per la nostra linea bio"' }
      ]},
      { group: 'Lavorazioni e produzione esterna', items: [
        { name: 'Contoterzisti', example: 'Es: "Cerco un contoterzista per verniciatura a polvere di componenti metallici"' },
        { name: 'Assemblatori', example: 'Es: "Cerco un assemblatore per montaggio di kit elettrici completi"' },
        { name: 'Officine meccaniche', example: 'Es: "Cerco un\'officina per tornitura e fresatura di alberi motore"' },
        { name: 'Carpenterie', example: 'Es: "Cerco una carpenteria per costruzione di telai e strutture in ferro"' },
        { name: 'Aziende lavorazioni CNC', example: 'Es: "Cerco un\'azienda CNC per lavorazione di precisione su alluminio aeronautico"' },
        { name: 'Stampatori', example: 'Es: "Cerco uno stampatore per iniezione plastica di componenti tecnici"' },
        { name: 'Prototipazione', example: 'Es: "Cerco un servizio di prototipazione rapida in stampa 3D per validare il nostro nuovo prodotto"' }
      ]},
      { group: 'Macchinari e impianti', items: [
        { name: 'Fornitori macchinari industriali', example: 'Es: "Cerco un fornitore di presse piegatrici per il nostro reparto lamiera"' },
        { name: 'Fornitori robotica', example: 'Es: "Cerco un fornitore di bracci robotici per automatizzare la saldatura"' },
        { name: 'Fornitori automazione industriale', example: 'Es: "Cerco un fornitore di PLC e sistemi SCADA per la nostra linea di imbottigliamento"' },
        { name: 'System integrator', example: 'Es: "Cerco un system integrator per collegare il nostro MES ai macchinari in produzione"' }
      ]}
    ]
  },
  {
    id: 'amministrazione',
    label: '2. Amministrazione, Fisco e Legale',
    icon: Briefcase,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    borderColor: 'border-blue-400/30',
    subcategories: [
      { group: null, items: [
        { name: 'Commercialista', example: 'Es: "Cerco un commercialista esperto in SRL che segua bilancio e dichiarazioni"' },
        { name: 'Consulente fiscale internazionale', example: 'Es: "Cerco un consulente per la doppia imposizione con la Germania dove vendiamo"' },
        { name: 'Consulente del lavoro', example: 'Es: "Cerco un consulente del lavoro per gestire le buste paga dei miei 15 dipendenti"' },
        { name: 'Studio paghe', example: 'Es: "Cerco uno studio paghe che gestisca cedolini e adempimenti INPS/INAIL"' },
        { name: 'Revisore legale', example: 'Es: "Cerco un revisore legale per la revisione del bilancio obbligatoria della nostra SRL"' },
        { name: 'Notaio', example: 'Es: "Cerco un notaio per una cessione di quote societarie"' },
        { name: 'Avvocato civile/commerciale', example: 'Es: "Cerco un avvocato per recupero crediti verso un cliente che non paga da 6 mesi"' },
        { name: 'Broker assicurativo', example: 'Es: "Cerco un broker per ottimizzare le polizze aziendali (RC, incendio, furto)"' },
        { name: 'Compagnie assicurative', example: 'Es: "Cerco una compagnia per polizza D&O per amministratori e polizza cyber risk"' }
      ]}
    ]
  },
  {
    id: 'finanza',
    label: '3. Finanza e Credito',
    icon: Landmark,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
    borderColor: 'border-emerald-400/30',
    subcategories: [
      { group: null, items: [
        { name: 'Banche', example: 'Es: "Cerco una banca con condizioni migliori per fidi e anticipi fatture"' },
        { name: 'Società leasing', example: 'Es: "Cerco una società di leasing per un macchinario da 150.000€"' },
        { name: 'Società factoring', example: 'Es: "Cerco una società di factoring per smobilizzare crediti verso la PA"' },
        { name: 'Confidi', example: 'Es: "Cerco un Confidi per ottenere garanzia su un finanziamento bancario"' },
        { name: 'Consulenti finanza agevolata', example: 'Es: "Cerco un consulente per accedere ai bandi regionali per digitalizzazione"' },
        { name: 'Venture capital', example: 'Es: "Cerco un fondo VC per un round seed da 500K sulla nostra startup tech"' },
        { name: 'Private equity', example: 'Es: "Cerco un fondo PE per supportare la crescita della nostra PMI da 5M di fatturato"' },
        { name: 'Piattaforme crowdfunding', example: 'Es: "Cerco una piattaforma equity crowdfunding per raccogliere capitali dal pubblico"' }
      ]}
    ]
  },
  {
    id: 'it',
    label: '4. IT e Tecnologia',
    icon: Monitor,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10',
    borderColor: 'border-cyan-400/30',
    subcategories: [
      { group: 'Infrastruttura digitale', items: [
        { name: 'Provider hosting', example: 'Es: "Cerco un hosting affidabile per il nostro e-commerce con 10.000 visite/giorno"' },
        { name: 'Provider cloud', example: 'Es: "Cerco un provider cloud per migrare i server interni e ridurre i costi IT"' },
        { name: 'Provider dominio e DNS', example: 'Es: "Cerco un provider per gestire i nostri domini aziendali e DNS con uptime garantito"' },
        { name: 'Provider internet', example: 'Es: "Cerco un provider internet business con fibra dedicata per il nostro capannone"' },
        { name: 'Telefonia aziendale', example: 'Es: "Cerco un fornitore di centralino VoIP per i nostri 3 uffici collegati"' }
      ]},
      { group: 'Software aziendali', items: [
        { name: 'ERP', example: 'Es: "Cerco un ERP per gestire produzione, magazzino e contabilità in un\'unica piattaforma"' },
        { name: 'CRM', example: 'Es: "Cerco un CRM per tracciare i contatti commerciali e le trattative dei venditori"' },
        { name: 'Software contabilità', example: 'Es: "Cerco un software di contabilità cloud compatibile con il nostro commercialista"' },
        { name: 'Software fatturazione elettronica', example: 'Es: "Cerco un software di fatturazione elettronica integrato con il gestionale"' },
        { name: 'Software HR', example: 'Es: "Cerco un software HR per gestire presenze, ferie e valutazioni dei 50 dipendenti"' },
        { name: 'Software project management', example: 'Es: "Cerco un tool di project management per coordinare i cantieri dei nostri tecnici"' },
        { name: 'Software MES', example: 'Es: "Cerco un MES per monitorare in tempo reale l\'avanzamento della produzione"' },
        { name: 'Software SCM', example: 'Es: "Cerco un SCM per gestire ordini fornitori e tracciabilità della supply chain"' }
      ]},
      { group: 'Sicurezza informatica', items: [
        { name: 'Cybersecurity', example: 'Es: "Cerco un\'azienda di cybersecurity per vulnerability assessment e protezione rete"' },
        { name: 'Backup e disaster recovery', example: 'Es: "Cerco una soluzione di backup automatico e disaster recovery per i dati aziendali"' },
        { name: 'DPO esterno', example: 'Es: "Cerco un DPO esterno per adempiere agli obblighi GDPR della nostra azienda"' },
        { name: 'Consulente GDPR', example: 'Es: "Cerco un consulente per adeguare il nostro sito e-commerce al GDPR"' }
      ]},
      { group: 'Innovazione e AI', items: [
        { name: 'Fornitori soluzioni AI', example: 'Es: "Cerco un fornitore AI per automatizzare il controllo qualità visivo in produzione"' },
        { name: 'Provider automazioni', example: 'Es: "Cerco un provider per automatizzare i processi di data entry e fatturazione"' },
        { name: 'Data analyst', example: 'Es: "Cerco un data analyst per creare dashboard di vendita e previsioni di domanda"' },
        { name: 'Business intelligence provider', example: 'Es: "Cerco un provider BI per analizzare i dati di produzione e ridurre gli sprechi"' }
      ]}
    ]
  },
  {
    id: 'marketing',
    label: '5. Marketing e Comunicazione',
    icon: Megaphone,
    color: 'text-pink-400',
    bgColor: 'bg-pink-400/10',
    borderColor: 'border-pink-400/30',
    subcategories: [
      { group: null, items: [
        { name: 'Agenzia branding', example: 'Es: "Cerco un\'agenzia per ridisegnare il logo e l\'identità visiva della nostra azienda"' },
        { name: 'Agenzia pubblicitaria', example: 'Es: "Cerco un\'agenzia per una campagna pubblicitaria per il lancio del nuovo prodotto"' },
        { name: 'Digital marketing agency', example: 'Es: "Cerco un\'agenzia digital per gestire Google Ads e campagne social"' },
        { name: 'SEO specialist', example: 'Es: "Cerco un SEO specialist per posizionare il nostro sito nella prima pagina Google"' },
        { name: 'Social media manager', example: 'Es: "Cerco un social media manager per gestire Instagram e LinkedIn aziendali"' },
        { name: 'Copywriter', example: 'Es: "Cerco un copywriter per scrivere i testi del nuovo sito web e delle newsletter"' },
        { name: 'Grafico', example: 'Es: "Cerco un grafico per progettare catalogo prodotti e materiali per fiera"' },
        { name: 'Fotografo', example: 'Es: "Cerco un fotografo per shooting prodotto professionale per e-commerce"' },
        { name: 'Videomaker', example: 'Es: "Cerco un videomaker per video corporate e presentazione aziendale"' },
        { name: 'Media buyer', example: 'Es: "Cerco un media buyer per pianificare campagne TV e radio locali"' },
        { name: 'PR agency', example: 'Es: "Cerco un\'agenzia PR per aumentare la visibilità del brand sui media"' },
        { name: 'Ufficio stampa', example: 'Es: "Cerco un ufficio stampa per comunicati e relazioni con i giornalisti di settore"' },
        { name: 'Tipografia', example: 'Es: "Cerco una tipografia per stampa cataloghi, biglietti da visita e brochure"' },
        { name: 'Gadget aziendali', example: 'Es: "Cerco un fornitore di gadget personalizzati con logo per eventi e fiere"' }
      ]}
    ]
  },
  {
    id: 'commerciale',
    label: '6. Commerciale e Retail',
    icon: ShoppingCart,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    borderColor: 'border-yellow-400/30',
    subcategories: [
      { group: null, items: [
        { name: 'Fornitori POS', example: 'Es: "Cerco un fornitore POS con commissioni basse per il nostro negozio"' },
        { name: 'Provider pagamenti elettronici', example: 'Es: "Cerco un provider per pagamenti online integrato con il nostro e-commerce"' },
        { name: 'Marketplace partner', example: 'Es: "Cerco un partner per vendere i nostri prodotti su Amazon e eBay"' },
        { name: 'Piattaforme e-commerce', example: 'Es: "Cerco una piattaforma e-commerce B2B per vendere ai rivenditori"' },
        { name: 'Allestitori punti vendita', example: 'Es: "Cerco un allestitore per rinnovare l\'arredamento del nostro showroom"' },
        { name: 'Sistemi antifurto retail', example: 'Es: "Cerco un fornitore di antitaccheggio e videosorveglianza per il punto vendita"' }
      ]}
    ]
  },
  {
    id: 'logistica',
    label: '7. Logistica e Trasporti',
    icon: Truck,
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10',
    borderColor: 'border-amber-400/30',
    subcategories: [
      { group: null, items: [
        { name: 'Corrieri nazionali', example: 'Es: "Cerco un corriere nazionale affidabile per 200 spedizioni/mese B2C"' },
        { name: 'Corrieri internazionali', example: 'Es: "Cerco un corriere per spedizioni express in Europa con tracking completo"' },
        { name: 'Spedizionieri doganali', example: 'Es: "Cerco uno spedizioniere per gestire importazioni dalla Cina con sdoganamento"' },
        { name: 'Trasporto ADR', example: 'Es: "Cerco un trasportatore ADR per movimentare solventi chimici"' },
        { name: 'Trasporto refrigerato', example: 'Es: "Cerco un trasporto refrigerato per distribuzione alimentare nel Nord Italia"' },
        { name: 'Magazzini logistici', example: 'Es: "Cerco un magazzino logistico in outsourcing con gestione picking e spedizioni"' },
        { name: 'Depositi conto terzi', example: 'Es: "Cerco un deposito conto terzi per stoccare merce in eccesso vicino al porto"' },
        { name: 'Operatori intermodali', example: 'Es: "Cerco un operatore intermodale per trasporto container ferrovia+gomma"' }
      ]}
    ]
  },
  {
    id: 'ufficio',
    label: '8. Struttura, Ufficio e Servizi',
    icon: Building,
    color: 'text-slate-400',
    bgColor: 'bg-slate-400/10',
    borderColor: 'border-slate-400/30',
    subcategories: [
      { group: null, items: [
        { name: 'Fornitore energia elettrica', example: 'Es: "Cerco un fornitore luce con tariffa competitiva per consumo industriale 100.000 kWh/anno"' },
        { name: 'Fornitore gas', example: 'Es: "Cerco un fornitore gas metano per riscaldamento capannone e processo produttivo"' },
        { name: 'Fornitore acqua', example: 'Es: "Cerco un fornitore per depurazione acque industriali e allacciamento"' },
        { name: 'Noleggio stampanti', example: 'Es: "Cerco un noleggio stampanti multifunzione per ufficio con 10 postazioni"' },
        { name: 'Noleggio auto aziendali', example: 'Es: "Cerco un noleggio lungo termine per 5 auto aziendali per gli agenti"' },
        { name: 'Arredi ufficio', example: 'Es: "Cerco un fornitore di scrivanie ergonomiche e sedie per il nuovo ufficio"' },
        { name: 'Cancelleria', example: 'Es: "Cerco un fornitore cancelleria e materiale d\'ufficio con consegna periodica"' },
        { name: 'Coffee service', example: 'Es: "Cerco un fornitore distributori automatici caffè e snack per 30 dipendenti"' },
        { name: 'Catering aziendale', example: 'Es: "Cerco un catering per pranzi aziendali quotidiani nella mensa interna"' },
        { name: 'Pulizie', example: 'Es: "Cerco un\'impresa di pulizie per uffici e capannone, 3 volte a settimana"' },
        { name: 'Vigilanza', example: 'Es: "Cerco un servizio di vigilanza notturna e gestione allarme per il magazzino"' },
        { name: 'Facility management', example: 'Es: "Cerco un facility manager per manutenzione completa dello stabile aziendale"' }
      ]}
    ]
  },
  {
    id: 'risorse_umane',
    label: '9. Risorse Umane',
    icon: Users,
    color: 'text-violet-400',
    bgColor: 'bg-violet-400/10',
    borderColor: 'border-violet-400/30',
    subcategories: [
      { group: null, items: [
        { name: 'Agenzie per il lavoro', example: 'Es: "Cerco un\'agenzia interinale per 5 operai specializzati per picchi di produzione"' },
        { name: 'Head hunter', example: 'Es: "Cerco un head hunter per trovare un direttore commerciale con esperienza export"' },
        { name: 'Società formazione', example: 'Es: "Cerco un ente di formazione per corsi di aggiornamento tecnico ai dipendenti"' },
        { name: 'Provider welfare aziendale', example: 'Es: "Cerco un provider welfare per offrire benefit e flexible benefit ai dipendenti"' },
        { name: 'Provider ticket restaurant', example: 'Es: "Cerco un fornitore buoni pasto elettronici con rete di accettazione ampia"' },
        { name: 'Temporary manager', example: 'Es: "Cerco un temporary manager per gestire la transizione del reparto produzione"' }
      ]}
    ]
  },
  {
    id: 'sicurezza_lavoro',
    label: '10. Sicurezza sul Lavoro',
    icon: HardHat,
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    borderColor: 'border-red-400/30',
    subcategories: [
      { group: 'Consulenze', items: [
        { name: 'RSPP esterno', example: 'Es: "Cerco un RSPP esterno per la nostra azienda metalmeccanica con 25 dipendenti"' },
        { name: 'Consulente sicurezza', example: 'Es: "Cerco un consulente per adeguare la sicurezza del nuovo reparto verniciatura"' },
        { name: 'Coordinatore sicurezza cantieri', example: 'Es: "Cerco un CSE/CSP per coordinamento sicurezza di un cantiere edile"' },
        { name: 'RLS esterno', example: 'Es: "Cerco un RLS territoriale per la nostra piccola impresa sotto i 15 dipendenti"' },
        { name: 'Formatore sicurezza', example: 'Es: "Cerco un formatore per corsi obbligatori sicurezza lavoratori (generale + specifico)"' }
      ]},
      { group: 'Documentazione', items: [
        { name: 'DVR', example: 'Es: "Cerco un professionista per redigere il Documento Valutazione Rischi aggiornato"' },
        { name: 'DUVRI', example: 'Es: "Cerco un consulente per redigere il DUVRI per gli appalti nel nostro stabilimento"' },
        { name: 'POS', example: 'Es: "Cerco un tecnico per redigere il Piano Operativo di Sicurezza per il cantiere"' },
        { name: 'Valutazioni rischi specifici', example: 'Es: "Cerco un tecnico per valutazione rischio rumore e vibrazioni in officina"' }
      ]},
      { group: 'DPI', items: [
        { name: 'Fornitori DPI', example: 'Es: "Cerco un fornitore di DPI (guanti, scarpe, occhiali) per 40 operai"' }
      ]},
      { group: 'Sicurezza impianti', items: [
        { name: 'Installatori antincendio', example: 'Es: "Cerco un installatore per impianto antincendio sprinkler nel magazzino"' },
        { name: 'Manutenzione estintori', example: 'Es: "Cerco un\'azienda per revisione annuale e ricarica estintori e idranti"' },
        { name: 'Verifiche impianti elettrici', example: 'Es: "Cerco un ente per verifica periodica dell\'impianto elettrico del capannone"' },
        { name: 'Verifiche messa a terra', example: 'Es: "Cerco un organismo abilitato per verifica biennale impianto di messa a terra"' },
        { name: 'Collaudi attrezzature', example: 'Es: "Cerco un ente per collaudo e verifica periodica del carroponte e del muletto"' },
        { name: 'Consulenti ATEX', example: 'Es: "Cerco un consulente ATEX per classificazione aree a rischio esplosione"' }
      ]}
    ]
  },
  {
    id: 'medicina_lavoro',
    label: '11. Medicina del Lavoro',
    icon: HeartPulse,
    color: 'text-rose-400',
    bgColor: 'bg-rose-400/10',
    borderColor: 'border-rose-400/30',
    subcategories: [
      { group: null, items: [
        { name: 'Medico competente', example: 'Es: "Cerco un medico competente per la sorveglianza sanitaria dei nostri 30 dipendenti"' },
        { name: 'Centro medicina del lavoro', example: 'Es: "Cerco un centro per visite mediche periodiche e protocollo sanitario completo"' },
        { name: 'Sorveglianza sanitaria', example: 'Es: "Cerco un servizio di sorveglianza sanitaria continuativa per la nostra azienda"' },
        { name: 'Visite mediche', example: 'Es: "Cerco un ambulatorio per visite mediche preassuntive e periodiche dei lavoratori"' },
        { name: 'Test audiometrici', example: 'Es: "Cerco un centro per audiometrie obbligatorie per operai esposti a rumore"' },
        { name: 'Spirometrie', example: 'Es: "Cerco un centro per spirometrie per lavoratori esposti a polveri in verniciatura"' },
        { name: 'Esami tossicologici', example: 'Es: "Cerco un laboratorio per drug test obbligatori per autisti e carrellisti"' },
        { name: 'Gestione cartelle sanitarie', example: 'Es: "Cerco un servizio digitale per gestione e archiviazione cartelle sanitarie"' }
      ]}
    ]
  },
  {
    id: 'certificazioni',
    label: '12. Certificazioni e Audit',
    icon: Award,
    color: 'text-teal-400',
    bgColor: 'bg-teal-400/10',
    borderColor: 'border-teal-400/30',
    subcategories: [
      { group: 'Sistemi qualità', items: [
        { name: 'ISO 9001', example: 'Es: "Cerco un consulente per ottenere la certificazione ISO 9001 per partecipare a gare"' },
        { name: 'ISO 14001', example: 'Es: "Cerco un consulente per certificazione ambientale ISO 14001 richiesta dal cliente"' },
        { name: 'ISO 45001', example: 'Es: "Cerco un ente per certificazione sicurezza sul lavoro ISO 45001"' },
        { name: 'ISO 27001', example: 'Es: "Cerco un consulente per certificazione sicurezza informatica ISO 27001"' },
        { name: 'ISO 22000', example: 'Es: "Cerco un consulente per certificazione sicurezza alimentare ISO 22000"' },
        { name: 'ISO 50001', example: 'Es: "Cerco un consulente per certificazione gestione energia ISO 50001"' }
      ]},
      { group: 'Settoriali', items: [
        { name: 'Marcatura CE', example: 'Es: "Cerco un consulente per marcatura CE delle nostre macchine industriali"' },
        { name: 'HACCP', example: 'Es: "Cerco un consulente per piano HACCP aggiornato per il nostro laboratorio alimentare"' },
        { name: 'SOA', example: 'Es: "Cerco un ente per attestazione SOA per partecipare ad appalti pubblici"' },
        { name: 'BRC / IFS', example: 'Es: "Cerco un consulente per certificazione BRC/IFS richiesta dalla GDO"' },
        { name: 'GMP', example: 'Es: "Cerco un consulente per implementare le Good Manufacturing Practices"' },
        { name: 'FSC / PEFC', example: 'Es: "Cerco un ente per certificazione FSC per la nostra produzione di mobili"' }
      ]},
      { group: 'ESG', items: [
        { name: 'Bilancio sostenibilità', example: 'Es: "Cerco un consulente per redigere il primo bilancio di sostenibilità aziendale"' },
        { name: 'Rating ESG', example: 'Es: "Cerco un consulente per migliorare il rating ESG richiesto dalle banche"' },
        { name: 'Carbon footprint', example: 'Es: "Cerco un consulente per calcolo carbon footprint e strategia di riduzione CO2"' },
        { name: 'Certificazione B-Corp', example: 'Es: "Cerco un consulente per ottenere la certificazione B-Corp per la nostra azienda"' },
        { name: 'EMAS', example: 'Es: "Cerco un consulente per registrazione EMAS e dichiarazione ambientale"' }
      ]}
    ]
  },
  {
    id: 'ambiente',
    label: '13. Ambiente e Rifiuti',
    icon: Leaf,
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    borderColor: 'border-green-400/30',
    subcategories: [
      { group: null, items: [
        { name: 'Consulente ambientale', example: 'Es: "Cerco un consulente per pratiche AUA e autorizzazioni ambientali"' },
        { name: 'Smaltimento rifiuti speciali', example: 'Es: "Cerco un\'azienda per smaltimento rifiuti speciali pericolosi (oli esausti, solventi)"' },
        { name: 'Trasporto rifiuti autorizzato', example: 'Es: "Cerco un trasportatore autorizzato Albo Gestori Ambientali per rifiuti industriali"' },
        { name: 'Registro rifiuti', example: 'Es: "Cerco un consulente per gestione registro carico/scarico rifiuti e RENTRI"' },
        { name: 'Pratiche MUD', example: 'Es: "Cerco un consulente per compilazione e invio MUD annuale"' },
        { name: 'Analisi acque reflue', example: 'Es: "Cerco un laboratorio per analisi acque reflue e conformità allo scarico"' },
        { name: 'Analisi emissioni', example: 'Es: "Cerco un laboratorio per analisi emissioni in atmosfera del camino industriale"' }
      ]}
    ]
  },
  {
    id: 'compliance',
    label: '14. Compliance e Modelli Org.',
    icon: Scale,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-400/10',
    borderColor: 'border-indigo-400/30',
    subcategories: [
      { group: null, items: [
        { name: 'Consulente Modello 231', example: 'Es: "Cerco un consulente per redigere il Modello 231 per la nostra SRL"' },
        { name: 'Organismo Vigilanza 231', example: 'Es: "Cerco un OdV esterno per il nostro Modello Organizzativo 231"' },
        { name: 'Consulente antiriciclaggio', example: 'Es: "Cerco un consulente antiriciclaggio per adeguamento alla normativa AML"' },
        { name: 'Piattaforma whistleblowing', example: 'Es: "Cerco una piattaforma whistleblowing conforme al D.Lgs. 24/2023"' }
      ]}
    ]
  },
  {
    id: 'internazionalizzazione',
    label: '15. Internazionalizzazione',
    icon: Globe,
    color: 'text-sky-400',
    bgColor: 'bg-sky-400/10',
    borderColor: 'border-sky-400/30',
    subcategories: [
      { group: null, items: [
        { name: 'Export manager', example: 'Es: "Cerco un export manager per aprire il mercato tedesco per i nostri prodotti"' },
        { name: 'Consulente doganale', example: 'Es: "Cerco un consulente doganale per esportazioni extra-UE (USA e UK)"' },
        { name: 'Agenti esteri', example: 'Es: "Cerco agenti commerciali in Francia e Spagna per la nostra linea alimentare"' },
        { name: 'Distributori internazionali', example: 'Es: "Cerco un distributore in Medio Oriente per i nostri prodotti cosmetici"' },
        { name: 'Traduttori professionali', example: 'Es: "Cerco un traduttore tecnico per manuali e schede prodotto in 4 lingue"' },
        { name: 'Broker commerciali', example: 'Es: "Cerco un broker commerciale per trovare acquirenti in mercati emergenti"' }
      ]}
    ]
  }
];

export default SUPPLIER_CATEGORIES;