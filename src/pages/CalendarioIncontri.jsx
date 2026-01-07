import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar, MapPin, Clock, Users, Check, X, Plus, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';

export default function CalendarioIncontri() {
  const [user, setUser] = useState(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '', time: '', location: '' });
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, []);

  const isAdmin = user?.role === 'admin';

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-date'),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', user?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: user?.email, is_read: false }),
    enabled: !!user?.email,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData) => {
      const event = await base44.entities.Event.create({
        ...eventData,
        participants: [],
        declined: []
      });
      
      // Create notifications for all users
      if (isAdmin && allUsers.length > 0) {
        const notifications = allUsers.map(u => ({
          user_email: u.email,
          type: 'event',
          title: 'Nuovo Incontro',
          content: `È stato programmato un nuovo incontro: ${eventData.title}`,
          reference_id: event.id
        }));
        await base44.entities.Notification.bulkCreate(notifications);
      }
      
      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowAddEvent(false);
      setNewEvent({ title: '', description: '', date: '', time: '', location: '' });
    }
  });

  const respondToEventMutation = useMutation({
    mutationFn: async ({ eventId, response, event }) => {
      const participants = event.participants || [];
      const declined = event.declined || [];
      
      let updatedParticipants = participants.filter(e => e !== user.email);
      let updatedDeclined = declined.filter(e => e !== user.email);
      
      if (response === 'accept') {
        updatedParticipants.push(user.email);
      } else {
        updatedDeclined.push(user.email);
      }
      
      return base44.entities.Event.update(eventId, {
        participants: updatedParticipants,
        declined: updatedDeclined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  });

  const getUserResponse = (event) => {
    if (!user?.email) return null;
    if (event.participants?.includes(user.email)) return 'accepted';
    if (event.declined?.includes(user.email)) return 'declined';
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Home')} className="text-lime-400">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-white text-xl font-bold">Calendario Incontri</h1>
          </div>
          
          {isAdmin && (
            <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
              <DialogTrigger asChild>
                <Button className="bg-lime-400 hover:bg-lime-500 text-slate-900">
                  <Plus className="w-5 h-5 mr-1" />
                  Nuovo
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Nuovo Incontro</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <Input
                    placeholder="Titolo"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                  <Textarea
                    placeholder="Descrizione"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                  <Input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                  <Input
                    type="time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                  <Input
                    placeholder="Luogo"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                  <Button 
                    onClick={() => createEventMutation.mutate(newEvent)}
                    disabled={createEventMutation.isPending}
                    className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
                  >
                    {createEventMutation.isPending ? 'Creazione...' : 'Crea Incontro'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Nessun incontro programmato</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => {
              const userResponse = getUserResponse(event);
              const participantCount = event.participants?.length || 0;
              
              return (
                <Card key={event.id} className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-lg">{event.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {event.description && (
                      <p className="text-slate-400 text-sm">{event.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2 text-lime-400">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(event.date), 'd MMMM yyyy', { locale: it })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-lime-400">
                        <Clock className="w-4 h-4" />
                        <span>{event.time}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                      <MapPin className="w-4 h-4 text-lime-400" />
                      <span>{event.location}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                      <Users className="w-4 h-4 text-lime-400" />
                      <span>{participantCount} partecipanti confermati</span>
                    </div>
                    
                    {!isAdmin && (
                      <div className="flex gap-3 pt-3 border-t border-slate-700">
                        <Button
                          variant={userResponse === 'accepted' ? 'default' : 'outline'}
                          className={userResponse === 'accepted' 
                            ? 'flex-1 bg-green-600 hover:bg-green-700' 
                            : 'flex-1 border-green-600 text-green-400 hover:bg-green-600/20'}
                          onClick={() => respondToEventMutation.mutate({ eventId: event.id, response: 'accept', event })}
                          disabled={respondToEventMutation.isPending}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Partecipo
                        </Button>
                        <Button
                          variant={userResponse === 'declined' ? 'default' : 'outline'}
                          className={userResponse === 'declined' 
                            ? 'flex-1 bg-red-600 hover:bg-red-700' 
                            : 'flex-1 border-red-600 text-red-400 hover:bg-red-600/20'}
                          onClick={() => respondToEventMutation.mutate({ eventId: event.id, response: 'decline', event })}
                          disabled={respondToEventMutation.isPending}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Non partecipo
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav currentPage="CalendarioIncontri" unreadMessages={messages.length} />
    </div>
  );
}