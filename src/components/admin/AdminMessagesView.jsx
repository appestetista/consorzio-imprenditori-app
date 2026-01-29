import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  ArrowLeft, User, Search, Filter, Trash2, Mail, MapPin, 
  Briefcase, ChevronRight, MessageSquare, Users, X, Check, CheckCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function AdminMessagesView({ onBack }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'utenti', 'consulenti'
  const [sourceFilter, setSourceFilter] = useState('all');
  
  // Stati per navigazione
  const [selectedPerson, setSelectedPerson] = useState(null); // persona selezionata (mostra le sue conversazioni)
  const [selectedConversation, setSelectedConversation] = useState(null); // conversazione selezionata (mostra i messaggi)
  
  // Stati per azioni
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [conversationToDelete, setConversationToDelete] = useState(null);

  const queryClient = useQueryClient();

  // Fetch tutti i messaggi
  const { data: allMessages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['admin-all-messages'],
    queryFn: () => base44.entities.Message.list('-created_date'),
  });

  // Fetch utenti
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users-messages'],
    queryFn: () => base44.entities.User.list(),
  });

  // Fetch consulenti
  const { data: consultants = [] } = useQuery({
    queryKey: ['admin-consultants-messages'],
    queryFn: () => base44.entities.Consultant.list(),
  });

  // Fetch zone
  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: () => base44.entities.Zone.filter({ is_active: true }),
  });

  // Mappa email -> info persona
  const peopleMap = useMemo(() => {
    const map = {};
    
    users.forEach(u => {
      map[u.email] = {
        email: u.email,
        name: u.company_name || u.full_name || u.email,
        type: 'utente',
        zona: u.zona,
        role: u.role
      };
    });
    
    consultants.forEach(c => {
      map[c.email] = {
        email: c.email,
        name: c.name || c.email,
        type: 'consulente',
        zona: c.zona,
        category: c.category
      };
    });
    
    return map;
  }, [users, consultants]);

  // Raggruppa messaggi per persona (utente/consulente)
  const messagesByPerson = useMemo(() => {
    const grouped = {};
    
    allMessages.forEach(msg => {
      // Considera sia mittente che destinatario
      [msg.from_email, msg.to_email].forEach(email => {
        if (!email) return;
        
        if (!grouped[email]) {
          grouped[email] = {
            email,
            person: peopleMap[email] || { email, name: email, type: 'sconosciuto' },
            messages: [],
            conversations: {},
            unreadCount: 0,
            lastMessageDate: null
          };
        }
        
        // Aggiungi messaggio se non già presente
        if (!grouped[email].messages.find(m => m.id === msg.id)) {
          grouped[email].messages.push(msg);
        }
        
        // Raggruppa per conversazione (altra persona + source)
        const otherEmail = msg.from_email === email ? msg.to_email : msg.from_email;
        const source = msg.source || 'diretto';
        const convKey = `${otherEmail}_${source}`;
        
        if (!grouped[email].conversations[convKey]) {
          grouped[email].conversations[convKey] = {
            otherEmail,
            otherPerson: peopleMap[otherEmail] || { email: otherEmail, name: otherEmail, type: 'sconosciuto' },
            source,
            messages: []
          };
        }
        
        if (!grouped[email].conversations[convKey].messages.find(m => m.id === msg.id)) {
          grouped[email].conversations[convKey].messages.push(msg);
        }
      });
    });
    
    // Calcola statistiche e ordina
    Object.values(grouped).forEach(person => {
      person.messages.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      person.lastMessageDate = person.messages[0]?.created_date;
      person.unreadCount = person.messages.filter(m => m.to_email === person.email && !m.is_read).length;
      person.totalMessages = person.messages.length;
      person.conversationsCount = Object.keys(person.conversations).length;
      
      // Ordina messaggi in ogni conversazione
      Object.values(person.conversations).forEach(conv => {
        conv.messages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        conv.lastMessage = conv.messages[conv.messages.length - 1];
        conv.unreadCount = conv.messages.filter(m => m.to_email === person.email && !m.is_read).length;
      });
    });
    
    return grouped;
  }, [allMessages, peopleMap]);

  // Filtra persone
  const filteredPeople = useMemo(() => {
    return Object.values(messagesByPerson)
      .filter(p => {
        // Escludi admin
        if (p.person.role === 'admin') return false;
        
        // Filtro ricerca
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || 
          p.person.name?.toLowerCase().includes(searchLower) ||
          p.email.toLowerCase().includes(searchLower);
        
        // Filtro zona
        const matchesZone = zoneFilter === 'all' || p.person.zona === zoneFilter;
        
        // Filtro tipo
        const matchesType = typeFilter === 'all' || 
          (typeFilter === 'utenti' && p.person.type === 'utente') ||
          (typeFilter === 'consulenti' && p.person.type === 'consulente');
        
        return matchesSearch && matchesZone && matchesType;
      })
      .sort((a, b) => new Date(b.lastMessageDate) - new Date(a.lastMessageDate));
  }, [messagesByPerson, searchTerm, zoneFilter, typeFilter]);

  // Filtra conversazioni della persona selezionata
  const filteredConversations = useMemo(() => {
    if (!selectedPerson) return [];
    
    const person = messagesByPerson[selectedPerson];
    if (!person) return [];
    
    return Object.entries(person.conversations)
      .filter(([_, conv]) => {
        if (sourceFilter === 'all') return true;
        return conv.source === sourceFilter;
      })
      .sort((a, b) => new Date(b[1].lastMessage?.created_date) - new Date(a[1].lastMessage?.created_date));
  }, [selectedPerson, messagesByPerson, sourceFilter]);

  // Mutations
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      await base44.entities.Message.delete(messageId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-messages'] });
      setMessageToDelete(null);
      toast.success('Messaggio eliminato');
      // Non chiudiamo la conversazione, rimaniamo nella chat
    }
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (messageIds) => {
      for (const id of messageIds) {
        await base44.entities.Message.delete(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-messages'] });
      setConversationToDelete(null);
      setSelectedConversation(null);
      setSelectedPerson(null); // Torna alla lista principale
      toast.success('Conversazione eliminata');
    }
  });

  const sourceLabels = {
    marketplace: { label: 'Marketplace', color: 'bg-purple-500' },
    video: { label: 'Video', color: 'bg-blue-500' },
    contatta_consorzio: { label: 'Consorzio', color: 'bg-green-500' },
    consulenze: { label: 'Consulenze', color: 'bg-orange-500' },
    import_export: { label: 'Import/Export', color: 'bg-teal-500' },
    analisi_contratti: { label: 'Contratti', color: 'bg-indigo-500' },
    diretto: { label: 'Diretto', color: 'bg-slate-500' }
  };

  // Vista dettaglio conversazione (messaggi)
  if (selectedConversation && selectedPerson) {
    const person = messagesByPerson[selectedPerson];
    const conv = person?.conversations[selectedConversation];
    
    if (!conv) return null;
    
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedConversation(null)} className="text-lime-400">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-white font-medium text-sm">
              {person.person.name} ↔ {conv.otherPerson.name}
            </p>
            <Badge className={`${sourceLabels[conv.source]?.color || 'bg-slate-500'} text-white text-[10px]`}>
              {sourceLabels[conv.source]?.label || conv.source}
            </Badge>
          </div>
          <AlertDialog>
            <Button
              variant="outline"
              size="sm"
              className="border-red-600 text-red-400 hover:bg-red-600/20"
              onClick={() => setConversationToDelete(conv.messages.map(m => m.id))}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Elimina tutto
            </Button>
          </AlertDialog>
        </div>

        {/* Messaggi stile chat con fumetti */}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto px-2 py-3 bg-slate-950 rounded-lg">
          {conv.messages.map(msg => {
            const isFromPerson = msg.from_email === selectedPerson;
            const sender = peopleMap[msg.from_email] || { name: msg.from_email, type: 'sconosciuto' };
            // Se la persona selezionata è un utente, i suoi messaggi vanno a destra (lime)
            // Se è un consulente, i suoi messaggi vanno a sinistra (blue)
            const personIsConsultant = person.person.type === 'consulente';
            const isRightSide = personIsConsultant ? !isFromPerson : isFromPerson;
            
            return (
              <div 
                key={msg.id} 
                className={`flex ${isRightSide ? 'justify-end' : 'justify-start'} group`}
              >
                <div className={`flex items-end gap-1 max-w-[80%] ${isRightSide ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isRightSide ? 'bg-lime-400/30' : 'bg-blue-500/30'
                  }`}>
                    {isRightSide ? (
                      <User className="w-3.5 h-3.5 text-lime-400" />
                    ) : (
                      <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                    )}
                  </div>
                  
                  {/* Fumetto messaggio */}
                  <div className="relative">
                    <div className={`rounded-2xl px-3 py-2 ${
                      isRightSide 
                        ? 'bg-lime-400 text-slate-900 rounded-br-sm' 
                        : 'bg-blue-500 text-white rounded-bl-sm'
                    }`}>
                      {/* Nome mittente */}
                      <p className={`text-[10px] font-bold mb-1 ${
                        isRightSide ? 'text-slate-700' : 'text-blue-100'
                      }`}>
                        {sender.name} {isRightSide ? '(Azienda)' : '(Consulente)'}
                      </p>
                      
                      {/* Contenuto */}
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      
                      {/* Allegati */}
                      {msg.attachments?.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {msg.attachments.map((att, i) => (
                            <a 
                              key={i} 
                              href={att.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className={`text-xs underline ${isRightSide ? 'text-slate-700' : 'text-blue-100'}`}
                            >
                              📎 {att.name}
                            </a>
                          ))}
                        </div>
                      )}
                      
                      {/* Ora e stato + elimina inline */}
                      <div className={`flex items-center justify-between gap-2 mt-1 ${
                        isRightSide ? 'text-slate-600' : 'text-blue-200'
                      }`}>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px]">
                            {format(new Date(msg.created_date), 'HH:mm', { locale: it })}
                            {new Date(msg.created_date).toDateString() !== new Date().toDateString() && (
                              <span className="ml-1">• {format(new Date(msg.created_date), 'd MMM', { locale: it })}</span>
                            )}
                          </span>
                          {/* Spunte stile WhatsApp */}
                          {msg.is_read ? (
                            <CheckCheck className="w-4 h-4 text-fuchsia-500" strokeWidth={3} />
                          ) : (
                            <Check className={`w-4 h-4 ${isRightSide ? 'text-slate-600' : 'text-blue-200'}`} strokeWidth={2.5} />
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => { 
                              e.preventDefault();
                              e.stopPropagation(); 
                              setMessageToDelete(msg); 
                            }}
                            className={`opacity-50 hover:opacity-100 transition-opacity ${
                              isRightSide ? 'text-slate-700 hover:text-red-600' : 'text-blue-200 hover:text-red-300'
                            }`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dialog elimina messaggio - nella vista chat */}
        {messageToDelete && (
          <AlertDialog open={true} onOpenChange={(open) => !open && setMessageToDelete(null)}>
            <AlertDialogContent className="bg-slate-800 border-slate-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Eliminare questo messaggio?</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400">
                  Questa azione è permanente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600">Annulla</AlertDialogCancel>
                <AlertDialogAction 
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => deleteMessageMutation.mutate(messageToDelete.id)}
                >
                  Elimina
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Dialog elimina conversazione - nella vista chat */}
        {conversationToDelete && (
          <AlertDialog open={true} onOpenChange={(open) => !open && setConversationToDelete(null)}>
            <AlertDialogContent className="bg-slate-800 border-slate-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Eliminare tutti i messaggi?</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400">
                  Verranno eliminati {conversationToDelete?.length || 0} messaggi. Questa azione è permanente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600">Annulla</AlertDialogCancel>
                <AlertDialogAction 
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => deleteConversationMutation.mutate(conversationToDelete)}
                >
                  Elimina tutto
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    );
  }

  // Vista conversazioni di una persona
  if (selectedPerson) {
    const person = messagesByPerson[selectedPerson];
    
    if (!person) return null;
    
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedPerson(null); setSourceFilter('all'); }} className="text-lime-400">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-white font-medium">{person.person.name}</p>
            <div className="flex items-center gap-2">
              <Badge className={`${person.person.type === 'consulente' ? 'bg-blue-500' : 'bg-lime-500'} text-white text-[10px]`}>
                {person.person.type === 'consulente' ? '👔 Consulente' : '👤 Utente'}
              </Badge>
              {person.person.zona && (
                <Badge className="bg-slate-600 text-slate-300 text-[10px]">
                  <MapPin className="w-3 h-3 mr-1" />
                  {person.person.zona}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Filtro source */}
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-8 text-xs">
            <SelectValue placeholder="Filtra per sezione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le sezioni</SelectItem>
            {Object.entries(sourceLabels).map(([key, val]) => (
              <SelectItem key={key} value={key}>{val.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Lista conversazioni */}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">Nessuna conversazione</p>
          ) : (
            filteredConversations.map(([convKey, conv]) => (
              <Card 
                key={convKey} 
                className="bg-slate-800 border-slate-700 cursor-pointer hover:bg-slate-700"
                onClick={() => setSelectedConversation(convKey)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      conv.otherPerson.type === 'consulente' ? 'bg-blue-500/20' : 'bg-lime-400/20'
                    }`}>
                      {conv.otherPerson.type === 'consulente' ? (
                        <Briefcase className="w-5 h-5 text-blue-400" />
                      ) : (
                        <User className="w-5 h-5 text-lime-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium text-sm truncate">{conv.otherPerson.name}</p>
                        {conv.unreadCount > 0 && (
                          <Badge className="bg-red-500 text-white text-[10px]">{conv.unreadCount}</Badge>
                        )}
                      </div>
                      <Badge className={`${sourceLabels[conv.source]?.color || 'bg-slate-500'} text-white text-[10px] mt-1`}>
                        {sourceLabels[conv.source]?.label || conv.source}
                      </Badge>
                      <p className="text-slate-400 text-xs truncate mt-1">{conv.lastMessage?.content}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="bg-slate-700 text-lime-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          💬 {conv.messages.length} messaggi
                        </span>
                        <span className="text-slate-500 text-[10px]">
                          • {format(new Date(conv.lastMessage?.created_date), 'd MMM', { locale: it })}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  // Vista principale: lista persone
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-lime-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-white font-bold text-lg">Gestione Messaggi</h2>
      </div>

      {/* Filtri */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Cerca utente o consulente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white pl-9 h-9 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-8 text-xs">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              <SelectItem value="utenti">👤 Utenti</SelectItem>
              <SelectItem value="consulenti">👔 Consulenti</SelectItem>
            </SelectContent>
          </Select>
          <Select value={zoneFilter} onValueChange={setZoneFilter}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-8 text-xs">
              <SelectValue placeholder="Zona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le zone</SelectItem>
              {zones.map(z => (
                <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-lime-400" />
            <div>
              <p className="text-white font-bold text-lg">{filteredPeople.length}</p>
              <p className="text-slate-400 text-[10px]">Persone con messaggi</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-3 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-lime-400" />
            <div>
              <p className="text-white font-bold text-lg">{allMessages.length}</p>
              <p className="text-slate-400 text-[10px]">Messaggi totali</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista persone */}
      {loadingMessages ? (
        <div className="text-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-lime-400 border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {filteredPeople.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">Nessun risultato</p>
          ) : (
            filteredPeople.map(person => (
              <Card 
                key={person.email} 
                className="bg-slate-800 border-slate-700 cursor-pointer hover:bg-slate-700"
                onClick={() => setSelectedPerson(person.email)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      person.person.type === 'consulente' ? 'bg-blue-500/20' : 'bg-lime-400/20'
                    }`}>
                      {person.person.type === 'consulente' ? (
                        <Briefcase className="w-5 h-5 text-blue-400" />
                      ) : (
                        <User className="w-5 h-5 text-lime-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium text-sm truncate">{person.person.name}</p>
                        {person.unreadCount > 0 && (
                          <Badge className="bg-red-500 text-white text-[10px]">{person.unreadCount} nuovi</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`${person.person.type === 'consulente' ? 'bg-blue-500/20 text-blue-400' : 'bg-lime-500/20 text-lime-400'} text-[10px]`}>
                          {person.person.type === 'consulente' ? '👔 Consulente' : '👤 Utente'}
                        </Badge>
                        {person.person.zona && (
                          <span className="text-slate-500 text-[10px]">{person.person.zona}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-slate-400 text-[10px]">{person.conversationsCount} conversazioni</span>
                        <span className="bg-slate-700 text-lime-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          💬 {person.totalMessages} messaggi totali
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Dialog elimina messaggio */}
      {messageToDelete && (
        <AlertDialog open={true} onOpenChange={(open) => !open && setMessageToDelete(null)}>
          <AlertDialogContent className="bg-slate-800 border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Eliminare questo messaggio?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                Questa azione è permanente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600">Annulla</AlertDialogCancel>
              <AlertDialogAction 
                className="bg-red-600 hover:bg-red-700"
                onClick={() => deleteMessageMutation.mutate(messageToDelete.id)}
              >
                Elimina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Dialog elimina conversazione */}
      <AlertDialog open={!!conversationToDelete} onOpenChange={() => setConversationToDelete(null)}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Eliminare tutti i messaggi?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Verranno eliminati {conversationToDelete?.length || 0} messaggi. Questa azione è permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600">Annulla</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteConversationMutation.mutate(conversationToDelete)}
            >
              Elimina tutto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}