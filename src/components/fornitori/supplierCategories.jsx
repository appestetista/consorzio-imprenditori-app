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
      { group: 'Materie prime e componenti', items: ['Fornitori materie prime', 'Fornitori semilavorati', 'Fornitori componentistica', 'Fornitori packaging ed etichette'] },
      { group: 'Lavorazioni e produzione esterna', items: ['Contoterzisti', 'Assemblatori', 'Officine meccaniche', 'Carpenterie', 'Aziende lavorazioni CNC', 'Stampatori', 'Prototipazione'] },
      { group: 'Macchinari e impianti', items: ['Fornitori macchinari industriali', 'Fornitori robotica', 'Fornitori automazione industriale', 'System integrator'] }
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
      { group: null, items: ['Commercialista', 'Consulente fiscale internazionale', 'Consulente del lavoro', 'Studio paghe', 'Revisore legale', 'Notaio', 'Avvocato civile/commerciale', 'Broker assicurativo', 'Compagnie assicurative'] }
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
      { group: null, items: ['Banche', 'Società leasing', 'Società factoring', 'Confidi', 'Consulenti finanza agevolata', 'Venture capital', 'Private equity', 'Piattaforme crowdfunding'] }
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
      { group: 'Infrastruttura digitale', items: ['Provider hosting', 'Provider cloud', 'Provider dominio e DNS', 'Provider internet', 'Telefonia aziendale'] },
      { group: 'Software aziendali', items: ['ERP', 'CRM', 'Software contabilità', 'Software fatturazione elettronica', 'Software HR', 'Software project management', 'Software MES', 'Software SCM'] },
      { group: 'Sicurezza informatica', items: ['Cybersecurity', 'Backup e disaster recovery', 'DPO esterno', 'Consulente GDPR'] },
      { group: 'Innovazione e AI', items: ['Fornitori soluzioni AI', 'Provider automazioni', 'Data analyst', 'Business intelligence provider'] }
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
      { group: null, items: ['Agenzia branding', 'Agenzia pubblicitaria', 'Digital marketing agency', 'SEO specialist', 'Social media manager', 'Copywriter', 'Grafico', 'Fotografo', 'Videomaker', 'Media buyer', 'PR agency', 'Ufficio stampa', 'Tipografia', 'Gadget aziendali'] }
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
      { group: null, items: ['Fornitori POS', 'Provider pagamenti elettronici', 'Marketplace partner', 'Piattaforme e-commerce', 'Allestitori punti vendita', 'Sistemi antifurto retail'] }
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
      { group: null, items: ['Corrieri nazionali', 'Corrieri internazionali', 'Spedizionieri doganali', 'Trasporto ADR', 'Trasporto refrigerato', 'Magazzini logistici', 'Depositi conto terzi', 'Operatori intermodali'] }
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
      { group: null, items: ['Fornitore energia elettrica', 'Fornitore gas', 'Fornitore acqua', 'Noleggio stampanti', 'Noleggio auto aziendali', 'Arredi ufficio', 'Cancelleria', 'Coffee service', 'Catering aziendale', 'Pulizie', 'Vigilanza', 'Facility management'] }
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
      { group: null, items: ['Agenzie per il lavoro', 'Head hunter', 'Società formazione', 'Provider welfare aziendale', 'Provider ticket restaurant', 'Temporary manager'] }
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
      { group: 'Consulenze', items: ['RSPP esterno', 'Consulente sicurezza', 'Coordinatore sicurezza cantieri', 'RLS esterno', 'Formatore sicurezza'] },
      { group: 'Documentazione', items: ['DVR', 'DUVRI', 'POS', 'Valutazioni rischi specifici'] },
      { group: 'DPI', items: ['Fornitori DPI'] },
      { group: 'Sicurezza impianti', items: ['Installatori antincendio', 'Manutenzione estintori', 'Verifiche impianti elettrici', 'Verifiche messa a terra', 'Collaudi attrezzature', 'Consulenti ATEX'] }
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
      { group: null, items: ['Medico competente', 'Centro medicina del lavoro', 'Sorveglianza sanitaria', 'Visite mediche', 'Test audiometrici', 'Spirometrie', 'Esami tossicologici', 'Gestione cartelle sanitarie'] }
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
      { group: 'Sistemi qualità', items: ['ISO 9001', 'ISO 14001', 'ISO 45001', 'ISO 27001', 'ISO 22000', 'ISO 50001'] },
      { group: 'Settoriali', items: ['Marcatura CE', 'HACCP', 'SOA', 'BRC / IFS', 'GMP', 'FSC / PEFC'] },
      { group: 'ESG', items: ['Bilancio sostenibilità', 'Rating ESG', 'Carbon footprint', 'Certificazione B-Corp', 'EMAS'] }
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
      { group: null, items: ['Consulente ambientale', 'Smaltimento rifiuti speciali', 'Trasporto rifiuti autorizzato', 'Registro rifiuti', 'Pratiche MUD', 'Analisi acque reflue', 'Analisi emissioni'] }
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
      { group: null, items: ['Consulente Modello 231', 'Organismo Vigilanza 231', 'Consulente antiriciclaggio', 'Piattaforma whistleblowing'] }
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
      { group: null, items: ['Export manager', 'Consulente doganale', 'Agenti esteri', 'Distributori internazionali', 'Traduttori professionali', 'Broker commerciali'] }
    ]
  }
];

export default SUPPLIER_CATEGORIES;