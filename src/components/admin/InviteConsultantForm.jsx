import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CONSULTANT_CATEGORIES = [
  "Stampa Digitale e Cataloghi",
  "Assicurazioni Aziendali",
  "Agenzia di Comunicazione",
  "Commercialista",
  "Igiene e Sicurezza",
  "Internazionalizzazione/Export",
  "Broker Energetico",
  "Avvocato",
  "Bandi Europei",
  "Affitto Stampanti/Cyber Sicurezza",
  "Efficientamento Energetico/Centralini"
];

const SECTIONS = [
  { id: 'calendario', label: 'Calendario Incontri' },
  { id: 'video_interviste', label: 'Video Interviste' },
  { id: 'cultura_aziendale', label: 'Academy' },
  { id: 'consulenze', label: 'Consulenze' },
  { id: 'finanziamenti', label: 'Finanziamenti Agevolati' },
  { id: 'contatta_membri', label: 'Contatta Imprenditori' },
  { id: 'risparmio_energetico', label: 'Risparmio' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'imprenditori', label: 'Consigli da Imprenditori' },
  { id: 'fornitori', label: 'Ricerca Fornitori' },
  { id: 'welfare_aziendale', label: 'Welfare Aziendale' },
  { id: 'analisi_contratti', label: 'Analisi Contratti' },
  { id: 'import_export', label: 'Import/Export' },
  { id: 'compliance', label: 'Compliance Aziendale' },
];

export default function InviteConsultantForm({ onSuccess }) {
  const [consultantName, setConsultantName] = useState('');
  const [email, setEmail] = useState('');
  const [zoneAssegnate, setZoneAssegnate] = useState([]);
  const [consultantCategory, setConsultantCategory] = useState('');
  const [assignedSections, setAssignedSections] = useState([]);
  
  const queryClient = useQueryClient();

  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: () => base44.entities.Zone.filter({ is_active: true }),
  });

  const toggleSection = (sectionId) => {
    setAssignedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(s => s !== sectionId)
        : [...prev, sectionId]
    );
  };

  const selectAllSections = () => {
    setAssignedSections(SECTIONS.map(s => s.id));
  };

  const deselectAllSections = () => {
    setAssignedSections([]);
  };

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const emailLower = email.toLowerCase().trim();

      await base44.functions.invoke('sendInviteEmail', {
        email: emailLower,
        userType: 'consulente',
        zona: zoneAssegnate[0] || null,
        zone_assegnate: zoneAssegnate,
        consultantCategory,
        consultantName: consultantName.trim() || null,
        assignedSections
      });

      return { email: emailLower };
    },
    onSuccess: ({ email }) => {
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
      toast.success(`Invito inviato a ${email}!`);
      resetForm();
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Errore invito:', error);
      toast.error('Errore nell\'invio dell\'invito: ' + error.message);
    }
  });

  const toggleZone = (zoneName) => {
    setZoneAssegnate(prev => 
      prev.includes(zoneName) 
        ? prev.filter(z => z !== zoneName)
        : [...prev, zoneName]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!consultantName || !email || !consultantCategory || zoneAssegnate.length === 0 || assignedSections.length === 0) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }
    inviteMutation.mutate();
  };

  const resetForm = () => {
    setConsultantName('');
    setEmail('');
    setZoneAssegnate([]);
    setConsultantCategory('');
    setAssignedSections([]);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label className="text-slate-400 text-xs">Nome Consulente/Studio *</Label>
          <Input
            type="text"
            placeholder="Nome consulente o studio"
            value={consultantName}
            onChange={(e) => setConsultantName(e.target.value)}
            className="bg-slate-900 border-slate-700 text-white mt-1"
            required
          />
        </div>

        <div>
          <Label className="text-slate-400 text-xs">Email *</Label>
          <Input
            type="email"
            placeholder="email@esempio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-slate-900 border-slate-700 text-white mt-1"
            required
          />
        </div>

        <div>
          <Label className="text-slate-400 text-xs">Categoria Consulente *</Label>
          <Select value={consultantCategory} onValueChange={setConsultantCategory}>
            <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
              <SelectValue placeholder="Seleziona categoria..." />
            </SelectTrigger>
            <SelectContent>
              {CONSULTANT_CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-slate-400 text-xs">Zone Assegnate *</Label>
          <div className="bg-slate-900 border border-slate-700 rounded-md p-3 mt-1 space-y-2 max-h-40 overflow-y-auto">
            {zones.map(z => (
              <div key={z.id} className="flex items-center gap-2">
                <Checkbox
                  id={`invite-zone-${z.id}`}
                  checked={zoneAssegnate.includes(z.name)}
                  onCheckedChange={() => toggleZone(z.name)}
                  className="border-slate-600 data-[state=checked]:bg-lime-400 data-[state=checked]:border-lime-400"
                />
                <Label htmlFor={`invite-zone-${z.id}`} className="text-white text-sm cursor-pointer">
                  {z.name}
                </Label>
              </div>
            ))}
          </div>
          {zoneAssegnate.length > 0 && (
            <p className="text-lime-400 text-xs mt-1">
              {zoneAssegnate.length} zona/e selezionata/e
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-slate-400 text-xs">Sezioni Visibili *</Label>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={selectAllSections}
                className="text-lime-400 text-xs hover:underline"
              >
                Tutte
              </button>
              <span className="text-slate-600">|</span>
              <button 
                type="button" 
                onClick={deselectAllSections}
                className="text-slate-400 text-xs hover:underline"
              >
                Nessuna
              </button>
            </div>
          </div>
          <div className="bg-slate-900 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
            {SECTIONS.map(section => (
              <div key={section.id} className="flex items-center gap-2">
                <Checkbox
                  id={`consultant-${section.id}`}
                  checked={assignedSections.includes(section.id)}
                  onCheckedChange={() => toggleSection(section.id)}
                  className="border-slate-600 data-[state=checked]:bg-lime-400 data-[state=checked]:border-lime-400"
                />
                <Label 
                  htmlFor={`consultant-${section.id}`} 
                  className="text-white text-sm cursor-pointer"
                >
                  {section.label}
                </Label>
              </div>
            ))}
          </div>
          <p className="text-slate-500 text-xs mt-1">
            {assignedSections.length} sezioni selezionate
          </p>
        </div>

        <Button
          type="submit"
          disabled={inviteMutation.isPending || !consultantName || !email || !consultantCategory || zoneAssegnate.length === 0 || assignedSections.length === 0}
          className="w-full bg-lime-400 text-slate-900 hover:bg-lime-500"
        >
          {inviteMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Invio in corso...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Invia Invito Consulente
            </>
          )}
        </Button>

        <p className="text-slate-500 text-xs text-center">
          L'email verrà inviata da app.consorzio.imprenditori@gmail.com
        </p>
      </form>
    </div>
  );
}