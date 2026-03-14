import React, { useState } from "react";
import { ChevronDown, ChevronRight, Search, Package } from "lucide-react";

export default function ExtractedMenuPreview({ pdfMenuData }) {
  const [expandedSections, setExpandedSections] = useState({});
  const [search, setSearch] = useState("");

  if (!pdfMenuData?.sections?.length) return null;

  const toggleSection = (idx) => {
    setExpandedSections(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const expandAll = () => {
    const all = {};
    pdfMenuData.sections.forEach((_, i) => { all[i] = true; });
    setExpandedSections(all);
  };

  const collapseAll = () => setExpandedSections({});

  const allExpanded = pdfMenuData.sections.every((_, i) => expandedSections[i]);

  const filteredSections = search.trim()
    ? pdfMenuData.sections.map(sec => ({
        ...sec,
        items: (sec.items || []).filter(it =>
          (it.name || "").toLowerCase().includes(search.toLowerCase()) ||
          (it.description || "").toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(sec => sec.items.length > 0)
    : pdfMenuData.sections;

  const totalFiltered = filteredSections.reduce((n, s) => n + (s.items?.length || 0), 0);

  return (
    <div className="mt-3 space-y-2">
      {/* Header riepilogo */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-gray-400">
          <span className="text-green-400 font-bold">{pdfMenuData.itemsCount}</span> voci in{" "}
          <span className="text-green-400 font-bold">{pdfMenuData.sections.length}</span> sezioni
        </p>
        <button
          onClick={allExpanded ? collapseAll : expandAll}
          className="text-[10px] text-purple-400 hover:text-purple-300"
        >
          {allExpanded ? "Chiudi tutto" : "Apri tutto"}
        </button>
      </div>

      {/* Barra ricerca */}
      {pdfMenuData.itemsCount > 10 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca una voce..."
            className="w-full bg-white/[0.04] border border-white/8 rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/30"
          />
          {search && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-500">
              {totalFiltered} risultati
            </span>
          )}
        </div>
      )}

      {/* Sezioni */}
      <div className="max-h-[280px] overflow-y-auto space-y-1 pr-0.5 scrollbar-thin">
        {filteredSections.map((sec, idx) => {
          const originalIdx = pdfMenuData.sections.findIndex(s => s.section_title === sec.section_title);
          const isOpen = expandedSections[originalIdx];
          const itemCount = (sec.items || []).length;

          return (
            <div key={idx} className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <button
                onClick={() => toggleSection(originalIdx)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.03] transition-colors"
              >
                {isOpen
                  ? <ChevronDown className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  : <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                }
                <span className="text-[11px] font-bold text-white flex-1 truncate">
                  {sec.section_title || "Senza categoria"}
                </span>
                <span className="text-[9px] text-gray-500 bg-white/[0.06] px-1.5 py-0.5 rounded-full shrink-0">
                  {itemCount}
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-white/[0.04] px-3 py-1.5 space-y-0.5">
                  {(sec.items || []).map((item, ii) => (
                    <div key={ii} className="flex items-start justify-between gap-2 py-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-white/90 truncate">{item.name}</p>
                        {item.description && (
                          <p className="text-[9px] text-gray-500 truncate">{item.description}</p>
                        )}
                      </div>
                      {item.price && (
                        <span className="text-[10px] text-green-400 font-semibold shrink-0 whitespace-nowrap">
                          {item.price}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {search && totalFiltered === 0 && (
        <div className="text-center py-3">
          <Package className="w-5 h-5 text-gray-600 mx-auto mb-1" />
          <p className="text-[10px] text-gray-500">Nessun risultato per "{search}"</p>
        </div>
      )}
    </div>
  );
}