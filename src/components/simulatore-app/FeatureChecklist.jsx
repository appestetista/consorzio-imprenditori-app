import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

const COMMON_GROUPS = [
  {
    title: "Calendario e prenotazioni",
    description: "Calendario appuntamenti, prenotazioni e blocchi orari.",
    items: [
      "Calendario appuntamenti",
      "Prenotazione online clienti",
      "Promemoria automatici",
      "Reminder (promemoria automatico)",
      "Gestione lista d’attesa",
      "Blocco orari non disponibili",
      "Gestione più operatori",
    ],
  },
  {
    title: "Profilo cliente",
    description: "Customer profile (profilo cliente) con archivio completo.",
    items: [
      "Customer profile (profilo cliente)",
      "Dati personali",
      "Storico servizi",
      "Foto prima/dopo",
      "Allergie",
      "Preferenze",
      "Prodotti utilizzati",
    ],
  },
  {
    title: "Pagamenti",
    description: "Payment gateway (sistema di pagamento online) e incassi in negozio.",
    items: [
      "Payment gateway (sistema di pagamento online)",
      "Pagamento online",
      "Pagamento in negozio",
      "Gestione abbonamenti",
      "Gift card",
      "Fatturazione",
    ],
  },
  {
    title: "Marketing e fidelizzazione",
    items: [
      "Campagne promozionali",
      "Coupon",
      "Messaggi automatici",
      "Programma fedeltà",
    ],
  },
  {
    title: "Analytics",
    items: ["Fatturato", "Clienti più attivi", "Servizi più venduti", "Statistiche"],
  },
];

const SPECIFIC_GROUPS = {
  hair: [
    {
      title: "Archivio colori",
      description: "Archivio colori e formula usata per ogni cliente.",
      items: [
        "Archivio colori",
        "Formula colore utilizzata",
        "Marca",
        "Percentuali",
        "Foto risultato",
      ],
    },
    {
      title: "Trattamenti capelli",
      description: "Gestione trattamenti, ricostruzione e reminder.",
      items: [
        "Trattamenti capelli",
        "Gestione trattamenti",
        "Piani ricostruzione",
        "Reminder trattamento",
      ],
    },
    {
      title: "Consulenza capelli",
      description: "Hair analysis (analisi del capello) e del cuoio capelluto.",
      items: [
        "Consulenza capelli",
        "Hair analysis (analisi del capello)",
        "Analisi capello",
        "Analisi cuoio capelluto",
      ],
    },
  ],
  nails: [
    {
      title: "Nail art e design",
      description: "Archivio nail art, catalogo design e preferiti cliente.",
      items: [
        "Archivio nail art",
        "Catalogo design",
        "Preferiti cliente",
        "Galleria lavori eseguiti",
        "Foto prima/dopo unghie",
        "Trend e ispirazioni stagionali",
      ],
    },
    {
      title: "Servizi unghie",
      description: "Manicure, pedicure, semipermanente, gel, acrilico e ricostruzione.",
      items: [
        "Manicure",
        "Pedicure",
        "Semipermanente",
        "Ricostruzione gel",
        "Ricostruzione acrilico",
        "Copertura in gel",
        "Refill",
        "Rimozione semipermanente/gel",
        "Nail repair (riparazione unghia)",
        "French manicure",
        "Baby boomer",
      ],
    },
    {
      title: "Trattamenti mani e piedi",
      description: "Trattamenti spa mani, spa piedi, paraffina e cura cuticole.",
      items: [
        "Spa mani",
        "Spa piedi",
        "Trattamento paraffina",
        "Cura cuticole",
        "Scrub mani",
        "Massaggio mani e piedi",
        "Trattamento rinforzante unghie",
      ],
    },
    {
      title: "Profilo cliente nails",
      description: "Scheda cliente con allergie, forma unghia preferita e storico.",
      items: [
        "Scheda cliente nails",
        "Allergie e intolleranze prodotti",
        "Forma unghia preferita",
        "Lunghezza preferita",
        "Storico servizi unghie",
        "Colori preferiti",
        "Note personalizzate",
      ],
    },
    {
      title: "Prodotti e magazzino",
      description: "Gestione prodotti, scorte smalti/gel e vendita prodotti.",
      items: [
        "Catalogo smalti e gel",
        "Gestione scorte magazzino",
        "Alert prodotto in esaurimento",
        "Vendita prodotti al cliente",
        "Listino prezzi prodotti",
      ],
    },
  ],
  spa: [
    {
      title: "Spa e benessere",
      description: "Percorsi benessere, pacchetti relax e programmi detox.",
      items: ["Percorsi benessere", "Prenotazione percorsi", "Pacchetti relax", "Programmi detox"],
    },
  ],
  estetica: [
    {
      title: "Trattamenti viso",
      description: "Pulizia viso, peeling, trattamenti anti-age e idratanti.",
      items: [
        "Pulizia viso",
        "Peeling",
        "Trattamenti anti-age",
        "Trattamenti idratanti",
        "Radiofrequenza viso",
        "Microneedling",
      ],
    },
    {
      title: "Trattamenti corpo",
      description: "Massaggi, linfodrenaggio, pressoterapia e bendaggi.",
      items: [
        "Massaggi corpo",
        "Linfodrenaggio",
        "Pressoterapia",
        "Bendaggi",
        "Trattamenti anticellulite",
        "Trattamenti rassodanti",
      ],
    },
    {
      title: "Epilazione",
      description: "Ceretta, epilazione laser e luce pulsata.",
      items: [
        "Ceretta",
        "Epilazione laser",
        "Luce pulsata",
      ],
    },
    {
      title: "Mani e piedi",
      description: "Manicure, pedicure, semipermanente e ricostruzione.",
      items: [
        "Manicure",
        "Pedicure",
        "Semipermanente",
        "Ricostruzione unghie",
      ],
    },
    {
      title: "Trucco e make-up",
      description: "Make-up eventi, trucco sposa e consulenza immagine.",
      items: [
        "Make-up eventi",
        "Trucco sposa",
        "Consulenza immagine",
        "Extension ciglia",
        "Laminazione ciglia",
        "Tinta sopracciglia",
      ],
    },
    {
      title: "Solarium e abbronzatura",
      description: "Solarium, spray tan e lampade abbronzanti.",
      items: [
        "Solarium",
        "Spray tan",
        "Lampade abbronzanti",
      ],
    },
  ],
};

