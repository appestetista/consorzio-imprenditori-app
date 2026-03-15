import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

const COMMON_GROUPS = [
  {
    title: "Calendario e prenotazioni",
    items: [
      "Calendario appuntamenti",
      "Prenotazione online clienti",
      "Promemoria automatici",
      "Gestione lista d’attesa",
      "Blocco orari non disponibili",
      "Gestione più operatori",
    ],
  },
  {
    title: "Profilo cliente",
    items: [
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
    items: [
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
      title: "Colori e trattamenti capelli",
      items: [
        "Archivio colori",
        "Formula colore utilizzata",
        "Marca",
        "Percentuali",
        "Foto risultato",
        "Gestione trattamenti",
        "Piani ricostruzione",
        "Reminder trattamento",
      ],
    },
    {
      title: "Consulenza capelli",
      items: ["Analisi capello", "Analisi cuoio capelluto"],
    },
  ],
  nails: [
    {
      title: "Nail",
      items: ["Archivio nail art", "Catalogo design", "Preferiti cliente"],
    },
  ],
  spa: [
    {
      title: "Spa e benessere",
      items: ["Percorsi benessere", "Prenotazione percorsi", "Pacchetti relax", "Programmi detox"],
    },
  ],
};

function getTemplateType(name = "") {
  const normalized = name.toLowerCase();
  if (normalized.includes("hair")) return "hair";
  if (normalized.includes("nails")) return "nails";
  if (normalized.includes("spa")) return "spa";
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

      <ScrollArea className="max-h-[360px] pr-2">
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.title} className="rounded-2xl border border-white/6 bg-white/[0.02] p-3">
              <p className="text-sm font-bold text-white mb-3">{group.title}</p>
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