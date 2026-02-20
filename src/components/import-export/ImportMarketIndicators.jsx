import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, ShieldCheck, ShieldAlert, Shield, Activity } from 'lucide-react';

function fmt(val, prefix = '') {
  if (val === null || val === undefined) return 'N/D';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  if (isNaN(num)) return 'N/D';
  if (Math.abs(num) >= 1e12) return `${prefix}${(num / 1e12).toFixed(1)}T`;
  if (Math.abs(num) >= 1e9) return `${prefix}${(num / 1e9).toFixed(1)}B`;
  if (Math.abs(num) >= 1e6) return `${prefix}${(num / 1e6).toFixed(1)}M`;
  if (Math.abs(num) >= 1e3) return `${prefix}${(num / 1e3).toFixed(0)}K`;
  return `${prefix}${num.toFixed(num % 1 ? 1 : 0)}`;
}

function Indicator({ label, value, anno, color, icon: Icon, desc }) {
  return (
    <div className="bg-slate-700/40 rounded-xl p-3 border border-white/5">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className={`w-3.5 h-3.5 ${color || 'text-slate-400'}`} />}
        <span className="text-slate-400 text-[10px] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className={`text-lg font-bold ${color || 'text-white'}`}>{value}</p>
      {desc && <p className={`text-[10px] mt-0.5 ${color || 'text-slate-500'}`}>{desc}</p>}
      {anno && <p className="text-slate-600 text-[9px]">{anno}</p>}
    </div>
  );
}

function getGrowthInfo(val) {
  if (val === null || val === undefined) return { color: 'text-slate-400', desc: 'N/D', icon: Minus };
  const n = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(n)) return { color: 'text-slate-400', desc: 'N/D', icon: Minus };
  if (n >= 4) return { color: 'text-green-400', desc: 'Crescita solida', icon: TrendingUp };
  if (n >= 2) return { color: 'text-lime-400', desc: 'Crescita moderata', icon: TrendingUp };
  if (n >= 0) return { color: 'text-yellow-400', desc: 'Crescita lenta', icon: Minus };
  return { color: 'text-red-400', desc: 'Contrazione', icon: TrendingDown };
}

function getInflationInfo(val) {
  if (val === null || val === undefined) return { color: 'text-slate-400', desc: 'N/D', icon: Activity };
  if (val < 2) return { color: 'text-green-400', desc: 'Stabile', icon: ShieldCheck };
  if (val < 4) return { color: 'text-lime-400', desc: 'Moderata', icon: Shield };
  if (val < 7) return { color: 'text-yellow-400', desc: 'Elevata', icon: ShieldAlert };
  return { color: 'text-red-400', desc: 'Critica', icon: ShieldAlert };
}

function getTradeGrowthInfo(val) {
  if (val === null || val === undefined) return { color: 'text-slate-400', desc: 'N/D' };
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  if (isNaN(n)) return { color: 'text-slate-400', desc: 'N/D' };
  if (n >= 5) return { color: 'text-green-400', desc: 'Mercato in forte crescita' };
  if (n >= 1) return { color: 'text-lime-400', desc: 'Mercato in crescita' };
  if (n >= -2) return { color: 'text-yellow-400', desc: 'Mercato stabile' };
  return { color: 'text-red-400', desc: 'Mercato in contrazione' };
}

function computeStabilityScore(macro) {
  if (!macro) return null;
  let score = 0, weight = 0;
  
  const growth = macro.gdp_growth?.value;
  if (growth !== null && growth !== undefined) {
    score += growth >= 4 ? 25 : growth >= 2 ? 20 : growth >= 0 ? 12 : 5;
    weight += 25;
  }
  const infl = macro.inflation?.value;
  if (infl !== null && infl !== undefined) {
    const a = Math.abs(infl);
    score += a < 2 ? 25 : a < 4 ? 20 : a < 7 ? 12 : 3;
    weight += 25;
  }
  const trade = macro.trade_pct_gdp?.value;
  if (trade !== null && trade !== undefined) {
    score += trade >= 40 ? 25 : trade >= 25 ? 18 : trade >= 15 ? 12 : 5;
    weight += 25;
  }
  const ca = macro.current_account?.value;
  if (ca !== null && ca !== undefined) {
    score += ca >= 0 ? 25 : ca > -50e9 ? 15 : 5;
    weight += 25;
  }
  
  if (weight === 0) return null;
  return Math.round((score / weight) * 100);
}