function getTemplateType(name = "") {
  const normalized = name.toLowerCase();
  if (normalized.includes("hair") || normalized.includes("stilist") || normalized.includes("parrucch")) return "hair";
  if (normalized.includes("nails") || normalized.includes("nail") || normalized.includes("unghie")) return "nails";
  if (normalized.includes("spa") || normalized.includes("benessere")) return "spa";
  if (normalized.includes("estet") || normalized.includes("beauty") || normalized.includes("bellezza")) return "estetica";
  return null;
}

export default function FeatureChecklist({ selectedApp, selectedFeatures, onToggle }) {
  const templateType = getTemplateType(selectedApp?.name);
  const groups = [...COMMON_GROUPS, ...(SPECIFIC_GROUPS[templateType] || [])];

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Funzioni selezionabili</p>
          <p className="text-sm text-gray-300 mt-1">Scegli cosa vuoi inserire nella tua app</p>
        </div>
        <div className="shrink-0 rounded-full bg-purple-500/15 border border-purple-400/20 px-3 py-1 text-xs font-bold text-purple-300">
          {selectedFeatures.length} scelte
        </div>
      </div>

      <ScrollArea className="max-h-[56vh] pr-2">
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.title} className="rounded-2xl border border-white/6 bg-white/[0.02] p-3">
              <p className="text-sm font-bold text-white">{group.title}</p>
              {group.description && <p className="text-xs text-gray-400 mt-1 mb-3">{group.description}</p>}
              <div className="space-y-2">
                {group.items.map((item) => {
                  const checked = selectedFeatures.includes(item);
                  return (
                    <label
                      key={item}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-all ${
                        checked
                          ? "border-purple-500/40 bg-purple-500/10"
                          : "border-white/6 bg-white/[0.02] hover:bg-white/[0.04]"
                      }`}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => onToggle(item)} className="border-white/30 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500" />
                      <span className="text-sm text-gray-200">{item}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}