import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { UserPlus, Send, Loader2 } from 'lucide-react';
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

const ZONES = [
  "Nord Italia",
  "Centro Italia", 
  "Sud Italia",
  "Isole",
  "Nazionale"
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

export default function InviteUserForm({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [userType, setUserType] = useState('');
  const [zona, setZona] = useState('');
  const [consultantCategory, setConsultantCategory] = useState('');
  const [assignedSections, setAssignedSections] = useState([]);
  
  const queryClient = useQueryClient();

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

      // Invia invito via backend function (crea PendingInvite + invito Base44 + email benvenuto)
      await base44.functions.invoke('sendInviteEmail', {
        email: emailLower,
        userType,
        zona: userType === 'consulente' ? zona : null,
        consultantCategory: userType === 'consulente' ? consultantCategory : null,
        assignedSections: userType === 'consulente' ? assignedSections : []
      });

      return { email: emailLower, userType };
    },
    onSuccess: ({ email, userType }) => {
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      queryClient.invalidateQueries({ queryKey: ['all-members'] });
      toast.success(`Invito inviato a ${email}!`);
      resetForm();
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Errore invito:', error);
      toast.error('Errore nell\'invio dell\'invito: ' + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !userType) return;
    if (userType === 'consulente' && (!consultantCategory || assignedSections.length === 0)) {
      toast.error('Seleziona categoria e almeno una sezione per il consulente');
      return;
    }
    inviteMutation.mutate();
  };

  const resetForm = () => {
    setEmail('');
    setUserType('');
    setZona('');
    setConsultantCategory('');
    setAssignedSections([]);
  };

  const isConsulente = userType === 'consulente';

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-lime-400" />
          Invita Nuovo Utente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
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

          {/* Tipo Utente */}
          <div>
            <Label className="text-slate-400 text-xs">Tipo Utente *</Label>
            <Select value={userType} onValueChange={setUserType}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                <SelectValue placeholder="Seleziona tipo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="utente">👤 Utente (Membro)</SelectItem>
                <SelectItem value="consulente">👔 Consulente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campi extra per Consulente */}
          {isConsulente && (
            <>
              {/* Categoria Consulente */}
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

              {/* Zona */}
              <div>
                <Label className="text-slate-400 text-xs">Zona</Label>
                <Select value={zona} onValueChange={setZona}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                    <SelectValue placeholder="Seleziona zona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ZONES.map(z => (
                      <SelectItem key={z} value={z}>{z}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sezioni Assegnate */}
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
                        id={section.id}
                        checked={assignedSections.includes(section.id)}
                        onCheckedChange={() => toggleSection(section.id)}
                        className="border-slate-600 data-[state=checked]:bg-lime-400 data-[state=checked]:border-lime-400"
                      />
                      <Label 
                        htmlFor={section.id} 
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
            </>
          )}

          {/* Bottone Invio */}
          <Button
            type="submit"
            disabled={inviteMutation.isPending || !email || !userType || (isConsulente && (!consultantCategory || assignedSections.length === 0))}
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
                Invia Invito via Email
              </>
            )}
          </Button>

          <p className="text-slate-500 text-xs text-center">
            L'email verrà inviata da app.consorzio.imprenditori@gmail.com
          </p>
        </form>
      </CardContent>
    </Card>
  );
}