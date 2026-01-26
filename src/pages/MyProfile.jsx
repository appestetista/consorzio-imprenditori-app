import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, User, Building2, Phone, MapPin, Save, Upload, X, Image as ImageIcon, LogOut, FileText, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import ProfiloBandiForm from '../components/profile/ProfiloBandiForm';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { PhoneOff, PhoneCall, Gift, AlertTriangle as AlertTriangleIcon, EyeOff, UserPlus, Minus, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// Componente per gestire consulenze extra per utenti specifici
function ExtraConsultationsManager({ consultantId, consultantZona }) {
  const [selectedUser, setSelectedUser] = useState('');
  const [extraAmount, setExtraAmount] = useState(1);

  // Carica utenti della zona
  const { data: zoneUsers = [] } = useQuery({
    queryKey: ['zone-users-for-extra', consultantZona],
    queryFn: async () => {
      if (!consultantZona) return [];
      const zones = consultantZona.split(',').map(z => z.trim().toLowerCase()).filter(Boolean);
      const { data } = await base44.functions.invoke('listMembers', {});
      const allUsers = data?.users || [];
      return allUsers.filter(u => {
        const isUtente = !u.user_type || u.user_type === 'utente';
        const isNotBlocked = !u.is_blocked;
        const userZona = (u.zona || '').trim().toLowerCase();
        const isInZone = userZona && zones.includes(userZona);
        return isUtente && isNotBlocked && isInZone;
      });
    },
    enabled: !!consultantZona
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

  const handleAddExtra = async () => {
    if (!selectedUser || extraAmount < 1) return;
    
    const existingAssignment = existingAssignments.find(a => a.user_email === selectedUser);
    
    if (existingAssignment) {
      // Aggiorna l'assegnazione esistente
      await base44.entities.ConsultantAssignment.update(existingAssignment.id, {
        available_consultations: (existingAssignment.available_consultations || 0) + extraAmount
      });
    } else {
      // Crea nuova assegnazione
      await base44.entities.ConsultantAssignment.create({
        user_email: selectedUser,
        consultant_id: consultantId,
        available_consultations: extraAmount,
        is_assigned: true
      });
    }
    
    toast.success(`Aggiunte ${extraAmount} consulenze gratuite!`);
    setSelectedUser('');
    setExtraAmount(1);
    refetchAssignments();
  };

  const handleRemoveExtra = async (assignmentId, currentAmount) => {
    if (currentAmount <= 1) {
      await base44.entities.ConsultantAssignment.delete(assignmentId);
    } else {
      await base44.entities.ConsultantAssignment.update(assignmentId, {
        available_consultations: currentAmount - 1
      });
    }
    refetchAssignments();
  };

  const handleAddOneMore = async (assignmentId, currentAmount) => {
    await base44.entities.ConsultantAssignment.update(assignmentId, {
      available_consultations: currentAmount + 1
    });
    refetchAssignments();
  };

  // Filtra utenti che hanno assegnazioni extra (più di 0)
  const usersWithExtra = existingAssignments.filter(a => a.available_consultations > 0);

  return (
    <div className="space-y-3">
      {/* Form per aggiungere consulenze extra */}
      <div className="bg-slate-900 rounded-lg p-3 space-y-3">
        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
            <SelectValue placeholder="Seleziona utente..." />
          </SelectTrigger>
          <SelectContent>
            {zoneUsers.map(u => (
              <SelectItem key={u.email} value={u.email}>
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
            onChange={(e) => setExtraAmount(parseInt(e.target.value) || 1)}
            className="bg-slate-800 border-slate-700 text-white w-20 text-center"
          />
        </div>
        
        <Button
          onClick={handleAddExtra}
          disabled={!selectedUser}
          className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
          size="sm"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Assegna Consulenze Extra
        </Button>
      </div>

      {/* Lista utenti con consulenze extra */}
      {usersWithExtra.length > 0 && (
        <div className="bg-slate-900 rounded-lg p-3">
          <p className="text-slate-400 text-xs mb-2">Utenti con consulenze extra assegnate:</p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {usersWithExtra.map(assignment => {
              const user = zoneUsers.find(u => u.email === assignment.user_email);
              return (
                <div key={assignment.id} className="flex items-center justify-between bg-slate-800 rounded-lg p-2">
                  <span className="text-white text-sm truncate flex-1">
                    {user?.company_name || user?.full_name || assignment.user_email}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRemoveExtra(assignment.id, assignment.available_consultations)}
                      className="w-6 h-6 rounded bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/30"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-lime-400 font-bold w-6 text-center">
                      {assignment.available_consultations}
                    </span>
                    <button
                      onClick={() => handleAddOneMore(assignment.id, assignment.available_consultations)}
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
  const [localData, setLocalData] = useState({
    name: consultantData?.name || '',
    phone: consultantData?.phone || '',
    city: consultantData?.city || '',
    referente: consultantData?.referente || '',
    cellulare_referente: consultantData?.cellulare_referente || '',
    block_calls_for_all: consultantData?.block_calls_for_all || false,
    blocked_users_calls: consultantData?.blocked_users_calls || [],
    free_consultations_per_user: consultantData?.free_consultations_per_user ?? 1
  });
  const [showZeroWarning, setShowZeroWarning] = useState(false);
  const [pendingZeroValue, setPendingZeroValue] = useState(false);

  // Carica lista utenti per blocco chiamate individuali
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-for-block'],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ user_type: 'utente' });
      return users.filter(u => !u.is_blocked);
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
      await base44.entities.Consultant.update(consultantData.id, localData);
      setConsultantData({ ...consultantData, ...localData });
      toast.success('Profilo consulente aggiornato!');
      setPendingZeroValue(false);
    } catch (error) {
      console.error('Errore salvataggio:', error);
      toast.error('Errore durante il salvataggio');
    } finally {
      setSavingConsultant(false);
    }
  };

  const confirmZeroConsultations = () => {
    setPendingZeroValue(true);
    setShowZeroWarning(false);
    // Salva automaticamente dopo conferma
    setSavingConsultant(true);
    base44.entities.Consultant.update(consultantData.id, localData)
      .then(() => {
        setConsultantData({ ...consultantData, ...localData });
        toast.success('Profilo consulente aggiornato!');
      })
      .catch((error) => {
        console.error('Errore salvataggio:', error);
        toast.error('Errore durante il salvataggio');
      })
      .finally(() => {
        setSavingConsultant(false);
        setPendingZeroValue(false);
      });
  };

  const toggleBlockUser = (userEmail) => {
    const blocked = localData.blocked_users_calls || [];
    if (blocked.includes(userEmail)) {
      setLocalData({ ...localData, blocked_users_calls: blocked.filter(e => e !== userEmail) });
    } else {
      setLocalData({ ...localData, blocked_users_calls: [...blocked, userEmail] });
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700 mb-4">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Building2 className="w-5 h-5 text-lime-400" />
          Profilo Studio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <Select value={consultantData?.category || ''} disabled>
            <SelectTrigger className="bg-slate-900 border-slate-600 text-slate-400">
              <SelectValue placeholder="Nessuna categoria" />
            </SelectTrigger>
            <SelectContent>
              {CONSULTANT_CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        </div>

        {/* Consulenze Extra per Utenti Specifici */}
        <div className="border-t border-slate-700 pt-4 mt-4">
          <h3 className="text-white font-medium mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-lime-400" />
            Consulenze Extra per Utenti Specifici
          </h3>
          <p className="text-slate-400 text-xs mb-3">
            Assegna consulenze gratuite aggiuntive a utenti specifici della tua zona
          </p>
          
          <ExtraConsultationsManager 
            consultantId={consultantData?.id}
            consultantZona={consultantData?.zona}
          />
        </div>

        {/* Gestione Chiamate */}
        <div className="border-t border-slate-700 pt-4 mt-4">
          <h3 className="text-white font-medium mb-3 flex items-center gap-2">
            <PhoneOff className="w-4 h-4 text-red-400" />
            Gestione Chiamate
          </h3>

          {/* Blocca tutti */}
          <div className="flex items-center justify-between bg-slate-900 rounded-lg p-3 mb-3">
            <div>
              <p className="text-white text-sm font-medium">Blocca chiamate da tutti</p>
              <p className="text-slate-400 text-xs">Rispondi solo ai messaggi</p>
            </div>
            <Switch
              checked={localData.block_calls_for_all}
              onCheckedChange={(checked) => setLocalData({ ...localData, block_calls_for_all: checked })}
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
          onClick={handleSaveConsultant}
          disabled={savingConsultant || !localData.phone || !localData.city}
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

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setCurrentUserRole(currentUser.role);
        let effectiveUser = currentUser;

        // Se appMode === 'user-preview', carica l'utente impersonato via previewUserId
        if (impersonation.active && impersonation.previewUserId && impersonation.role === 'user') {
          const users = await base44.entities.User.filter({ id: impersonation.previewUserId });
          if (users.length > 0) {
            effectiveUser = users[0];
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
          region: effectiveUser.region || ''
        });

        // Se l'utente è un consulente, carica i dati del consulente
        if (effectiveUser.user_type === 'consulente') {
          const consultants = await base44.entities.Consultant.filter({
            email: effectiveUser.email.toLowerCase()
          });
          if (consultants.length > 0) {
            setConsultantData(consultants[0]);
          }
        }

        setLoading(false);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    };
    loadUser();
  }, [impersonation.active, impersonation.previewUserId, impersonation.role]);

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
   <div className="min-h-screen bg-slate-900 pb-24">
     <Header user={user} />
      
      <main className="px-4 py-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          {appMode === 'user-preview' ? (
            <button
              onClick={() => {
                stopImpersonation();
                navigate(createPageUrl('AdminPanel'));
              }}
              className="text-lime-400 hover:text-lime-500 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          ) : (
            <Link to={createPageUrl('Home')} className="text-lime-400">
              <ArrowLeft className="w-6 h-6" />
            </Link>
          )}
          <h1 className="text-white text-xl font-bold">Il Mio Profilo</h1>
        </div>

        <Tabs defaultValue="profilo" className="w-full">
          <TabsList className="w-full bg-slate-800 border border-slate-700 mb-4">
            <TabsTrigger value="profilo" className="flex-1 data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900">
              <User className="w-4 h-4 mr-2" />
              Profilo
            </TabsTrigger>
            <TabsTrigger value="bandi" className="flex-1 data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900">
              <FileText className="w-4 h-4 mr-2" />
              Profilo Bandi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profilo">

        {/* Profilo Consulente */}
        {user?.user_type === 'consulente' && consultantData && (
          <ConsultantProfileCard 
            consultantData={consultantData}
            setConsultantData={setConsultantData}
            savingConsultant={savingConsultant}
            setSavingConsultant={setSavingConsultant}
          />
        )}

        {/* Avviso per compilare Profilo Bandi */}
        {user?.user_type !== 'consulente' && (!user?.legal_form || !user?.sector || !user?.ateco_code) && (
          <Alert className="bg-lime-500/20 border-lime-500/50 mb-4">
            <AlertTriangle className="h-5 w-5 text-lime-400" />
            <AlertDescription className="text-lime-300">
              <p className="font-bold mb-1">📋 Completa il tuo Profilo Bandi!</p>
              <p className="text-sm">Per ricevere le opportunità di finanziamento più adatte alla tua azienda, compila anche la sezione <span className="font-bold text-lime-400">"Profilo Bandi"</span>.</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Se consulente, nascondi il resto */}
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
              value={formData.company_size}
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
            <div>
              <label className="text-lime-400 text-sm font-medium mb-1 block">Regione (obbligatorio)</label>
              <Select
                value={formData.region}
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

          <TabsContent value="bandi">
              <ProfiloBandiForm user={user} />
            </TabsContent>
        </Tabs>
      </main>

      <BottomNav currentPage="MyProfile" />
    </div>
  );
}