import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  ArrowLeft, Shield, Zap, Flame, Leaf, Sun, Phone, Wifi, Euro,
  Users, Bell, Settings, UserPlus, Save, Trash2, Mail, BarChart3,
  FileText, Clock, CheckCircle, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Definizione delle categorie risparmio con icone e colori
const RISPARMIO_CATEGORIES = [
  { id: 'assicurazioni', label: 'Assicurazioni', icon: Shield, color: 'text-[#d4af37]', bgColor: 'bg-[#d4af37]/20' },
  { id: 'luce', label: 'Luce', icon: Zap, color: 'text-[#d4af37]', bgColor: 'bg-[#d4af37]/20' },
  { id: 'gas', label: 'Gas', icon: Flame, color: 'text-orange-400', bgColor: 'bg-orange-400/20' },
  { id: 'efficientamento', label: 'Efficientamento Energetico', icon: Leaf, color: 'text-green-400', bgColor: 'bg-green-400/20' },
  { id: 'fotovoltaico', label: 'Fotovoltaico', icon: Sun, color: 'text-yellow-400', bgColor: 'bg-yellow-400/20' },
  { id: 'telefonia', label: 'Spesa Telefonica', icon: Phone, color: 'text-[#d4af37]', bgColor: 'bg-[#d4af37]/20' },
  { id: 'internet', label: 'Internet', icon: Wifi, color: 'text-[#d4af37]', bgColor: 'bg-[#d4af37]/20' },
  { id: 'fiscalita', label: 'Fiscalità Energetica', icon: Euro, color: 'text-green-400', bgColor: 'bg-green-400/20' },
];

