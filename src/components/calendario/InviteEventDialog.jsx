import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Search, Users, Briefcase, Send, Check, Trash2 } from 'lucide-react';

export default function InviteEventDialog({ open, onClose, event, type }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [sending, setSending] = useState(false);
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['all-users-invite'],
    queryFn: () => base44.entities.User.list(),
    enabled: open && type === 'users',
  });

  const { data: consultants = [] } = useQuery({
    queryKey: ['all-consultants-invite'],
    queryFn: () => base44.entities.Consultant.list(),
    enabled: open && type === 'consultants',
  });

  const { data: partecipazioni = [] } = useQuery({
    queryKey: ['partecipazioni-eventi'],
    queryFn: () => base44.entities.PartecipazioniEvento.list(),
    enabled: open,
  });

  // Filtra utenti nascosti (pinko pallino)
  const filteredUsers = users.filter(u => 
    !u.full_name?.toLowerCase().includes('pinko pallino') && 
    !u.company_name?.toLowerCase().includes('pinko pallino')
  );

  const items = type === 'users' ? filteredUsers : consultants;

  const searchedItems = items.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    if (type === 'users') {
      return (
        item.company_name?.toLowerCase().includes(searchLower) ||
        item.full_name?.toLowerCase().includes(searchLower) ||
        item.email?.toLowerCase().includes(searchLower)
      );
    } else {
      return (
        item.name?.toLowerCase().includes(searchLower) ||
        item.category?.toLowerCase().includes(searchLower)
      );
    }
  });

  // Trova chi è già stato invitato per questo evento
  const getInviteStatus = (email) => {
    const partecipazione = partecipazioni.find(
      p => p.user_email === email && p.evento_id === event?.id
    );
    return partecipazione?.stato || null;
  };

  // Ritira invito
  const handleWithdrawInvite = async (email) => {
    const partecipazione = partecipazioni.find(
      p => p.user_email === email && p.evento_id === event?.id
    );
    if (!partecipazione) return;

    try {
      // Elimina la partecipazione
      await base44.entities.PartecipazioniEvento.delete(partecipazione.id);
      
      // Elimina eventuali notifiche correlate
      const notifications = await base44.entities.Notification.filter({
        user_email: email,
        type: 'event',
        reference_id: event.id
      });
      for (const notif of notifications) {
        await base44.entities.Notification.delete(notif.id);
      }

      queryClient.invalidateQueries({ queryKey: ['partecipazioni-eventi'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (error) {
      console.error('Errore ritiro invito:', error);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const allIds = searchedItems.map(item => item.id);
    setSelectedIds(allIds);
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  const handleSendInvites = async () => {
    setSending(true);
    try {
      const selectedItems = items.filter(item => selectedIds.includes(item.id));
      
      for (const item of selectedItems) {
        const email = type === 'users' ? item.email : item.email;
        if (!email) continue;

        // Verifica se già esiste una partecipazione
        const existingPartecipazione = partecipazioni.find(
          p => p.user_email === email && p.evento_id === event.id
        );

        if (!existingPartecipazione) {
          // Crea nuova partecipazione con stato "nessuna_risposta"
          await base44.entities.PartecipazioniEvento.create({
            user_email: email,
            evento_id: event.id,
            stato: 'nessuna_risposta'
          });

          // Crea notifica
          await base44.entities.Notification.create({
            user_email: email,
            type: 'event',
            title: 'Invito a Incontro',
            content: `Sei stato invitato all'incontro: ${event.title}`,
            reference_id: event.id
          });

          // Invia email di invito
          const appUrl = window.location.origin;
          const eventDate = new Date(event.date).toLocaleDateString('it-IT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });

          const emailBody = `
Gentile Membro del Consorzio,

Sei stato invitato a partecipare al seguente incontro:

📌 TITOLO: ${event.title}

📅 DATA: ${eventDate}
🕐 ORA: ${event.time}
📍 LUOGO: ${event.location}

${event.description ? `📝 DESCRIZIONE:\n${event.description}\n` : ''}

Per confermare o declinare la tua partecipazione, accedi alla tua area riservata:
${appUrl}

Ti aspettiamo!

Cordiali saluti,
Il Consorzio
          `.trim();

          await base44.integrations.Core.SendEmail({
            to: email,
            subject: `Invito del Consorzio Ad ${event.title}`,
            body: emailBody
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['partecipazioni-eventi'] });
      setSelectedIds([]);
      onClose();
    } catch (error) {
      console.error('Errore invio inviti:', error);
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'confermato') {
      return <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">Confermato</span>;
    }
    if (status === 'non_confermato') {
      return <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded">Non partecipa</span>;
    }
    if (status === 'nessuna_risposta') {
      return <span className="text-xs bg-yellow-600 text-white px-2 py-0.5 rounded">Invitato</span>;
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            {type === 'users' ? <Users className="w-5 h-5 text-lime-400" /> : <Briefcase className="w-5 h-5 text-lime-400" />}
            Invita {type === 'users' ? 'Utenti' : 'Consulenti'}
          </DialogTitle>
        </DialogHeader>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4 text-slate-400" />
        </button>

        <div className="text-sm text-slate-400 mb-4">
          Evento: <span className="text-lime-400 font-medium">{event?.title}</span>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Cerca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-900 border-slate-700 text-white pl-10"
          />
        </div>

        {/* Select All / Deselect All */}
        <div className="flex gap-2 mb-4">
          <Button
            size="sm"
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            onClick={selectAll}
          >
            Seleziona tutti
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            onClick={deselectAll}
          >
            Deseleziona
          </Button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {searchedItems.map((item) => {
            const email = type === 'users' ? item.email : item.email;
            const status = getInviteStatus(email);
            const isSelected = selectedIds.includes(item.id);
            const alreadyInvited = !!status;

            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  alreadyInvited 
                    ? 'bg-slate-700/50 border-slate-600' 
                    : isSelected 
                      ? 'bg-lime-400/20 border-lime-400' 
                      : 'bg-slate-900 border-slate-700 hover:border-slate-600 cursor-pointer'
                }`}
                onClick={() => !alreadyInvited && toggleSelect(item.id)}
              >
                {!alreadyInvited && (
                  <Checkbox
                    checked={isSelected}
                    className="border-slate-500 data-[state=checked]:bg-lime-400 data-[state=checked]:border-lime-400"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">
                    {type === 'users' ? (item.company_name || item.full_name) : item.name}
                  </p>
                  <p className="text-slate-400 text-xs truncate">
                    {type === 'users' ? item.email : item.category}
                  </p>
                </div>
                {getStatusBadge(status)}
                {alreadyInvited && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/30 p-1 h-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWithdrawInvite(email);
                    }}
                    title="Ritira invito"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Send Button */}
        <Button
          className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
          disabled={selectedIds.length === 0 || sending}
          onClick={handleSendInvites}
        >
          {sending ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full mr-2"></div>
              Invio in corso...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Invia {selectedIds.length} invit{selectedIds.length === 1 ? 'o' : 'i'}
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}