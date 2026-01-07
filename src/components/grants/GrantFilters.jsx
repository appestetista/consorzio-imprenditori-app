import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Zap, Filter } from 'lucide-react';

export default function GrantFilters({ filters, onFilterChange }) {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-base flex items-center gap-2">
          <Filter className="w-4 h-4 text-lime-400" />
          Filtri Avanzati
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Easy Access Filter */}
        <div className="flex items-center justify-between p-3 bg-lime-400/10 rounded-lg border border-lime-400/30">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-lime-400" />
            <Label className="text-lime-400 font-bold cursor-pointer" htmlFor="easy-access">
              Solo Attivabili Subito
            </Label>
          </div>
          <Switch
            id="easy-access"
            checked={filters.easyAccess}
            onCheckedChange={(checked) => onFilterChange('easyAccess', checked)}
          />
        </div>

        {/* Grant Type */}
        <div className="space-y-2">
          <Label className="text-slate-300 text-sm">Tipologia Investimento</Label>
          <Select
            value={filters.grantType}
            onValueChange={(value) => onFilterChange('grantType', value)}
          >
            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
              <SelectValue placeholder="Tutte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte</SelectItem>
              <SelectItem value="Digitalizzazione">Digitalizzazione</SelectItem>
              <SelectItem value="Innovazione">Innovazione</SelectItem>
              <SelectItem value="Ricerca e Sviluppo">Ricerca e Sviluppo</SelectItem>
              <SelectItem value="Energia/Sostenibilità">Energia/Sostenibilità</SelectItem>
              <SelectItem value="Internazionalizzazione">Internazionalizzazione</SelectItem>
              <SelectItem value="Altro">Altro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Funding Type */}
        <div className="space-y-2">
          <Label className="text-slate-300 text-sm">Forma Agevolazione</Label>
          <Select
            value={filters.fundingType}
            onValueChange={(value) => onFilterChange('fundingType', value)}
          >
            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
              <SelectValue placeholder="Tutte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte</SelectItem>
              <SelectItem value="Contributo a fondo perduto">Contributo a fondo perduto</SelectItem>
              <SelectItem value="Finanziamento agevolato">Finanziamento agevolato</SelectItem>
              <SelectItem value="Credito d'imposta">Credito d'imposta</SelectItem>
              <SelectItem value="Misto">Misto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label className="text-slate-300 text-sm">Stato Bando</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => onFilterChange('status', value)}
          >
            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
              <SelectValue placeholder="Tutti" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              <SelectItem value="Aperto">Aperto</SelectItem>
              <SelectItem value="In apertura">In apertura</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Access Mode */}
        <div className="space-y-2">
          <Label className="text-slate-300 text-sm">Modalità Accesso</Label>
          <Select
            value={filters.accessMode}
            onValueChange={(value) => onFilterChange('accessMode', value)}
          >
            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
              <SelectValue placeholder="Tutte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte</SelectItem>
              <SelectItem value="Sportello">Sportello</SelectItem>
              <SelectItem value="Graduatoria">Graduatoria</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* No Cofinancing */}
        <div className="flex items-center justify-between">
          <Label className="text-slate-300 text-sm cursor-pointer" htmlFor="no-cofinancing">
            Senza cofinanziamento
          </Label>
          <Switch
            id="no-cofinancing"
            checked={filters.noCofinancing}
            onCheckedChange={(checked) => onFilterChange('noCofinancing', checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
}