import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, Search, Globe, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';

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

export default function CountrySearchSelect({ selected = [], onChange, maxSelections = 5 }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const allOpts = [WORLD_OPTION, ...ALL_COUNTRIES];
    if (!q) return allOpts.filter(c => !selected.includes(c.code)).slice(0, 30);
    return allOpts
      .filter(c => !selected.includes(c.code) && (c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)))
      .slice(0, 20);
  }, [search, selected]);

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

  return (
    <div ref={dropdownRef} className="relative">
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
              <button onClick={() => handleRemove(c.code)} className="text-lime-400/60 hover:text-lime-400 ml-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div
        className="relative cursor-pointer"
        onClick={() => { if (selected.length < maxSelections) setOpen(true); }}
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          placeholder={selected.length >= maxSelections ? `Massimo ${maxSelections} Paesi` : "Cerca Paese... (es. Germania, US, Brasile)"}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => { if (selected.length < maxSelections) setOpen(true); }}
          className="bg-slate-900 border-slate-700 text-white pl-9 pr-8"
          disabled={selected.length >= maxSelections}
        />
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
      </div>
      <p className="text-slate-500 text-[10px] mt-1">{selected.length}/{maxSelections} Paesi selezionati</p>

      {/* Dropdown */}
      {open && selected.length < maxSelections && (
        <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-slate-500 text-sm p-3 text-center">Nessun risultato</p>
          ) : (
            filtered.map(c => (
              <button
                key={c.code}
                onClick={() => handleSelect(c.code)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-700 transition-colors text-left"
              >
                {c.code !== 'WLD' ? (
                  <img src={getFlagUrl(c.code)} alt="" className="w-6 h-4 object-cover rounded-sm flex-shrink-0" />
                ) : (
                  <Globe className="w-5 h-4 text-blue-400 flex-shrink-0" />
                )}
                <span className="text-white text-sm">{c.name}</span>
                <span className="text-slate-500 text-xs ml-auto">{c.code}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export { ALL_COUNTRIES, WORLD_OPTION, getFlagUrl };