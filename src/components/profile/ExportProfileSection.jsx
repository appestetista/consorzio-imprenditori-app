import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, Ship } from 'lucide-react';
import CountrySearchSelect from '../import-export/CountrySearchSelect';

const EXPORTER_COUNTRIES = [
  { code: 'IT', name: 'Italia' },
  { code: 'DE', name: 'Germania' },
  { code: 'FR', name: 'Francia' },
  { code: 'ES', name: 'Spagna' },
  { code: 'NL', name: 'Paesi Bassi' },
  { code: 'BE', name: 'Belgio' },
  { code: 'AT', name: 'Austria' },
  { code: 'PL', name: 'Polonia' },
  { code: 'PT', name: 'Portogallo' },
];

export default function ExportProfileSection({ formData, setFormData }) {
  return (
    <Card className="bg-slate-800 border-slate-700 mb-4">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-lime-400" />
          Dati Export
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-slate-400 text-sm mb-1 block">Fatturato annuo</label>
          <Select
            value={formData.export_fatturato_annuo || undefined}
            onValueChange={(value) => setFormData({ ...formData, export_fatturato_annuo: value })}
          >
            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
              <SelectValue placeholder="Seleziona range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="< 500k">{'< 500.000€'}</SelectItem>
              <SelectItem value="500k-1M">500k - 1M €</SelectItem>
              <SelectItem value="1M-5M">1M - 5M €</SelectItem>
              <SelectItem value="5M-10M">5M - 10M €</SelectItem>
              <SelectItem value="> 10M">{'> 10M €'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-slate-400 text-sm mb-1 block">Esperienza export</label>
          <Select
            value={formData.export_esperienza || undefined}
            onValueChange={(value) => setFormData({ ...formData, export_esperienza: value })}
          >
            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
              <SelectValue placeholder="Seleziona livello" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nessuna">Nessuna</SelectItem>
              <SelectItem value="occasionale">Occasionale</SelectItem>
              <SelectItem value="regolare_eu">Regolare (solo UE)</SelectItem>
              <SelectItem value="regolare_extra_eu">Regolare (extra UE)</SelectItem>
              <SelectItem value="consolidata">Consolidata</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-slate-400 text-sm mb-1 block">Certificazioni possedute</label>
          <Input
            placeholder="Es. ISO 9001, CE, FDA, HACCP..."
            value={formData.export_certificazioni || ''}
            onChange={(e) => setFormData({ ...formData, export_certificazioni: e.target.value })}
            className="bg-slate-900 border-slate-700 text-white"
          />
        </div>

        <div>
          <label className="text-slate-400 text-sm mb-1 block">Paese esportatore</label>
          <Select
            value={formData.export_paese_esportatore || 'IT'}
            onValueChange={(value) => setFormData({ ...formData, export_paese_esportatore: value })}
          >
            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPORTER_COUNTRIES.map(c => (
                <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-slate-400 text-sm mb-1 block">Mercati target (max 5)</label>
          <CountrySearchSelect
            selected={formData.export_mercati_target || []}
            onChange={(codes) => setFormData({ ...formData, export_mercati_target: codes })}
            maxSelections={5}
          />
        </div>
      </CardContent>
    </Card>
  );
}