export default function ImportMarketIndicators({ chinaMacro, topImportatori }) {
  if (!chinaMacro) return null;

  const stability = computeStabilityScore(chinaMacro);
  const growthInfo = getGrowthInfo(chinaMacro.gdp_growth?.value);
  const inflInfo = getInflationInfo(chinaMacro.inflation?.value);
  const tradeGrowthInfo = topImportatori?.crescita_mondiale_3y_perc
    ? getTradeGrowthInfo(topImportatori.crescita_mondiale_3y_perc)
    : { color: 'text-slate-400', desc: 'N/D' };

  let stabilityColor, stabilityLabel;
  if (stability === null) { stabilityColor = 'text-slate-400'; stabilityLabel = 'N/D'; }
  else if (stability >= 75) { stabilityColor = 'text-green-400'; stabilityLabel = 'Economia stabile'; }
  else if (stability >= 55) { stabilityColor = 'text-lime-400'; stabilityLabel = 'Economia moderata'; }
  else if (stability >= 35) { stabilityColor = 'text-yellow-400'; stabilityLabel = 'Attenzione'; }
  else { stabilityColor = 'text-red-400'; stabilityLabel = 'Economia instabile'; }

  return (
    <Card className="bg-slate-800/80 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            🇨🇳 Indicatori Economia Cinese
          </h3>
          {stability !== null && (
            <div className={`px-3 py-1 rounded-full border text-xs font-bold ${
              stability >= 75 ? 'bg-green-500/15 border-green-500/30 text-green-400' :
              stability >= 55 ? 'bg-lime-500/15 border-lime-500/30 text-lime-400' :
              stability >= 35 ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400' :
              'bg-red-500/15 border-red-500/30 text-red-400'
            }`}>
              {stability}/100 — {stabilityLabel}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <Indicator
            label="PIL Crescita"
            value={chinaMacro.gdp_growth?.value !== null ? `${chinaMacro.gdp_growth.value.toFixed(1)}%` : 'N/D'}
            anno={chinaMacro.gdp_growth?.year}
            color={growthInfo.color}
            icon={growthInfo.icon}
            desc={growthInfo.desc}
          />
          <Indicator
            label="Inflazione"
            value={chinaMacro.inflation?.value !== null ? `${chinaMacro.inflation.value.toFixed(1)}%` : 'N/D'}
            anno={chinaMacro.inflation?.year}
            color={inflInfo.color}
            icon={inflInfo.icon}
            desc={inflInfo.desc}
          />
          <Indicator
            label="PIL Nominale"
            value={fmt(chinaMacro.gdp_nominal?.value, '$')}
            anno={chinaMacro.gdp_nominal?.year}
          />
          <Indicator
            label="PIL Pro Capite"
            value={fmt(chinaMacro.gdp_per_capita?.value, '$')}
            anno={chinaMacro.gdp_per_capita?.year}
          />
          <Indicator
            label="Apertura Commerciale"
            value={chinaMacro.trade_pct_gdp?.value !== null ? `${chinaMacro.trade_pct_gdp.value.toFixed(1)}% del PIL` : 'N/D'}
            anno={chinaMacro.trade_pct_gdp?.year}
            desc={chinaMacro.trade_pct_gdp?.value >= 35 ? 'Economia molto aperta' : chinaMacro.trade_pct_gdp?.value >= 20 ? 'Economia aperta' : 'Economia chiusa'}
            color={chinaMacro.trade_pct_gdp?.value >= 35 ? 'text-green-400' : chinaMacro.trade_pct_gdp?.value >= 20 ? 'text-yellow-400' : 'text-red-400'}
          />
          <Indicator
            label="Tasso di Cambio"
            value={chinaMacro.exchange_rate?.value !== null ? `1 USD = ${chinaMacro.exchange_rate.value.toFixed(2)} CNY` : 'N/D'}
            anno={chinaMacro.exchange_rate?.year}
          />
        </div>

        {/* Import mondiale per questa categoria */}
        {topImportatori?.totale_mondiale_usd && (
          <div className={`rounded-xl p-3 border mt-2 ${
            tradeGrowthInfo.color === 'text-green-400' ? 'bg-green-500/10 border-green-500/20' :
            tradeGrowthInfo.color === 'text-lime-400' ? 'bg-lime-500/10 border-lime-500/20' :
            tradeGrowthInfo.color === 'text-yellow-400' ? 'bg-yellow-500/10 border-yellow-500/20' :
            'bg-red-500/10 border-red-500/20'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-[10px] uppercase tracking-wider">Import Mondiale HS {topImportatori.hs_heading}</p>
                <p className="text-white font-bold text-lg">{fmt(topImportatori.totale_mondiale_usd, '$')}</p>
                <p className="text-slate-500 text-[10px]">Anno: {topImportatori.anno_riferimento}</p>
              </div>
              {topImportatori.crescita_mondiale_3y_perc && (
                <div className="text-right">
                  <p className="text-slate-400 text-[10px]">Crescita 3 anni</p>
                  <p className={`text-xl font-black ${tradeGrowthInfo.color}`}>
                    {parseFloat(String(topImportatori.crescita_mondiale_3y_perc).replace(/[^0-9.-]/g, '')) > 0 ? '+' : ''}
                    {topImportatori.crescita_mondiale_3y_perc}%
                  </p>
                  <p className={`text-[10px] font-medium ${tradeGrowthInfo.color}`}>{tradeGrowthInfo.desc}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-slate-600 text-[9px] mt-3 text-right">Fonte: World Bank API + UN Comtrade</p>
      </CardContent>
    </Card>
  );
}