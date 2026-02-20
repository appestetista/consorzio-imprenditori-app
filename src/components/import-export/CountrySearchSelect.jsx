import React, { useState, useMemo } from 'react';
import { X, Search, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Full list of UN Comtrade countries with ISO2 codes
const ALL_COUNTRIES = [
  { code: 'AF', name: 'Afghanistan' }, { code: 'AL', name: 'Albania' }, { code: 'DZ', name: 'Algeria' },
  { code: 'AO', name: 'Angola' }, { code: 'AR', name: 'Argentina' }, { code: 'AM', name: 'Armenia' },
  { code: 'AU', name: 'Australia' }, { code: 'AT', name: 'Austria' }, { code: 'AZ', name: 'Azerbaigian' },
  { code: 'BH', name: 'Bahrein' }, { code: 'BD', name: 'Bangladesh' }, { code: 'BY', name: 'Bielorussia' },
  { code: 'BE', name: 'Belgio' }, { code: 'BJ', name: 'Benin' }, { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia-Erzegovina' }, { code: 'BW', name: 'Botswana' }, { code: 'BR', name: 'Brasile' },
  { code: 'BN', name: 'Brunei' }, { code: 'BG', name: 'Bulgaria' }, { code: 'BF', name: 'Burkina Faso' },
  { code: 'KH', name: 'Cambogia' }, { code: 'CM', name: 'Camerun' }, { code: 'CA', name: 'Canada' },
  { code: 'CL', name: 'Cile' }, { code: 'CN', name: 'Cina' }, { code: 'CO', name: 'Colombia' },
  { code: 'CG', name: 'Congo' }, { code: 'CR', name: 'Costa Rica' }, { code: 'CI', name: 'Costa d\'Avorio' },
  { code: 'HR', name: 'Croazia' }, { code: 'CU', name: 'Cuba' }, { code: 'CY', name: 'Cipro' },
  { code: 'CZ', name: 'Rep. Ceca' }, { code: 'DK', name: 'Danimarca' }, { code: 'DO', name: 'Rep. Dominicana' },
  { code: 'EC', name: 'Ecuador' }, { code: 'EG', name: 'Egitto' }, { code: 'SV', name: 'El Salvador' },
  { code: 'EE', name: 'Estonia' }, { code: 'ET', name: 'Etiopia' }, { code: 'FI', name: 'Finlandia' },
  { code: 'FR', name: 'Francia' }, { code: 'GA', name: 'Gabon' }, { code: 'GE', name: 'Georgia' },
  { code: 'DE', name: 'Germania' }, { code: 'GH', name: 'Ghana' }, { code: 'GR', name: 'Grecia' },
  { code: 'GT', name: 'Guatemala' }, { code: 'GN', name: 'Guinea' }, { code: 'HN', name: 'Honduras' },
  { code: 'HK', name: 'Hong Kong' }, { code: 'HU', name: 'Ungheria' }, { code: 'IS', name: 'Islanda' },
  { code: 'IN', name: 'India' }, { code: 'ID', name: 'Indonesia' }, { code: 'IR', name: 'Iran' },
  { code: 'IQ', name: 'Iraq' }, { code: 'IE', name: 'Irlanda' }, { code: 'IL', name: 'Israele' },
  { code: 'IT', name: 'Italia' }, { code: 'JM', name: 'Giamaica' }, { code: 'JP', name: 'Giappone' },
  { code: 'JO', name: 'Giordania' }, { code: 'KZ', name: 'Kazakistan' }, { code: 'KE', name: 'Kenya' },
  { code: 'KR', name: 'Corea del Sud' }, { code: 'KW', name: 'Kuwait' }, { code: 'LV', name: 'Lettonia' },
  { code: 'LB', name: 'Libano' }, { code: 'LY', name: 'Libia' }, { code: 'LT', name: 'Lituania' },
  { code: 'LU', name: 'Lussemburgo' }, { code: 'MO', name: 'Macao' }, { code: 'MG', name: 'Madagascar' },
  { code: 'MY', name: 'Malesia' }, { code: 'ML', name: 'Mali' }, { code: 'MT', name: 'Malta' },
  { code: 'MX', name: 'Messico' }, { code: 'MD', name: 'Moldavia' }, { code: 'MN', name: 'Mongolia' },
  { code: 'ME', name: 'Montenegro' }, { code: 'MA', name: 'Marocco' }, { code: 'MZ', name: 'Mozambico' },
  { code: 'MM', name: 'Myanmar' }, { code: 'NA', name: 'Namibia' }, { code: 'NP', name: 'Nepal' },
  { code: 'NL', name: 'Paesi Bassi' }, { code: 'NZ', name: 'Nuova Zelanda' }, { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' }, { code: 'NG', name: 'Nigeria' }, { code: 'NO', name: 'Norvegia' },
  { code: 'OM', name: 'Oman' }, { code: 'PK', name: 'Pakistan' }, { code: 'PA', name: 'Panama' },
  { code: 'PY', name: 'Paraguay' }, { code: 'PE', name: 'Perù' }, { code: 'PH', name: 'Filippine' },
  { code: 'PL', name: 'Polonia' }, { code: 'PT', name: 'Portogallo' }, { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Romania' }, { code: 'RU', name: 'Russia' }, { code: 'RW', name: 'Ruanda' },
  { code: 'SA', name: 'Arabia Saudita' }, { code: 'SN', name: 'Senegal' }, { code: 'RS', name: 'Serbia' },
  { code: 'SG', name: 'Singapore' }, { code: 'SK', name: 'Slovacchia' }, { code: 'SI', name: 'Slovenia' },
  { code: 'ZA', name: 'Sudafrica' }, { code: 'ES', name: 'Spagna' }, { code: 'LK', name: 'Sri Lanka' },
  { code: 'SD', name: 'Sudan' }, { code: 'SE', name: 'Svezia' }, { code: 'CH', name: 'Svizzera' },
  { code: 'TW', name: 'Taiwan' }, { code: 'TZ', name: 'Tanzania' }, { code: 'TH', name: 'Thailandia' },
  { code: 'TN', name: 'Tunisia' }, { code: 'TR', name: 'Turchia' }, { code: 'UA', name: 'Ucraina' },
  { code: 'AE', name: 'Emirati Arabi' }, { code: 'GB', name: 'Regno Unito' }, { code: 'US', name: 'Stati Uniti' },
  { code: 'UY', name: 'Uruguay' }, { code: 'UZ', name: 'Uzbekistan' }, { code: 'VE', name: 'Venezuela' },
  { code: 'VN', name: 'Vietnam' }, { code: 'ZM', name: 'Zambia' }, { code: 'ZW', name: 'Zimbabwe' }
];

const WORLD_OPTION = { code: 'WLD', name: 'World (Mondo intero)' };

function getFlagUrl(code) {
  if (code === 'WLD') return null;
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
}

const CONTINENT_MAP = {
  AL: 'Europa', AT: 'Europa', BA: 'Europa', BE: 'Europa', BG: 'Europa', BY: 'Europa',
  CH: 'Europa', CY: 'Europa', CZ: 'Europa', DE: 'Europa', DK: 'Europa', EE: 'Europa',
  ES: 'Europa', FI: 'Europa', FR: 'Europa', GB: 'Europa', GE: 'Europa', GR: 'Europa',
  HR: 'Europa', HU: 'Europa', IE: 'Europa', IS: 'Europa', IT: 'Europa', LT: 'Europa',
  LU: 'Europa', LV: 'Europa', MD: 'Europa', ME: 'Europa', MT: 'Europa', NL: 'Europa',
  NO: 'Europa', PL: 'Europa', PT: 'Europa', RO: 'Europa', RS: 'Europa', RU: 'Europa',
  SE: 'Europa', SI: 'Europa', SK: 'Europa', UA: 'Europa',
  AR: 'America', BO: 'America', BR: 'America', CA: 'America', CL: 'America', CO: 'America',
  CR: 'America', CU: 'America', DO: 'America', EC: 'America', GT: 'America', HN: 'America',
  JM: 'America', MX: 'America', NI: 'America', PA: 'America', PE: 'America', PY: 'America',
  SV: 'America', US: 'America', UY: 'America', VE: 'America',
  AE: 'Asia', AF: 'Asia', AM: 'Asia', AZ: 'Asia', BD: 'Asia', BH: 'Asia', BN: 'Asia',
  CN: 'Asia', HK: 'Asia', ID: 'Asia', IL: 'Asia', IN: 'Asia', IQ: 'Asia', IR: 'Asia',
  JO: 'Asia', JP: 'Asia', KH: 'Asia', KR: 'Asia', KW: 'Asia', KZ: 'Asia', LB: 'Asia',
  LK: 'Asia', MM: 'Asia', MN: 'Asia', MO: 'Asia', MY: 'Asia', NP: 'Asia', OM: 'Asia',
  PH: 'Asia', PK: 'Asia', QA: 'Asia', SA: 'Asia', SG: 'Asia', TH: 'Asia', TR: 'Asia',
  TW: 'Asia', UZ: 'Asia', VN: 'Asia', AU: 'Asia', NZ: 'Asia',
  AO: 'Africa', BF: 'Africa', BJ: 'Africa', BW: 'Africa', CM: 'Africa', CG: 'Africa',
  CI: 'Africa', DZ: 'Africa', EG: 'Africa', ET: 'Africa', GA: 'Africa', GH: 'Africa',
  GN: 'Africa', KE: 'Africa', LY: 'Africa', MA: 'Africa', MG: 'Africa', ML: 'Africa',
  MZ: 'Africa', NA: 'Africa', NE: 'Africa', NG: 'Africa', RW: 'Africa', SD: 'Africa',
  SN: 'Africa', TN: 'Africa', TZ: 'Africa', ZA: 'Africa', ZM: 'Africa', ZW: 'Africa',
};

const CONTINENT_ORDER = ['Europa', 'America', 'Asia', 'Africa'];
const CONTINENT_COLORS = {
  Europa: 'from-blue-500 to-indigo-500',
  America: 'from-emerald-500 to-teal-500',
  Asia: 'from-amber-500 to-orange-500',
  Africa: 'from-rose-500 to-pink-500',
};

export default function CountrySearchSelect({ selected = [], onChange, maxSelections = 5 }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeContinent, setActiveContinent] = useState('Europa');

  const grouped = useMemo(() => {
    const q = search.toLowerCase().trim();
    const groups = {};
    CONTINENT_ORDER.forEach(c => { groups[c] = []; });

    const allOpts = ALL_COUNTRIES.filter(c => !selected.includes(c.code));
    const matching = q
      ? allOpts.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
      : allOpts;

    matching.forEach(c => {
      const cont = CONTINENT_MAP[c.code] || 'Africa';
      if (groups[cont]) groups[cont].push(c);
    });

    return groups;
  }, [search, selected]);

  const visibleCountries = useMemo(() => {
    if (search.trim()) {
      return CONTINENT_ORDER.flatMap(c => grouped[c]);
    }
    if (activeContinent) {
      return grouped[activeContinent] || [];
    }
    return [];
  }, [grouped, activeContinent, search]);

  const selectedCountries = useMemo(() => {
    return selected.map(code => {
      if (code === 'WLD') return WORLD_OPTION;
      return ALL_COUNTRIES.find(c => c.code === code) || { code, name: code };
    });
  }, [selected]);

  const handleSelect = (code) => {
    if (selected.length >= maxSelections) return;
    onChange([...selected, code]);
    setSearch('');
    if (selected.length + 1 >= maxSelections) setOpen(false);
  };

  const handleRemove = (code) => {
    onChange(selected.filter(c => c !== code));
  };

  const canOpen = selected.length < maxSelections;

  return (
    <div>
      {/* Selected chips */}
      {selectedCountries.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedCountries.map(c => (
            <div key={c.code} className="flex items-center gap-1.5 bg-lime-400/15 border border-lime-400/30 rounded-lg px-2.5 py-1.5">
              {c.code !== 'WLD' ? (
                <img src={getFlagUrl(c.code)} alt="" className="w-5 h-3.5 object-cover rounded-sm" />
              ) : (
                <Globe className="w-4 h-4 text-lime-400" />
              )}
              <span className="text-lime-300 text-xs font-medium">{c.name}</span>
              <button type="button" onClick={() => handleRemove(c.code)} className="text-lime-400/60 hover:text-lime-400 ml-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => { if (canOpen) setOpen(true); }}
        className={`w-full flex items-center gap-2 bg-slate-900 border border-slate-700 text-white px-3 py-2.5 rounded-xl text-left ${!canOpen ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-500 cursor-pointer'}`}
      >
        <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <span className="text-slate-500 text-sm flex-1">
          {canOpen ? 'Cerca Paese... (es. Germania, US)' : `Massimo ${maxSelections} Paesi`}
        </span>
      </button>
      <p className="text-slate-500 text-[10px] mt-1">{selected.length}/{maxSelections} Paesi selezionati</p>

      {/* Dialog popup */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md p-0 gap-0 max-h-[80vh] flex flex-col">
          <DialogHeader className="px-4 pt-4 pb-2 flex-shrink-0">
            <DialogTitle className="text-white text-base">Seleziona Paesi</DialogTitle>
            <p className="text-slate-400 text-xs">{selected.length}/{maxSelections} selezionati</p>
          </DialogHeader>

          {/* Search inside dialog */}
          <div className="px-4 pb-2 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Cerca Paese..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); }}
                className="bg-slate-800 border-slate-700 text-white pl-9"
                autoFocus
              />
            </div>
          </div>

          {/* World option */}
          {!selected.includes('WLD') && !search.trim() && (
            <button
              type="button"
              onClick={() => handleSelect('WLD')}
              className="mx-4 mb-2 flex items-center gap-2.5 px-3 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-colors text-left flex-shrink-0"
            >
              <Globe className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span className="text-white text-sm font-semibold">World (Mondo intero)</span>
            </button>
          )}

          {/* Continent tabs */}
          {!search.trim() && (
            <div className="flex overflow-x-auto gap-1.5 px-4 pb-2 scrollbar-hide flex-shrink-0">
              {CONTINENT_ORDER.map(cont => {
                const count = grouped[cont]?.length || 0;
                const isActive = activeContinent === cont;
                return (
                  <button
                    key={cont}
                    type="button"
                    onClick={() => setActiveContinent(cont)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isActive
                        ? `bg-gradient-to-r ${CONTINENT_COLORS[cont]} text-white shadow-lg`
                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {cont} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Country list */}
          <div className="flex-1 overflow-y-auto px-2 pb-3 min-h-0">
            {visibleCountries.length === 0 ? (
              <p className="text-slate-500 text-sm p-3 text-center">
                {search.trim() ? 'Nessun risultato' : 'Seleziona un continente'}
              </p>
            ) : (
              visibleCountries.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSelect(c.code)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-800 rounded-lg transition-colors text-left"
                >
                  <img src={getFlagUrl(c.code)} alt="" className="w-6 h-4 object-cover rounded-sm flex-shrink-0" />
                  <span className="text-white text-sm">{c.name}</span>
                  <span className="text-slate-500 text-xs ml-auto">{c.code}</span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { ALL_COUNTRIES, WORLD_OPTION, getFlagUrl };