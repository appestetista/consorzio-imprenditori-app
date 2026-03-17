import React, { useState, useMemo } from 'react';
import { X, Search, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Full list of UN Comtrade countries with ISO2 codes
const ALL_COUNTRIES = [
  { code: 'AF', name: 'Afghanistan' }, { code: 'AL', name: 'Albania' }, { code: 'DZ', name: 'Algeria' },
  { code: 'AD', name: 'Andorra' }, { code: 'AO', name: 'Angola' }, { code: 'AG', name: 'Antigua e Barbuda' },
  { code: 'AR', name: 'Argentina' }, { code: 'AM', name: 'Armenia' }, { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' }, { code: 'AZ', name: 'Azerbaigian' },
  { code: 'BS', name: 'Bahamas' }, { code: 'BH', name: 'Bahrein' }, { code: 'BD', name: 'Bangladesh' },
  { code: 'BB', name: 'Barbados' }, { code: 'BY', name: 'Bielorussia' }, { code: 'BE', name: 'Belgio' },
  { code: 'BZ', name: 'Belize' }, { code: 'BJ', name: 'Benin' }, { code: 'BT', name: 'Bhutan' },
  { code: 'BO', name: 'Bolivia' }, { code: 'BA', name: 'Bosnia-Erzegovina' }, { code: 'BW', name: 'Botswana' },
  { code: 'BR', name: 'Brasile' }, { code: 'BN', name: 'Brunei' }, { code: 'BG', name: 'Bulgaria' },
  { code: 'BF', name: 'Burkina Faso' }, { code: 'BI', name: 'Burundi' },
  { code: 'KH', name: 'Cambogia' }, { code: 'CM', name: 'Camerun' }, { code: 'CA', name: 'Canada' },
  { code: 'CV', name: 'Capo Verde' }, { code: 'TD', name: 'Ciad' }, { code: 'CL', name: 'Cile' },
  { code: 'CN', name: 'Cina' }, { code: 'CO', name: 'Colombia' }, { code: 'KM', name: 'Comore' },
  { code: 'CG', name: 'Congo' }, { code: 'CD', name: 'Congo (RDC)' }, { code: 'KP', name: 'Corea del Nord' },
  { code: 'KR', name: 'Corea del Sud' }, { code: 'CR', name: 'Costa Rica' }, { code: 'CI', name: 'Costa d\'Avorio' },
  { code: 'HR', name: 'Croazia' }, { code: 'CU', name: 'Cuba' }, { code: 'CY', name: 'Cipro' },
  { code: 'CZ', name: 'Rep. Ceca' }, { code: 'DK', name: 'Danimarca' }, { code: 'DJ', name: 'Gibuti' },
  { code: 'DM', name: 'Dominica' }, { code: 'DO', name: 'Rep. Dominicana' },
  { code: 'EC', name: 'Ecuador' }, { code: 'EG', name: 'Egitto' }, { code: 'SV', name: 'El Salvador' },
  { code: 'GQ', name: 'Guinea Equatoriale' }, { code: 'ER', name: 'Eritrea' }, { code: 'EE', name: 'Estonia' },
  { code: 'SZ', name: 'Eswatini' }, { code: 'ET', name: 'Etiopia' },
  { code: 'FJ', name: 'Fiji' }, { code: 'FI', name: 'Finlandia' }, { code: 'FR', name: 'Francia' },
  { code: 'GA', name: 'Gabon' }, { code: 'GM', name: 'Gambia' }, { code: 'GE', name: 'Georgia' },
  { code: 'DE', name: 'Germania' }, { code: 'GH', name: 'Ghana' }, { code: 'GR', name: 'Grecia' },
  { code: 'GD', name: 'Grenada' }, { code: 'GT', name: 'Guatemala' }, { code: 'GN', name: 'Guinea' },
  { code: 'GW', name: 'Guinea-Bissau' }, { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haiti' }, { code: 'HN', name: 'Honduras' }, { code: 'HK', name: 'Hong Kong' },
  { code: 'HU', name: 'Ungheria' }, { code: 'IS', name: 'Islanda' },
  { code: 'IN', name: 'India' }, { code: 'ID', name: 'Indonesia' }, { code: 'IR', name: 'Iran' },
  { code: 'IQ', name: 'Iraq' }, { code: 'IE', name: 'Irlanda' }, { code: 'IL', name: 'Israele' },
  { code: 'IT', name: 'Italia' }, { code: 'JM', name: 'Giamaica' }, { code: 'JP', name: 'Giappone' },
  { code: 'JO', name: 'Giordania' }, { code: 'KZ', name: 'Kazakistan' }, { code: 'KE', name: 'Kenya' },
  { code: 'KI', name: 'Kiribati' }, { code: 'KW', name: 'Kuwait' }, { code: 'KG', name: 'Kirghizistan' },
  { code: 'LA', name: 'Laos' }, { code: 'LV', name: 'Lettonia' }, { code: 'LB', name: 'Libano' },
  { code: 'LS', name: 'Lesotho' }, { code: 'LR', name: 'Liberia' }, { code: 'LY', name: 'Libia' },
  { code: 'LI', name: 'Liechtenstein' }, { code: 'LT', name: 'Lituania' }, { code: 'LU', name: 'Lussemburgo' },
  { code: 'MO', name: 'Macao' }, { code: 'MG', name: 'Madagascar' }, { code: 'MW', name: 'Malawi' },
  { code: 'MY', name: 'Malesia' }, { code: 'MV', name: 'Maldive' }, { code: 'ML', name: 'Mali' },
  { code: 'MT', name: 'Malta' }, { code: 'MH', name: 'Isole Marshall' }, { code: 'MR', name: 'Mauritania' },
  { code: 'MU', name: 'Mauritius' }, { code: 'MX', name: 'Messico' }, { code: 'FM', name: 'Micronesia' },
  { code: 'MD', name: 'Moldavia' }, { code: 'MC', name: 'Monaco' }, { code: 'MN', name: 'Mongolia' },
  { code: 'ME', name: 'Montenegro' }, { code: 'MA', name: 'Marocco' }, { code: 'MZ', name: 'Mozambico' },
  { code: 'MM', name: 'Myanmar' }, { code: 'NA', name: 'Namibia' }, { code: 'NR', name: 'Nauru' },
  { code: 'NP', name: 'Nepal' }, { code: 'NL', name: 'Paesi Bassi' }, { code: 'NZ', name: 'Nuova Zelanda' },
  { code: 'NI', name: 'Nicaragua' }, { code: 'NE', name: 'Niger' }, { code: 'NG', name: 'Nigeria' },
  { code: 'MK', name: 'Macedonia del Nord' }, { code: 'NO', name: 'Norvegia' },
  { code: 'OM', name: 'Oman' }, { code: 'PK', name: 'Pakistan' }, { code: 'PW', name: 'Palau' },
  { code: 'PA', name: 'Panama' }, { code: 'PG', name: 'Papua Nuova Guinea' },
  { code: 'PY', name: 'Paraguay' }, { code: 'PE', name: 'Perù' }, { code: 'PH', name: 'Filippine' },
  { code: 'PL', name: 'Polonia' }, { code: 'PT', name: 'Portogallo' }, { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Romania' }, { code: 'RU', name: 'Russia' }, { code: 'RW', name: 'Ruanda' },
  { code: 'WS', name: 'Samoa' }, { code: 'SM', name: 'San Marino' }, { code: 'ST', name: 'São Tomé e Príncipe' },
  { code: 'SA', name: 'Arabia Saudita' }, { code: 'SN', name: 'Senegal' }, { code: 'RS', name: 'Serbia' },
  { code: 'SC', name: 'Seychelles' }, { code: 'SL', name: 'Sierra Leone' }, { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovacchia' }, { code: 'SI', name: 'Slovenia' }, { code: 'SB', name: 'Isole Salomone' },
  { code: 'SO', name: 'Somalia' }, { code: 'ZA', name: 'Sudafrica' }, { code: 'SS', name: 'Sud Sudan' },
  { code: 'ES', name: 'Spagna' }, { code: 'LK', name: 'Sri Lanka' }, { code: 'SD', name: 'Sudan' },
  { code: 'SR', name: 'Suriname' }, { code: 'SE', name: 'Svezia' }, { code: 'CH', name: 'Svizzera' },
  { code: 'SY', name: 'Siria' }, { code: 'TW', name: 'Taiwan' }, { code: 'TJ', name: 'Tagikistan' },
  { code: 'TZ', name: 'Tanzania' }, { code: 'TH', name: 'Thailandia' }, { code: 'TL', name: 'Timor Est' },
  { code: 'TG', name: 'Togo' }, { code: 'TO', name: 'Tonga' }, { code: 'TT', name: 'Trinidad e Tobago' },
  { code: 'TN', name: 'Tunisia' }, { code: 'TR', name: 'Turchia' }, { code: 'TM', name: 'Turkmenistan' },
  { code: 'TV', name: 'Tuvalu' }, { code: 'UG', name: 'Uganda' }, { code: 'UA', name: 'Ucraina' },
  { code: 'AE', name: 'Emirati Arabi' }, { code: 'GB', name: 'Regno Unito' }, { code: 'US', name: 'Stati Uniti' },
  { code: 'UY', name: 'Uruguay' }, { code: 'UZ', name: 'Uzbekistan' }, { code: 'VU', name: 'Vanuatu' },
  { code: 'VE', name: 'Venezuela' }, { code: 'VN', name: 'Vietnam' }, { code: 'YE', name: 'Yemen' },
  { code: 'ZM', name: 'Zambia' }, { code: 'ZW', name: 'Zimbabwe' }
];

const WORLD_OPTION = { code: 'WLD', name: 'World (Mondo intero)' };

function getFlagUrl(code) {
  if (code === 'WLD') return null;
  return `https://www.bandiere-mondo.it/data/flags/h80/${code.toLowerCase()}.webp`;
}

const CONTINENT_MAP = {
  // Europa
  AD: 'Europa', AL: 'Europa', AT: 'Europa', BA: 'Europa', BE: 'Europa', BG: 'Europa', BY: 'Europa',
  CH: 'Europa', CY: 'Europa', CZ: 'Europa', DE: 'Europa', DK: 'Europa', EE: 'Europa',
  ES: 'Europa', FI: 'Europa', FR: 'Europa', GB: 'Europa', GE: 'Europa', GR: 'Europa',
  HR: 'Europa', HU: 'Europa', IE: 'Europa', IS: 'Europa', IT: 'Europa', LI: 'Europa', LT: 'Europa',
  LU: 'Europa', LV: 'Europa', MC: 'Europa', MD: 'Europa', ME: 'Europa', MK: 'Europa', MT: 'Europa',
  NL: 'Europa', NO: 'Europa', PL: 'Europa', PT: 'Europa', RO: 'Europa', RS: 'Europa', RU: 'Europa',
  SE: 'Europa', SI: 'Europa', SK: 'Europa', SM: 'Europa', UA: 'Europa',
  // America
  AG: 'America', AR: 'America', BB: 'America', BO: 'America', BR: 'America', BS: 'America',
  BZ: 'America', CA: 'America', CL: 'America', CO: 'America', CR: 'America', CU: 'America',
  DM: 'America', DO: 'America', EC: 'America', GD: 'America', GT: 'America', GY: 'America',
  HN: 'America', HT: 'America', JM: 'America', MX: 'America', NI: 'America', PA: 'America',
  PE: 'America', PY: 'America', SR: 'America', SV: 'America', TT: 'America', US: 'America',
  UY: 'America', VE: 'America',
  // Asia
  AE: 'Asia', AF: 'Asia', AM: 'Asia', AZ: 'Asia', BD: 'Asia', BH: 'Asia', BN: 'Asia', BT: 'Asia',
  CN: 'Asia', HK: 'Asia', ID: 'Asia', IL: 'Asia', IN: 'Asia', IQ: 'Asia', IR: 'Asia',
  JO: 'Asia', JP: 'Asia', KG: 'Asia', KH: 'Asia', KP: 'Asia', KR: 'Asia', KW: 'Asia', KZ: 'Asia',
  LA: 'Asia', LB: 'Asia', LK: 'Asia', MM: 'Asia', MN: 'Asia', MO: 'Asia', MV: 'Asia', MY: 'Asia',
  NP: 'Asia', OM: 'Asia', PH: 'Asia', PK: 'Asia', QA: 'Asia', SA: 'Asia', SG: 'Asia', SY: 'Asia',
  TH: 'Asia', TJ: 'Asia', TL: 'Asia', TM: 'Asia', TR: 'Asia', TW: 'Asia', UZ: 'Asia', VN: 'Asia',
  YE: 'Asia',
  // Africa
  AO: 'Africa', BF: 'Africa', BI: 'Africa', BJ: 'Africa', BW: 'Africa', CD: 'Africa', CG: 'Africa',
  CI: 'Africa', CM: 'Africa', CV: 'Africa', DJ: 'Africa', DZ: 'Africa', EG: 'Africa', ER: 'Africa',
  ET: 'Africa', GA: 'Africa', GH: 'Africa', GM: 'Africa', GN: 'Africa', GQ: 'Africa', GW: 'Africa',
  KE: 'Africa', KM: 'Africa', LR: 'Africa', LS: 'Africa', LY: 'Africa', MA: 'Africa', MG: 'Africa',
  ML: 'Africa', MR: 'Africa', MU: 'Africa', MW: 'Africa', MZ: 'Africa', NA: 'Africa', NE: 'Africa',
  NG: 'Africa', RW: 'Africa', SC: 'Africa', SD: 'Africa', SL: 'Africa', SN: 'Africa', SO: 'Africa',
  SS: 'Africa', ST: 'Africa', SZ: 'Africa', TD: 'Africa', TG: 'Africa', TN: 'Africa', TZ: 'Africa',
  UG: 'Africa', ZA: 'Africa', ZM: 'Africa', ZW: 'Africa',
  // Oceania
  AU: 'Oceania', FJ: 'Oceania', FM: 'Oceania', KI: 'Oceania', MH: 'Oceania', NR: 'Oceania',
  NZ: 'Oceania', PG: 'Oceania', PW: 'Oceania', SB: 'Oceania', TO: 'Oceania', TV: 'Oceania',
  VU: 'Oceania', WS: 'Oceania',
};

const CONTINENT_ORDER = ['Europa', 'America', 'Asia', 'Africa', 'Oceania'];
const CONTINENT_COLORS = {
  Europa: 'from-blue-500 to-indigo-500',
  America: 'from-emerald-500 to-teal-500',
  Asia: 'from-amber-500 to-orange-500',
  Africa: 'from-rose-500 to-pink-500',
  Oceania: 'from-cyan-500 to-sky-500',
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
      const cont = CONTINENT_MAP[c.code] || 'Oceania';
      if (groups[cont]) groups[cont].push(c);
      else groups['Oceania'].push(c);
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

      {/* Dialog popup - full screen on mobile */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md p-0 gap-0 fixed inset-2 top-2 bottom-2 translate-x-0 translate-y-0 sm:inset-auto sm:top-[50%] sm:left-[50%] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-h-[85vh] flex flex-col rounded-xl">
          <DialogHeader className="px-4 pt-4 pb-2 flex-shrink-0">
            <DialogTitle className="text-white text-base">Seleziona Paesi</DialogTitle>
            <p className="text-slate-400 text-xs">{selected.length}/{maxSelections} selezionati</p>
          </DialogHeader>

          {/* Selected chips inside dialog */}
          {selectedCountries.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-2 flex-shrink-0">
              {selectedCountries.map(c => (
                <div key={c.code} className="flex items-center gap-1.5 bg-lime-400/15 border border-lime-400/30 rounded-lg px-2 py-1">
                  {c.code !== 'WLD' ? (
                    <img src={getFlagUrl(c.code)} alt="" className="w-4 h-3 object-cover rounded-sm" />
                  ) : (
                    <Globe className="w-3.5 h-3.5 text-lime-400" />
                  )}
                  <span className="text-lime-300 text-[11px] font-medium">{c.name}</span>
                  <button type="button" onClick={() => handleRemove(c.code)} className="text-lime-400/60 hover:text-lime-400 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

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