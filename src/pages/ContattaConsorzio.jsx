import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Send, Phone, Mail, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';

export default function ContattaConsorzio() {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

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

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', user?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: user?.email, is_read: false }),
    enabled: !!user?.email,
  });

  // Get admin users to send messages to
  const { data: admins = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.role === 'admin');
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      // Send message to all admins
      for (const admin of admins) {
        const conversationId = [user.email, admin.email].sort().join('-');
        await base44.entities.Message.create({
          from_email: user.email,
          to_email: admin.email,
          content: `[Messaggio al Consorzio]\n\n${message}`,
          conversation_id: conversationId,
          source: 'contatta_consorzio',
          source_reference: 'Contatta Consorzio'
        });
      }
    },
    onSuccess: () => {
      setSent(true);
      setMessage('');
      setTimeout(() => setSent(false), 3000);
    }
  });

  return (
    <div className="min-h-screen pb-64" style={{ backgroundColor: 'var(--app-bg)' }}>
      <main className="px-4 pt-16 pb-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-white text-xl font-bold">Contatta il Consorzio</h1>
        </div>

        {/* Contact Info */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-lime-400">Informazioni di Contatto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-white">
              <Phone className="w-5 h-5 text-lime-400" />
              <span>+39 XXX XXX XXXX</span>
            </div>
            <div className="flex items-center gap-3 text-white">
              <Mail className="w-5 h-5 text-lime-400" />
              <span>info@consorzio.it</span>
            </div>
            <div className="flex items-center gap-3 text-white">
              <MapPin className="w-5 h-5 text-lime-400" />
              <span>Via Roma, 1 - 00100 Roma</span>
            </div>
          </CardContent>
        </Card>

        {/* Message Form */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lime-400">Invia un Messaggio</CardTitle>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-white font-medium">Messaggio inviato!</p>
                <p className="text-slate-400 text-sm">Ti risponderemo al più presto</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Textarea
                  placeholder="Scrivi il tuo messaggio al consorzio..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white min-h-[150px]"
                />
                <Button 
                  onClick={() => sendMessageMutation.mutate()}
                  disabled={sendMessageMutation.isPending || !message.trim()}
                  className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
                >
                  {sendMessageMutation.isPending ? 'Invio...' : 'Invia Messaggio'}
                  <Send className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <BottomNav currentPage="ContattaConsorzio" unreadMessages={messages.length} />
    </div>
  );
}