export default function RisparmioAdminPanel({ category, onBack }) {
  const [showAssignConsultant, setShowAssignConsultant] = useState(false);
  const [selectedZone, setSelectedZone] = useState('all');
  const queryClient = useQueryClient();

  const categoryInfo = RISPARMIO_CATEGORIES.find(c => c.id === category) || RISPARMIO_CATEGORIES[0];
  const CategoryIcon = categoryInfo.icon;

  // Fetch consulenti assegnati a questa categoria risparmio
  const { data: consultants = [] } = useQuery({
    queryKey: ['consultants'],
    queryFn: () => base44.entities.Consultant.list(),
  });

  // Filtra consulenti assegnati a questa categoria
  const assignedConsultants = consultants.filter(c => 
    c.risparmio_categories?.includes(category)
  );

  // Fetch zone
  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: () => base44.entities.Zone.filter({ is_active: true }),
  });

  // Fetch richieste risparmio per questa categoria
  const { data: requests = [] } = useQuery({
    queryKey: ['risparmio-requests', category],
    queryFn: async () => {
      const allRequests = await base44.entities.RichiestaRisparmio.filter({ categoria: category });
      return allRequests.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
  });

  // Fetch messaggi per questa categoria
  const { data: messages = [] } = useQuery({
    queryKey: ['risparmio-messages', category],
    queryFn: async () => {
      const allMessages = await base44.entities.Message.filter({ source: `risparmio_${category}` });
      return allMessages.filter(m => !m.is_read);
    },
  });

  // Mutation per assegnare/rimuovere consulente
  const toggleConsultantMutation = useMutation({
    mutationFn: async ({ consultantId, add }) => {
      const consultant = consultants.find(c => c.id === consultantId);
      if (!consultant) return;
      
      let newCategories = consultant.risparmio_categories || [];
      if (add) {
        newCategories = [...newCategories, category];
      } else {
        newCategories = newCategories.filter(c => c !== category);
      }
      
      await base44.entities.Consultant.update(consultantId, { 
        risparmio_categories: newCategories 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
      toast.success('Consulente aggiornato');
    },
  });

  // Stats
  const pendingRequests = requests.filter(r => r.status === 'pending').length;
  const inProgressRequests = requests.filter(r => r.status === 'in_progress').length;
  const completedRequests = requests.filter(r => r.status === 'completed').length;
  const unreadMessages = messages.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-slate-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className={`p-2 rounded-lg ${categoryInfo.bgColor}`}>
          <CategoryIcon className={`w-5 h-5 ${categoryInfo.color}`} />
        </div>
        <div>
          <h2 className="text-white font-bold">{categoryInfo.label}</h2>
          <p className="text-slate-400 text-xs">Pannello Admin</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-2 text-center">
            <Clock className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{pendingRequests}</p>
            <p className="text-slate-400 text-[10px]">In attesa</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-2 text-center">
            <BarChart3 className="w-4 h-4 text-blue-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{inProgressRequests}</p>
            <p className="text-slate-400 text-[10px]">In corso</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-2 text-center">
            <CheckCircle className="w-4 h-4 text-green-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{completedRequests}</p>
            <p className="text-slate-400 text-[10px]">Completate</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-2 text-center">
            <Mail className="w-4 h-4 text-orange-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{unreadMessages}</p>
            <p className="text-slate-400 text-[10px]">Messaggi</p>
          </CardContent>
        </Card>
      </div>

      {/* Consulenti Assegnati */}
      <Card className="bg-slate-800 border-green-500/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-green-400" />
              Consulenti Assegnati
            </h3>
            <Button
              size="sm"
              onClick={() => setShowAssignConsultant(true)}
              className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs"
            >
              <UserPlus className="w-3 h-3 mr-1" />
              Assegna
            </Button>
          </div>

          {assignedConsultants.length === 0 ? (
            <p className="text-slate-400 text-xs text-center py-4">
              Nessun consulente assegnato a questa categoria
            </p>
          ) : (
            <div className="space-y-2">
              {assignedConsultants.map(consultant => (
                <div 
                  key={consultant.id} 
                  className="bg-slate-900 rounded-lg p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {consultant.logo_url ? (
                      <img src={consultant.logo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Users className="w-4 h-4 text-green-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-white text-sm font-medium">{consultant.name}</p>
                      <div className="flex gap-1 flex-wrap mt-0.5">
                        {consultant.zone_assegnate?.map(z => (
                          <Badge key={z} className="bg-blue-500/20 text-blue-400 border-0 text-[10px]">{z}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleConsultantMutation.mutate({ consultantId: consultant.id, add: false })}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/20 h-7 w-7 p-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Richieste Recenti */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-lime-400" />
            Richieste Recenti
          </h3>

          {requests.length === 0 ? (
            <p className="text-slate-400 text-xs text-center py-4">
              Nessuna richiesta per questa categoria
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {requests.slice(0, 10).map(req => (
                <div key={req.id} className="bg-slate-900 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white text-xs font-medium">{req.user_email}</p>
                    <Badge className={`text-[10px] ${
                      req.status === 'pending' ? 'bg-yellow-500' :
                      req.status === 'in_progress' ? 'bg-blue-500' :
                      req.status === 'completed' ? 'bg-green-500' : 'bg-slate-500'
                    }`}>
                      {req.status === 'pending' ? 'In attesa' :
                       req.status === 'in_progress' ? 'In corso' :
                       req.status === 'completed' ? 'Completata' : req.status}
                    </Badge>
                  </div>
                  <p className="text-slate-400 text-[10px]">
                    {new Date(req.created_date).toLocaleDateString('it-IT', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Assegna Consulente */}
      <Dialog open={showAssignConsultant} onOpenChange={setShowAssignConsultant}>
        <DialogContent className="bg-slate-900 border-slate-700 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-400" />
              Assegna Consulente a {categoryInfo.label}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {/* Filtro zona */}
            <Select value={selectedZone} onValueChange={setSelectedZone}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Filtra per zona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le zone</SelectItem>
                {zones.map(z => (
                  <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Lista consulenti */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {consultants
                .filter(c => selectedZone === 'all' || c.zone_assegnate?.includes(selectedZone))
                .filter(c => !c.risparmio_categories?.includes(category))
                .map(consultant => (
                  <div 
                    key={consultant.id}
                    className="bg-slate-800 rounded-lg p-3 flex items-center justify-between hover:bg-slate-700 cursor-pointer"
                    onClick={() => {
                      toggleConsultantMutation.mutate({ consultantId: consultant.id, add: true });
                      setShowAssignConsultant(false);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {consultant.logo_url ? (
                        <img src={consultant.logo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
                          <Users className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-white text-sm">{consultant.name}</p>
                        <p className="text-slate-400 text-xs">{consultant.category}</p>
                        <div className="flex gap-1 flex-wrap mt-0.5">
                          {consultant.zone_assegnate?.slice(0, 2).map(z => (
                            <Badge key={z} className="bg-blue-500/20 text-blue-400 border-0 text-[10px]">{z}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white h-7"
                    >
                      <UserPlus className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
            </div>

            {consultants.filter(c => !c.risparmio_categories?.includes(category)).length === 0 && (
              <p className="text-slate-400 text-xs text-center py-4">
                Tutti i consulenti sono già assegnati
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}