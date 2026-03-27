import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, User, Building2, Phone, MapPin, Save, Upload, X, Image as ImageIcon, LogOut, FileText, AlertTriangle, Briefcase, Bell, Volume2, History, ChevronRight, Trash2, FileSearch, Gift, QrCode } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

import BottomNav from '../components/layout/BottomNav';
import GlobalTopIcons from '../components/layout/GlobalTopIcons';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import ProfiloBandiForm from '../components/profile/ProfiloBandiForm';
import NotificationPreferences from '../components/profile/NotificationPreferences';
import ContractHistorySection from '../components/profile/ContractHistorySection';
import ExportProfileSection from '../components/profile/ExportProfileSection';
import WelfareRiepilogoSection from '../components/profile/WelfareRiepilogoSection';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { PhoneOff, PhoneCall, AlertTriangle as AlertTriangleIcon, EyeOff, UserPlus, Minus, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Toaster } from 'sonner';

// Componente per gestire consulenze extra per utenti specifici
function ExtraConsultationsManager({ consultantId, consultantZona }) {
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [extraAmount, setExtraAmount] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Carica utenti della zona
  const { data: zoneUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['zone-users-for-extra', consultantZona],
    queryFn: async () => {
      if (!consultantZona) return [];
      const zones = consultantZona.split(',').map(z => z.trim().toLowerCase()).filter(Boolean);
      if (zones.length === 0) return [];
      const { data } = await base44.functions.invoke('listMembers', {});
      const allUsers = data?.users || [];
      return allUsers.filter(u => {
        const isUtente = !u.user_type || u.user_type === 'utente';
        const isNotBlocked = !u.is_blocked;
        const userZona = (u.zona || '').trim().toLowerCase();
        const isInZone = userZona && zones.includes(userZona);
        const hasValidEmail = u.email && typeof u.email === 'string' && u.email.trim().length > 0;
        return isUtente && isNotBlocked && isInZone && hasValidEmail;
      });
    },
    enabled: !!consultantZona && consultantZona.trim().length > 0
  });

  // Carica assegnazioni esistenti per questo consulente
  const { data: existingAssignments = [], refetch: refetchAssignments } = useQuery({
    queryKey: ['consultant-assignments', consultantId],
    queryFn: async () => {
      if (!consultantId) return [];
      const assignments = await base44.entities.ConsultantAssignment.filter({ consultant_id: consultantId });
      return assignments;
    },
    enabled: !!consultantId
  });

  // Lista utenti validi per il Select (derivata, non stato)
  const validUsers = React.useMemo(() => {
    return zoneUsers.filter(u => u.email && u.email.trim().length > 0);
  }, [zoneUsers]);

  // Filtra utenti che hanno assegnazioni extra (più di 0)
  const usersWithExtra = React.useMemo(() => {
    return existingAssignments.filter(a => a.available_consultations > 0);
  }, [existingAssignments]);

  const handleAddExtra = async () => {
    if (!selectedUserEmail || selectedUserEmail.trim() === '' || extraAmount < 1 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const existingAssignment = existingAssignments.find(a => a.user_email === selectedUserEmail);

      // Trova i dati del consulente per la notifica
      const consultants = await base44.entities.Consultant.filter({ id: consultantId });
      const consultant = consultants[0];

      if (existingAssignment) {
        await base44.entities.ConsultantAssignment.update(existingAssignment.id, {
          available_consultations: (existingAssignment.available_consultations || 0) + extraAmount
        });
      } else {
        await base44.entities.ConsultantAssignment.create({
          user_email: selectedUserEmail,
          consultant_id: consultantId,
          available_consultations: extraAmount,
          is_assigned: true
        });
      }

      await base44.entities.Notification.create({
        user_email: selectedUserEmail,
        type: 'consultation',
        title: 'Nuove consulenze gratuite assegnate',
        content: `${consultant?.name || 'Un consulente'} (${consultant?.category || ''}) ti ha assegnato ${extraAmount} consulenz${extraAmount > 1 ? 'e' : 'a'} gratuit${extraAmount > 1 ? 'e' : 'a'}!`,
        is_read: false,
        reference_id: consultantId
      });

      toast.success(`Aggiunte ${extraAmount} consulenze gratuite!`);
      setSelectedUserEmail('');
      setExtraAmount(1);
      refetchAssignments();
    } catch (error) {
      console.error('[ExtraConsultationsManager] handleAddExtra error:', error);
      toast.error('Errore durante l\'assegnazione delle consulenze');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveExtra = async (assignmentId, currentAmount) => {
    try {
      if (currentAmount <= 1) {
        await base44.entities.ConsultantAssignment.delete(assignmentId);
      } else {
        await base44.entities.ConsultantAssignment.update(assignmentId, {
          available_consultations: currentAmount - 1
        });
      }
      refetchAssignments();
    } catch (error) {
      console.error('Error removing extra:', error);
      toast.error('Errore durante la rimozione');
    }
  };

  const handleAddOneMore = async (assignmentId, currentAmount, userEmail) => {
    try {
      await base44.entities.ConsultantAssignment.update(assignmentId, {
        available_consultations: currentAmount + 1
      });
      
      const consultants = await base44.entities.Consultant.filter({ id: consultantId });
      const consultant = consultants[0];
      
      await base44.entities.Notification.create({
        user_email: userEmail,
        type: 'consultation',
        title: 'Nuova consulenza gratuita assegnata',
        content: `${consultant?.name || 'Un consulente'} (${consultant?.category || ''}) ti ha assegnato 1 consulenza gratuita aggiuntiva!`,
        is_read: false,
        reference_id: consultantId
      });
      
      refetchAssignments();
    } catch (error) {
      console.error('Error adding one more:', error);
      toast.error('Errore durante l\'aggiunta');
    }
  };

  // Handler per la selezione - accetta solo valori validi
  const handleUserSelection = useCallback((value) => {
    // Radix può passare undefined o stringa vuota in alcuni casi
    if (value && typeof value === 'string' && value.trim().length > 0) {
      setSelectedUserEmail(value);
    }
  }, []);

  // Loading state
  if (loadingUsers) {
    return (
      <div className="bg-slate-900 rounded-lg p-4 flex items-center justify-center">
        <div className="animate-spin w-5 h-5 border-2 border-lime-400 border-t-transparent rounded-full mr-2"></div>
        <span className="text-slate-400 text-sm">Caricamento utenti...</span>
      </div>
    );
  }

  // Nessun utente disponibile
  if (validUsers.length === 0) {
    return (
      <div className="space-y-3">
        <div className="bg-slate-900 rounded-lg p-3">
          <div className="bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-400 text-sm">
            Nessun utente disponibile nella tua zona
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Form per aggiungere consulenze extra */}
      <div className="bg-slate-900 rounded-lg p-3 space-y-3">
        {/* Select utente - renderizzato solo se ci sono utenti validi */}
        <Select 
          value={selectedUserEmail || undefined}
          onValueChange={handleUserSelection}
        >
          <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
            <SelectValue placeholder="Seleziona utente..." />
          </SelectTrigger>
          <SelectContent>
            {validUsers.map(u => (
              <SelectItem key={`user-${u.id || u.email}`} value={u.email}>
                {u.company_name || u.full_name || u.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="flex items-center gap-2">
          <Label className="text-slate-400 text-sm">Consulenze da aggiungere:</Label>
          <Input
            type="number"
            min="1"
            max="10"
            value={extraAmount}
            onChange={(e) => setExtraAmount(Math.max(1, parseInt(e.target.value) || 1))}
            className="bg-slate-800 border-slate-700 text-white w-20 text-center"
          />
        </div>
        
        <Button
          onClick={handleAddExtra}
          disabled={!selectedUserEmail || selectedUserEmail.trim() === '' || isSubmitting}
          className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
          size="sm"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          {isSubmitting ? 'Assegnazione...' : 'Assegna Consulenze Extra'}
        </Button>
      </div>

      {/* Lista utenti con consulenze extra */}
      {usersWithExtra.length > 0 && (
        <div className="bg-slate-900 rounded-lg p-3">
          <p className="text-slate-400 text-xs mb-2">Utenti con consulenze extra assegnate:</p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {usersWithExtra.map(assignment => {
              const userData = validUsers.find(u => u.email === assignment.user_email);
              const displayName = userData?.company_name || userData?.full_name || assignment.user_email;
              return (
                <div key={`assignment-${assignment.id}`} className="flex items-center justify-between bg-slate-800 rounded-lg p-2">
                  <span className="text-white text-sm truncate flex-1">
                    {displayName}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRemoveExtra(assignment.id, assignment.available_consultations)}
                      className="w-6 h-6 rounded bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/30"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-lime-400 font-bold w-6 text-center">
                      {assignment.available_consultations}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddOneMore(assignment.id, assignment.available_consultations, assignment.user_email)}
                      className="w-6 h-6 rounded bg-lime-500/20 text-lime-400 flex items-center justify-center hover:bg-lime-500/30"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

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

function ConsultantProfileCard({ consultantData, setConsultantData, savingConsultant, setSavingConsultant }) {
  const [localData, setLocalData] = useState(null);
  const [showZeroWarning, setShowZeroWarning] = useState(false);
  const [pendingZeroValue, setPendingZeroValue] = useState(false);

  // Inizializza localData quando consultantData è disponibile
  useEffect(() => {
    if (consultantData) {
      setLocalData({
        name: consultantData.name || '',
        phone: consultantData.phone || '',
        whatsapp_number: consultantData.whatsapp_number || '',
        city: consultantData.city || '',
        referente: consultantData.referente || '',
        cellulare_referente: consultantData.cellulare_referente || '',
        block_calls_for_all: consultantData.block_calls_for_all || false,
        blocked_users_calls: consultantData.blocked_users_calls || [],
        free_consultations_per_user: consultantData.free_consultations_per_user ?? 1,
        sede_azienda_disabled: consultantData.sede_azienda_disabled || false,
        rimborso_carburante: consultantData.rimborso_carburante || 0,
        logo_url: consultantData.logo_url || ''
      });
    }
  }, [consultantData]);

  // Carica lista utenti per blocco chiamate individuali (usa backend function per bypassare restrizioni)
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-for-block'],
    queryFn: async () => {
      const response = await base44.functions.invoke('listMembers');
      const users = response.data?.users || [];
      return users.filter(u => (!u.user_type || u.user_type === 'utente') && !u.is_blocked);
    }
  });

  // Conta utenti nelle zone del consulente (può avere più zone separate da virgola)
  const { data: usersInZoneCount = 0 } = useQuery({
    queryKey: ['users-in-zone-count', consultantData?.zona],
    queryFn: async () => {
      if (!consultantData?.zona) return 0;
      // La zona può essere singola o multipla (separata da virgola)
      const zones = consultantData.zona.split(',').map(z => z.trim().toLowerCase()).filter(Boolean);
      // Usa listMembers backend function per avere accesso completo agli utenti
      const { data } = await base44.functions.invoke('listMembers', {});
      const allUsers = data?.users || [];
      // Filtra: user_type = utente (o undefined per utenti che non hanno il campo), non bloccati, e con zona corrispondente
      const activeUsers = allUsers.filter(u => {
        const isUtente = !u.user_type || u.user_type === 'utente';
        const isNotBlocked = !u.is_blocked;
        const userZona = (u.zona || '').trim().toLowerCase();
        const isInZone = userZona && zones.includes(userZona);
        return isUtente && isNotBlocked && isInZone;
      });
      return activeUsers.length;
    },
    enabled: !!consultantData?.zona
  });

  // Determina se il consulente ha più zone
  const consultantZones = consultantData?.zona ? consultantData.zona.split(',').map(z => z.trim()).filter(Boolean) : [];
  const hasMultipleZones = consultantZones.length > 1;

  const handleSaveConsultant = async () => {
    if (!localData) return;
    
    if (!localData.name) {
      toast.error('Il nome dello studio è obbligatorio');
      return;
    }
    if (!localData.phone || !localData.city) {
      toast.error('Telefono e Sede sono obbligatori');
      return;
    }
    
    // Se sta impostando 0 consulenze, mostra avviso
    if (localData.free_consultations_per_user === 0 && !pendingZeroValue) {
      setShowZeroWarning(true);
      return;
    }
    
    setSavingConsultant(true);
    try {
      // Aggiorna l'entità Consultant
      await base44.entities.Consultant.update(consultantData.id, localData);
      
      // Sincronizza anche l'entità User con i dati rilevanti (company_name = name del Consultant)
      await base44.auth.updateMe({
        company_name: localData.name,
        phone: localData.phone,
        city: localData.city,
        referente: localData.referente,
        cellulare_referente: localData.cellulare_referente,
        logo_url: localData.logo_url
      });
      
      setConsultantData({ ...consultantData, ...localData });
      toast.success('Profilo studio aggiornato!');
      setPendingZeroValue(false);
    } catch (error) {
      console.error('Errore salvataggio:', error);
      toast.error('Errore durante il salvataggio');
    } finally {
      setSavingConsultant(false);
    }
  };

  const confirmZeroConsultations = async () => {
    setPendingZeroValue(true);
    setShowZeroWarning(false);
    // Salva automaticamente dopo conferma
    setSavingConsultant(true);
    try {
      await base44.entities.Consultant.update(consultantData.id, localData);
      
      // Sincronizza anche l'entità User
      await base44.auth.updateMe({
        company_name: localData.name,
        phone: localData.phone,
        city: localData.city,
        referente: localData.referente,
        cellulare_referente: localData.cellulare_referente,
        logo_url: localData.logo_url
      });
      
      setConsultantData({ ...consultantData, ...localData });
      toast.success('Profilo studio aggiornato!');
    } catch (error) {
      console.error('Errore salvataggio:', error);
      toast.error('Errore durante il salvataggio');
    } finally {
      setSavingConsultant(false);
      setPendingZeroValue(false);
    }
  };

  const toggleBlockUser = (userEmail) => {
    if (!localData) return;
    const blocked = localData.blocked_users_calls || [];
    if (blocked.includes(userEmail)) {
      setLocalData({ ...localData, blocked_users_calls: blocked.filter(e => e !== userEmail) });
    } else {
      setLocalData({ ...localData, blocked_users_calls: [...blocked, userEmail] });
    }
  };

  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setLocalData({ ...localData, logo_url: file_url });
    } catch (error) {
      toast.error('Errore durante il caricamento del logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  // Se localData non è ancora inizializzato, mostra loading
  if (!localData) {
    return (
      <Card className="bg-slate-800 border-slate-700 mb-4">
        <CardContent className="p-6 flex items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-lime-400 border-t-transparent rounded-full"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700 mb-4">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-lime-400" />
          Profilo Studio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Logo Studio */}
        <div>
          <Label className="text-lime-400 text-sm font-medium mb-1 block">Logo Studio</Label>
          <div className="mt-2 space-y-3">
            {localData.logo_url && (
              <div className="flex items-center gap-3 bg-slate-900 rounded-lg p-3">
                <img 
                  src={localData.logo_url} 
                  alt="Logo" 
                  className="w-16 h-16 object-contain rounded"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLocalData({...localData, logo_url: ''})}
                  className="border-red-600 text-red-400"
                >
                  <X className="w-4 h-4 mr-1" />
                  Rimuovi
                </Button>
              </div>
            )}
            <label className="flex items-center justify-center gap-2 bg-slate-900 border-2 border-dashed border-slate-700 rounded-lg p-4 cursor-pointer hover:border-lime-400 transition-colors">
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleLogoUpload}
                className="hidden"
                disabled={uploadingLogo}
              />
              {uploadingLogo ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-lime-400 border-t-transparent rounded-full"></div>
                  <span className="text-slate-400">Caricamento...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-lime-400" />
                  <span className="text-slate-300">Carica logo</span>
                </>
              )}
            </label>
          </div>
        </div>

        {/* Nome Studio */}
        <div>
          <Label className="text-lime-400 text-sm font-medium mb-1 block">Nome Studio (obbligatorio)</Label>
          <Input
            placeholder="Inserisci il nome dello studio"
            value={localData.name}
            onChange={(e) => setLocalData({ ...localData, name: e.target.value })}
            className="bg-lime-400/10 border-lime-400 text-white placeholder:text-lime-400/50"
          />
        </div>

        {/* Specializzazione (solo visualizzazione) */}
        <div>
          <Label className="text-slate-400 text-sm mb-1 block">Specializzazione (assegnata dall'admin)</Label>
          <div className="bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-slate-400 text-sm">
            {consultantData?.category || 'Nessuna categoria assegnata'}
          </div>
        </div>

        {/* Telefono */}
        <div>
          <Label className="text-lime-400 text-sm font-medium mb-1 block">Telefono (obbligatorio)</Label>
          <Input
            placeholder="Inserisci il numero di telefono"
            value={localData.phone}
            onChange={(e) => setLocalData({ ...localData, phone: e.target.value })}
            className="bg-lime-400/10 border-lime-400 text-white placeholder:text-lime-400/50"
          />
        </div>

        {/* Sede */}
        <div>
          <Label className="text-lime-400 text-sm font-medium mb-1 block">Sede (obbligatorio)</Label>
          <Input
            placeholder="Inserisci la sede"
            value={localData.city}
            onChange={(e) => setLocalData({ ...localData, city: e.target.value })}
            className="bg-lime-400/10 border-lime-400 text-white placeholder:text-lime-400/50"
          />
        </div>

        {/* WhatsApp */}
        <div>
          <Label className="text-slate-400 text-sm mb-1 block">Numero WhatsApp (per notifiche automatiche)</Label>
          <Input
            placeholder="Es: +393291234567"
            value={localData.whatsapp_number}
            onChange={(e) => setLocalData({ ...localData, whatsapp_number: e.target.value })}
            className="bg-slate-900 border-slate-700 text-white"
          />
          <p className="text-slate-500 text-xs mt-1">Riceverai notifiche WhatsApp quando un utente ti prenota o ti scrive. Formato internazionale (+39...)</p>
        </div>

        {/* Referente */}
        <div>
          <Label className="text-slate-400 text-sm mb-1 block">Nome Referente</Label>
          <Input
            placeholder="Nome del referente"
            value={localData.referente}
            onChange={(e) => setLocalData({ ...localData, referente: e.target.value })}
            className="bg-slate-900 border-slate-700 text-white"
          />
        </div>

        {/* Cellulare Referente */}
        <div>
          <Label className="text-slate-400 text-sm mb-1 block">Cellulare Referente</Label>
          <Input
            placeholder="Cellulare del referente"
            value={localData.cellulare_referente}
            onChange={(e) => setLocalData({ ...localData, cellulare_referente: e.target.value })}
            className="bg-slate-900 border-slate-700 text-white"
          />
        </div>

        {/* Zona assegnata (solo visualizzazione) */}
        <div>
          <Label className="text-slate-400 text-sm mb-1 block">Zona Assegnata (dall'admin)</Label>
          <Input
            value={consultantData?.zona || 'Nessuna zona assegnata'}
            disabled
            className="bg-slate-900 border-slate-600 text-slate-400"
          />
          <p className="text-slate-500 text-xs mt-1">Sarai visibile solo agli utenti di questa zona</p>
        </div>

        {/* Consulenze Gratuite */}
        <div className="border-t border-slate-700 pt-4 mt-4">
          <h3 className="text-white font-medium mb-3 flex items-center gap-2">
            <Gift className="w-4 h-4 text-lime-400" />
            Consulenze Gratuite
          </h3>
          
          {consultantData?.zona && (
            <div className="bg-lime-400/10 rounded-lg p-3 mb-3 border border-lime-400/30">
              <p className="text-lime-300 text-sm">
                {hasMultipleZones 
                  ? <>Nelle zone a te assegnate in questo momento abbiamo inserito <span className="font-bold text-lime-400 text-2xl mx-1">{usersInZoneCount}</span> utenti dentro il consorzio.</>
                  : <>Nella zona a te assegnata in questo momento abbiamo inserito <span className="font-bold text-lime-400 text-2xl mx-1">{usersInZoneCount}</span> utenti dentro il consorzio.</>
                }
              </p>
              <p className="text-lime-400 text-sm font-semibold mt-2">
                💡 La consulenza gratuita è il miglior modo per farti conoscere e acquisire nuovi clienti!
              </p>
            </div>
          )}
          
          <div className="bg-slate-900 rounded-lg p-4">
            <Label className="text-lime-400 text-sm font-medium mb-2 block">
              Numero consulenze gratuite per ogni utente
            </Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min="0"
                max="100"
                value={localData.free_consultations_per_user}
                onChange={(e) => setLocalData({ ...localData, free_consultations_per_user: parseInt(e.target.value) || 0 })}
                className="bg-slate-800 border-lime-400 text-white w-24 text-center"
              />
              <span className="text-slate-400 text-sm">consulenze gratuite</span>
            </div>
            <p className="text-slate-500 text-xs mt-2">
              Ogni utente della tua zona avrà diritto a questo numero di consulenze gratuite con te
            </p>
            {localData.free_consultations_per_user === 0 && (
              <div className="flex items-center gap-2 mt-3 bg-amber-500/20 rounded-lg p-2">
                <EyeOff className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 text-xs">Con 0 consulenze non sarai visibile nelle richieste</span>
              </div>
            )}
          </div>
          
          {/* Opzioni modalità sede aziendale */}
          <div className="bg-slate-900 rounded-lg p-4 mt-4">
            <Label className="text-white text-sm font-medium mb-3 block">
              Consulenze in presenza presso la sede aziendale
            </Label>
            
            <div className="flex items-center justify-between bg-slate-800 rounded-lg p-3 mb-3">
              <div>
                <p className="text-white text-sm font-medium">Disabilita questa opzione</p>
                <p className="text-slate-400 text-xs">Gli utenti non potranno richiedere consulenze presso la loro sede</p>
              </div>
              <Switch
                checked={localData.sede_azienda_disabled}
                onCheckedChange={(checked) => setLocalData({ ...localData, sede_azienda_disabled: checked, rimborso_carburante: checked ? 0 : localData.rimborso_carburante })}
              />
            </div>
            
            {!localData.sede_azienda_disabled && (
              <div className="bg-slate-800 rounded-lg p-3">
                <Label className="text-slate-300 text-xs mb-2 block">
                  Rimborso carburante (€) - opzionale
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-white">€</span>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    value={localData.rimborso_carburante}
                    onChange={(e) => setLocalData({ ...localData, rimborso_carburante: parseFloat(e.target.value) || 0 })}
                    className="bg-slate-900 border-slate-600 text-white w-24 text-center"
                  />
                </div>
                <p className="text-slate-500 text-xs mt-2">
                  Se impostato, verrà mostrato agli utenti che richiedono consulenze presso la loro sede
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Gestione Chiamate */}
        <div className="border-t border-slate-700 pt-4 mt-4">
          <h3 className="text-white font-medium mb-3 flex items-center gap-2">
            {localData.block_calls_for_all ? (
              <PhoneOff className="w-4 h-4 text-red-400" />
            ) : (
              <PhoneCall className="w-4 h-4 text-green-400" />
            )}
            Gestione Chiamate
          </h3>

          {/* Blocca tutti */}
          <div className="flex items-center justify-between bg-slate-900 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-3">
              {localData.block_calls_for_all ? (
                <PhoneOff className="w-5 h-5 text-red-400" />
              ) : (
                <PhoneCall className="w-5 h-5 text-green-400" />
              )}
              <div>
                <p className="text-white text-sm font-medium">Blocca chiamate da tutti</p>
                <p className="text-slate-400 text-xs">Rispondi solo ai messaggi</p>
              </div>
            </div>
            <Switch
              checked={localData.block_calls_for_all}
              onCheckedChange={(checked) => setLocalData({ ...localData, block_calls_for_all: checked })}
              className={localData.block_calls_for_all ? "data-[state=checked]:bg-red-500" : "data-[state=unchecked]:bg-green-500"}
            />
          </div>

          {/* Blocco singoli utenti */}
          {!localData.block_calls_for_all && allUsers.length > 0 && (
            <div className="bg-slate-900 rounded-lg p-3">
              <p className="text-slate-400 text-xs mb-2">Blocca chiamate da utenti specifici:</p>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {allUsers.map(u => (
                  <div key={u.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`block-${u.id}`}
                      checked={(localData.blocked_users_calls || []).includes(u.email)}
                      onCheckedChange={() => toggleBlockUser(u.email)}
                      className="border-slate-600 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                    />
                    <Label htmlFor={`block-${u.id}`} className="text-white text-sm cursor-pointer">
                      {u.company_name || u.full_name || u.email}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSaveConsultant();
          }}
          disabled={savingConsultant || !localData || !localData.phone || !localData.city}
          className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 text-lg py-6 mt-4"
        >
          <Save className="w-5 h-5 mr-2" />
          {savingConsultant ? 'Salvataggio...' : 'Salva Profilo Studio'}
        </Button>
      </CardContent>

      {/* Alert Dialog per 0 consulenze */}
      <AlertDialog open={showZeroWarning} onOpenChange={setShowZeroWarning}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <AlertTriangleIcon className="w-5 h-5 text-amber-400" />
              Attenzione: Visibilità disattivata
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Impostando <strong className="text-white">0 consulenze gratuite</strong>, il tuo profilo <strong className="text-amber-400">non sarà più visibile</strong> quando un'azienda richiede una consulenza nella tua categoria.
              <br /><br />
              Potrai comunque essere contattato direttamente da chi già conosce i tuoi servizi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600 hover:text-white">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction 
              className="bg-amber-500 hover:bg-amber-600 text-slate-900"
              onClick={confirmZeroConsultations}
            >
              Conferma comunque
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default function MyProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [formData, setFormData] = useState({});
  const [consultantData, setConsultantData] = useState(null);
  const [savingConsultant, setSavingConsultant] = useState(false);
  const { impersonation, setCurrentUserRole, appMode, stopImpersonation } = useImpersonation();

  const [highlightFiscale, setHighlightFiscale] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Auto-scroll alla sezione bandi se richiesto via URL
    if (params.get('scrollTo') === 'bandi') {
      setTimeout(() => {
        const el = document.getElementById('profilo-bandi-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
    }
    if (params.get('scrollTo') === 'export') {
      setTimeout(() => {
        const el = document.getElementById('export-profile-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
    }
    // Evidenzia campi fiscali se richiesto dal Simulatore Fiscale
    if (params.get('highlight') === 'fiscale') {
      setHighlightFiscale(true);
      setTimeout(() => {
        const el = document.getElementById('profilo-aziendale-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
    }
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setCurrentUserRole(currentUser.role);
        let effectiveUser = currentUser;

        // Gestione impersonation — solo se l'utente corrente è admin
        if (impersonation.active && currentUser?.role === 'admin') {
          if (impersonation.role === 'user' && impersonation.previewUserId) {
            // Impersonificazione utente normale
            const users = await base44.entities.User.filter({ id: impersonation.previewUserId });
            if (users.length > 0) {
              effectiveUser = users[0];
            }
          } else if (impersonation.role === 'consulente' && impersonation.targetEmail) {
            // Impersonificazione consulente - carica i dati dell'utente consulente
            const consultantUsers = await base44.entities.User.filter({ email: impersonation.targetEmail });
            if (consultantUsers.length > 0) {
              effectiveUser = {
                ...consultantUsers[0],
                user_type: 'consulente'
              };
            } else {
              // Crea un oggetto user fittizio per il consulente
              effectiveUser = {
                ...currentUser,
                email: impersonation.targetEmail,
                full_name: impersonation.targetName,
                user_type: 'consulente'
              };
            }
          }
        }

        setUser(effectiveUser);
        // Usa SOLO i campi reali dell'entity User
        setFormData({
          full_name: effectiveUser.full_name || '',
          company_name: effectiveUser.company_name || '',
          specializzazione: effectiveUser.specializzazione || '',
          phone: effectiveUser.phone || '',
          website: effectiveUser.website || '',
          logo_url: effectiveUser.logo_url || '',
          vat_number: effectiveUser.vat_number || '',
          codice_sdi: effectiveUser.codice_sdi || '',
          company_size: effectiveUser.company_size || 'Piccola',
          company_email: effectiveUser.company_email || '',
          referente: effectiveUser.referente || '',
          cellulare_referente: effectiveUser.cellulare_referente || '',
          referente_email: effectiveUser.referente_email || '',
          address: effectiveUser.address || '',
          city: effectiveUser.city || '',
          province: effectiveUser.province || '',
          postal_code: effectiveUser.postal_code || '',
          ragione_sociale_fatturazione: effectiveUser.ragione_sociale_fatturazione || '',
          codice_fiscale: effectiveUser.codice_fiscale || '',
          regione: effectiveUser.regione || '',
          paese: effectiveUser.paese || '',
          region: effectiveUser.region || '',
          export_fatturato_annuo: effectiveUser.export_fatturato_annuo || '',
          export_esperienza: effectiveUser.export_esperienza || '',
          export_certificazioni: effectiveUser.export_certificazioni || '',
          export_paese_esportatore: effectiveUser.export_paese_esportatore || 'IT',
          export_mercati_target: effectiveUser.export_mercati_target || [],
          export_prodotti: effectiveUser.export_prodotti || [],
          settore: effectiveUser.settore || '',
          forma_giuridica: effectiveUser.forma_giuridica || '',
          fatturato_annuo: effectiveUser.fatturato_annuo || '',
          numero_dipendenti: effectiveUser.numero_dipendenti || '',
          regime_fiscale: effectiveUser.regime_fiscale || '',
          obiettivo_principale: effectiveUser.obiettivo_principale || ''
        });

        // Se l'utente è un consulente, carica i dati del consulente
        // Controlla sia user_type che se è impersonificato come consulente
        const isConsultant = effectiveUser.user_type === 'consulente' || 
                             (impersonation.active && impersonation.role === 'consulente');
        
        if (isConsultant) {
          const consultantEmail = impersonation.active && impersonation.role === 'consulente' 
            ? impersonation.targetEmail 
            : effectiveUser.email;
          
          const consultants = await base44.entities.Consultant.filter({
            email: consultantEmail?.toLowerCase()
          });
          if (consultants.length > 0) {
            setConsultantData(consultants[0]);
            // Se impersonificato come consulente, imposta user_type
            if (impersonation.active && impersonation.role === 'consulente') {
              effectiveUser.user_type = 'consulente';
            }
          }
        }

        setLoading(false);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    };
    loadUser();
  }, [impersonation.active, impersonation.previewUserId, impersonation.role, impersonation.targetEmail, impersonation.targetName]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, logo_url: file_url });
    } catch (error) {
      alert('Errore durante il caricamento del logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const REQUIRED_FIELDS = ['company_name', 'company_email', 'referente', 'cellulare_referente', 'referente_email', 'region', 'specializzazione', 'city'];

  const handleSave = async () => {
    setSaving(true);
    try {
      // Se appMode === 'user-preview', aggiorna l'utente impersonato
      if (impersonation.active && impersonation.previewUserId && impersonation.role === 'user') {
        // Escludi full_name perché è un attributo built-in non modificabile via entities.User.update
        const { full_name, ...dataToSave } = formData;
        await base44.entities.User.update(impersonation.previewUserId, dataToSave);
        const users = await base44.entities.User.filter({ id: impersonation.previewUserId });
        if (users.length > 0) {
          setUser(users[0]);
        }
      } else {
        // Altrimenti aggiorna l'utente corrente
        await base44.auth.updateMe(formData);
        const updatedUser = await base44.auth.me();
        setUser(updatedUser);
      }
      
      // Se tutti i campi obbligatori sono compilati, vai alla Home
      const allFieldsComplete = REQUIRED_FIELDS.every(field => {
        const value = formData[field];
        return value && typeof value === 'string' && value.trim() !== '';
      });
      
      toast.success('Profilo salvato con successo!');
      
      if (allFieldsComplete) {
        // In impersonation torna all'AdminPanel, altrimenti alla Home
        if (impersonation.active) {
          navigate(createPageUrl('Home'));
        } else {
          navigate(createPageUrl('Home'));
        }
        return;
      }
    } catch (error) {
      console.error('Errore salvataggio:', error);
      toast.error('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
   return (
     <div className="min-h-screen bg-slate-900 flex items-center justify-center">
       <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full"></div>
     </div>
   );
  }

  return (
   <div className="min-h-screen pb-64" style={{ backgroundColor: 'var(--app-bg)' }}>
     {/* Top bar gestita dal GlobalHeader nel Layout */}

     <main className="px-4 pt-16 pb-2 max-w-2xl mx-auto">
       {impersonation.active && (
         <div className="flex items-center gap-3 mb-4 pt-2">
           <button
             onClick={() => {
               stopImpersonation();
               navigate(createPageUrl('AdminPanel'));
             }}
             className="text-slate-400 hover:text-white transition-colors back-arrow-tap"
           >
             <ArrowLeft className="w-6 h-6" />
           </button>
           <span className="text-slate-400 text-sm">Torna all'Admin</span>
         </div>
       )}

        <Tabs defaultValue={(() => { const p = new URLSearchParams(window.location.search); return p.get('tab') || 'profilo'; })()} className="w-full">
          <TabsList className="w-full bg-slate-800 border border-slate-700 mb-4 grid grid-cols-2">
            <TabsTrigger value="profilo" className="data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900">
              <User className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Profilo</span>
            </TabsTrigger>
            <TabsTrigger value="notifiche" className="data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900">
              <Bell className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Notifiche</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profilo">

        {/* Profilo Consulente */}
        {user?.user_type === 'consulente' && consultantData && (
          <>
            <ConsultantProfileCard 
              consultantData={consultantData}
              setConsultantData={setConsultantData}
              savingConsultant={savingConsultant}
              setSavingConsultant={setSavingConsultant}
            />
            
            {/* Sezione Vantaggi che Offro */}
            <Card className="bg-slate-800 border-[#d4af37]/30 mb-4">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Gift className="w-5 h-5 text-[#d4af37]" />
                  Vantaggi che Offro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 text-sm mb-4">
                  Crea vantaggi promozionali esclusivi per i membri del Consorzio.
                </p>
                <div className="flex gap-2">
                  <Link to={createPageUrl('GestioneVantaggi')} className="flex-1">
                    <Button className="w-full bg-[#d4af37] hover:bg-[#b8960b] text-slate-900">
                      <Gift className="w-4 h-4 mr-2" />
                      Gestisci Vantaggi
                    </Button>
                  </Link>
                  <Link to={createPageUrl('ScannerQRVantaggi')}>
                    <Button variant="outline" className="border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37]/10">
                      <QrCode className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </>
        )}



{/* Se consulente, mostra solo Profilo Studio, altrimenti mostra form azienda */}
        {user?.user_type !== 'consulente' && (
          <>
        {/* Card Dati Personali - solo per admin non impersonato */}
        {user?.role === 'admin' && !impersonation.active && (
          <Card className="bg-slate-800 border-slate-700 mb-4">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="w-5 h-5 text-lime-400" />
                Dati Personali
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-slate-400 text-sm">E-mail</label>
                <Input
                  value={user?.email || ''}
                  disabled
                  className="bg-slate-900 border-slate-700 text-slate-500"
                />
              </div>
              <div>
                <label className="text-slate-400 text-sm">Nome Completo</label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 text-sm">Ruolo</label>
                <Input
                  value="Amministratore"
                  disabled
                  className="bg-slate-900 border-slate-700 text-slate-500"
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-slate-800 border-slate-700 mb-4">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-lime-400" />
              Dati Azienda
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-slate-400 text-sm">Logo Aziendale</label>
              <div className="mt-2 space-y-3">
                {formData.logo_url && (
                  <div className="flex items-center gap-3 bg-slate-900 rounded-lg p-3">
                    <img 
                      src={formData.logo_url} 
                      alt="Logo" 
                      className="w-16 h-16 object-contain rounded"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({...formData, logo_url: ''})}
                      className="border-red-600 text-red-400"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Rimuovi
                    </Button>
                  </div>
                )}
                <label className="flex items-center justify-center gap-2 bg-slate-900 border-2 border-dashed border-slate-700 rounded-lg p-4 cursor-pointer hover:border-lime-400 transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploadingLogo}
                  />
                  {uploadingLogo ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-lime-400 border-t-transparent rounded-full"></div>
                      <span className="text-slate-400">Caricamento...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-lime-400" />
                      <span className="text-slate-300">Carica logo</span>
                    </>
                  )}
                </label>
              </div>
            </div>
            <div>
              <label className="text-lime-400 text-sm font-medium mb-1 block">Nome Azienda (obbligatorio)</label>
              <Input
                placeholder="Inserisci il nome dell'azienda"
                value={formData.company_name}
                onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                className="bg-lime-400/10 border-lime-400 text-white placeholder:text-lime-400/50"
              />
            </div>
            <div>
              <label className="text-lime-400 text-sm font-medium mb-1 block">Specializzazione (obbligatorio)</label>
              <Input
                placeholder="Es: Produzione industriale, Servizi IT, Consulenza..."
                value={formData.specializzazione}
                onChange={(e) => setFormData({...formData, specializzazione: e.target.value})}
                className="bg-lime-400/10 border-lime-400 text-white placeholder:text-lime-400/50"
              />
            </div>
            <Input
              placeholder="Ragione Sociale Fatturazione"
              value={formData.ragione_sociale_fatturazione}
              onChange={(e) => setFormData({...formData, ragione_sociale_fatturazione: e.target.value})}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <Input
              placeholder="Partita IVA"
              value={formData.vat_number}
              onChange={(e) => setFormData({...formData, vat_number: e.target.value})}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <Input
              placeholder="Codice Fiscale"
              value={formData.codice_fiscale}
              onChange={(e) => setFormData({...formData, codice_fiscale: e.target.value})}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <Input
              placeholder="Codice SDI"
              value={formData.codice_sdi}
              onChange={(e) => setFormData({...formData, codice_sdi: e.target.value})}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <Input
              placeholder="Sito Web"
              value={formData.website}
              onChange={(e) => setFormData({...formData, website: e.target.value})}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <Select
              value={formData.company_size || undefined}
              onValueChange={(value) => setFormData({...formData, company_size: value})}
            >
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                <SelectValue placeholder="Dimensione Azienda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Micro">Micro (0-9 dipendenti)</SelectItem>
                <SelectItem value="Piccola">Piccola (10-49 dipendenti)</SelectItem>
                <SelectItem value="Media">Media (50-249 dipendenti)</SelectItem>
                <SelectItem value="Grande">Grande (250+ dipendenti)</SelectItem>
              </SelectContent>
            </Select>
            <div>
              <label className="text-lime-400 text-sm font-medium mb-1 block">Email Aziendale (obbligatorio)</label>
              <Input
                placeholder="Inserisci l'email aziendale"
                type="email"
                value={formData.company_email}
                onChange={(e) => setFormData({...formData, company_email: e.target.value})}
                className="bg-lime-400/10 border-lime-400 text-white placeholder:text-lime-400/50"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700 mb-4">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Phone className="w-5 h-5 text-lime-400" />
              Contatti
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Telefono Aziendale"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <div>
              <label className="text-lime-400 text-sm font-medium mb-1 block">Nome Referente (obbligatorio)</label>
              <Input
                placeholder="Inserisci il nome del referente"
                value={formData.referente}
                onChange={(e) => setFormData({...formData, referente: e.target.value})}
                className="bg-lime-400/10 border-lime-400 text-white placeholder:text-lime-400/50"
              />
            </div>
            <div>
              <label className="text-lime-400 text-sm font-medium mb-1 block">Cellulare Referente (obbligatorio)</label>
              <Input
                placeholder="Inserisci il cellulare del referente"
                value={formData.cellulare_referente}
                onChange={(e) => setFormData({...formData, cellulare_referente: e.target.value})}
                className="bg-lime-400/10 border-lime-400 text-white placeholder:text-lime-400/50"
              />
            </div>
            <div>
              <label className="text-lime-400 text-sm font-medium mb-1 block">Email Referente (obbligatorio)</label>
              <Input
                placeholder="Inserisci l'email del referente"
                value={formData.referente_email}
                onChange={(e) => setFormData({...formData, referente_email: e.target.value})}
                className="bg-lime-400/10 border-lime-400 text-white placeholder:text-lime-400/50"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700 mb-4">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-lime-400" />
              Sede
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Indirizzo"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-lime-400 text-sm font-medium mb-1 block">Città (obbligatorio)</label>
                <Input
                  placeholder="Inserisci la città"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className="bg-lime-400/10 border-lime-400 text-white placeholder:text-lime-400/50"
                />
              </div>
              <div>
                <label className="text-slate-400 text-sm mb-1 block">Provincia</label>
                <Input
                  placeholder="Provincia"
                  value={formData.province}
                  onChange={(e) => setFormData({...formData, province: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  maxLength={2}
                />
              </div>
            </div>
            <div className={highlightFiscale ? 'ring-2 ring-[#d4af37]/50 rounded-lg p-2 -m-2 bg-[#d4af37]/5' : ''}>
              <label className="text-lime-400 text-sm font-medium mb-1 block">Regione (obbligatorio) {highlightFiscale && <span className="text-[#d4af37]">← Simulatore</span>}</label>
              <Select
                value={formData.region || undefined}
                onValueChange={(value) => setFormData({...formData, region: value})}
              >
                <SelectTrigger className="bg-lime-400/10 border-lime-400 text-white">
                  <SelectValue placeholder="Seleziona regione" />
                </SelectTrigger>
                <SelectContent>
                  {['Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna',
                    'Friuli Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche',
                    'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana',
                    'Trentino-Alto Adige', 'Umbria', "Valle d'Aosta", 'Veneto'].map((regione) => (
                    <SelectItem key={regione} value={regione}>{regione}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="CAP"
              value={formData.postal_code}
              onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
              className="bg-slate-900 border-slate-700 text-white"
            />
          </CardContent>
        </Card>

        <WelfareRiepilogoSection userEmail={user?.email} />

        <ExportProfileSection formData={formData} setFormData={setFormData} />

        {/* Profilo Bandi per matching */}
        <div id="profilo-bandi-section">
          <ProfiloBandiForm user={user} onSaved={() => toast.success('Profilo bandi aggiornato!')} />
        </div>

        {/* Profilo Aziendale (ex ProfiloUtente) */}
        <div id="profilo-aziendale-section">
        <Card className={`bg-slate-800 mb-4 ${highlightFiscale ? 'border-2 border-[#d4af37] shadow-lg shadow-[#d4af37]/20' : 'border-slate-700'}`}>
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#d4af37]" />
              Profilo Aziendale
              {highlightFiscale && <span className="text-[#d4af37] text-xs font-normal ml-2 bg-[#d4af37]/10 px-2 py-0.5 rounded">⚡ Dati usati dal Simulatore Fiscale</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-slate-400 text-sm mb-1 block">Settore</Label>
              <Select value={formData.settore || undefined} onValueChange={(v) => setFormData({...formData, settore: v})}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue placeholder="Seleziona settore" /></SelectTrigger>
                <SelectContent>
                  {['Manifattura','Commercio','Servizi','Tecnologia','Ristorazione','Edilizia','Trasporti','Sanita','Professioni','Altro'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className={highlightFiscale ? 'ring-2 ring-[#d4af37]/50 rounded-lg p-2 -m-2 bg-[#d4af37]/5' : ''}>
              <Label className="text-lime-400 text-sm font-medium mb-1 block">Tipo di Società (obbligatorio) {highlightFiscale && <span className="text-[#d4af37]">← Simulatore</span>}</Label>
              <Select value={formData.forma_giuridica || undefined} onValueChange={(v) => setFormData({...formData, forma_giuridica: v})}>
                <SelectTrigger className="bg-lime-400/10 border-lime-400 text-white"><SelectValue placeholder="Seleziona tipo società" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SS">SS – Società semplice</SelectItem>
                  <SelectItem value="SNC">SNC – Società in nome collettivo</SelectItem>
                  <SelectItem value="SAS">SAS – Società in accomandita semplice</SelectItem>
                  <SelectItem value="SRL">SRL – Società a responsabilità limitata</SelectItem>
                  <SelectItem value="SRLU">SRLU – SRL unipersonale</SelectItem>
                  <SelectItem value="SPA">SPA – Società per azioni</SelectItem>
                  <SelectItem value="SAPA">SAPA – Società in accomandita per azioni</SelectItem>
                  <SelectItem value="COOP">COOP – Cooperativa</SelectItem>
                  <SelectItem value="RF">RF – Regime forfettario</SelectItem>
                  <SelectItem value="SE">SE – Società Europea</SelectItem>
                  <SelectItem value="Ditta individuale">Ditta individuale</SelectItem>
                  <SelectItem value="Altro">Altro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-400 text-sm mb-1 block">Fatturato annuo</Label>
              <Select value={formData.fatturato_annuo || undefined} onValueChange={(v) => setFormData({...formData, fatturato_annuo: v})}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue placeholder="Seleziona fatturato" /></SelectTrigger>
                <SelectContent>
                  {['Sotto 100K','100K-500K','500K-1M','1M-5M','5M-10M','Oltre 10M'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-400 text-sm mb-1 block">Numero dipendenti</Label>
              <Select value={formData.numero_dipendenti || undefined} onValueChange={(v) => setFormData({...formData, numero_dipendenti: v})}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue placeholder="Seleziona" /></SelectTrigger>
                <SelectContent>
                  {['Solo io','1-5','6-15','16-50','51-200','Oltre 200'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className={highlightFiscale ? 'ring-2 ring-[#d4af37]/50 rounded-lg p-2 -m-2 bg-[#d4af37]/5' : ''}>
              <Label className={highlightFiscale ? 'text-[#d4af37] text-sm font-medium mb-1 block' : 'text-slate-400 text-sm mb-1 block'}>Regime fiscale {highlightFiscale && <span className="text-[#d4af37]">← Simulatore</span>}</Label>
              <Select value={formData.regime_fiscale || undefined} onValueChange={(v) => setFormData({...formData, regime_fiscale: v})}>
                <SelectTrigger className={highlightFiscale ? 'bg-[#d4af37]/10 border-[#d4af37] text-white' : 'bg-slate-900 border-slate-700 text-white'}><SelectValue placeholder="Seleziona regime" /></SelectTrigger>
                <SelectContent>
                  {['Forfettario','Semplificato','Ordinario','Non so'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-400 text-sm mb-1 block">Obiettivo principale</Label>
              <Select value={formData.obiettivo_principale || undefined} onValueChange={(v) => setFormData({...formData, obiettivo_principale: v})}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue placeholder="Seleziona obiettivo" /></SelectTrigger>
                <SelectContent>
                  {['Crescita fatturato','Riduzione costi','Espansione','Digitalizzazione','Passaggio generazionale','Altro'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 text-lg py-6"
        >
          <Save className="w-5 h-5 mr-2" />
          {saving ? 'Salvataggio...' : 'Salva Modifiche'}
        </Button>
        </>
        )}
          </TabsContent>

          <TabsContent value="notifiche">
            <NotificationPreferences user={user} />
          </TabsContent>
        </Tabs>

        {/* Pulsante Logout — sempre visibile */}
        <Button
          variant="outline"
          onClick={() => base44.auth.logout()}
          className="w-full mt-6 border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Esci dall'account
        </Button>
      </main>

      <BottomNav currentPage="MyProfile" />
    </div>
  );
}