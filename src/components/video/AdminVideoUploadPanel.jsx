import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Youtube, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

function getYouTubeId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export default function AdminVideoUploadPanel({ companyUsers, allUsers }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', youtube_url: '', selected_user_id: '', company_name: '', company_email: '' });
  const [success, setSuccess] = useState(false);
  const queryClient = useQueryClient();

  const youtubeId = getYouTubeId(form.youtube_url);

  const handleSelectCompany = (userId) => {
    const user = companyUsers.find(u => u.id === userId);
    if (user) {
      setForm(prev => ({ ...prev, selected_user_id: userId, company_name: user.company_name, company_email: user.email }));
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const video = await base44.entities.Video.create({
        title: form.title,
        company_name: form.company_name,
        youtube_url: form.youtube_url,
        company_email: form.company_email,
        likes: []
      });
      // Notifica tutti gli utenti
      if (allUsers.length > 0) {
        const notifications = allUsers.map(u => ({
          user_email: u.email,
          type: 'video',
          title: 'Nuova Video Intervista',
          content: `È stata caricata una nuova video intervista: ${form.company_name}`,
          reference_id: video.id
        }));
        await base44.entities.Notification.bulkCreate(notifications);
      }
      return video;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      setSuccess(true);
      setTimeout(() => {
        setForm({ title: '', youtube_url: '', selected_user_id: '', company_name: '', company_email: '' });
        setSuccess(false);
        setOpen(false);
      }, 1500);
    }
  });

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="bg-[#d4af37] hover:bg-[#b8960c] text-slate-900">
        <Plus className="w-5 h-5 mr-1" />
        Carica Video
      </Button>
    );
  }

  return (
    <Card className="bg-slate-800 border-[#d4af37]/40 mb-4">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-500" />
            <h3 className="text-white font-bold text-sm">Carica Video da YouTube</h3>
          </div>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* URL YouTube + Anteprima */}
        <div>
          <label className="text-slate-400 text-xs font-medium mb-1 block">Link YouTube *</label>
          <Input
            placeholder="https://www.youtube.com/watch?v=..."
            value={form.youtube_url}
            onChange={(e) => setForm(prev => ({ ...prev, youtube_url: e.target.value }))}
            className="bg-slate-900 border-slate-700 text-white"
          />
        </div>

        {youtubeId && (
          <div className="rounded-xl overflow-hidden border border-slate-700">
            <div className="relative aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}`}
                title="Anteprima"
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="bg-green-500/20 border-t border-green-500/30 px-3 py-1.5 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-xs font-medium">Video YouTube riconosciuto</span>
            </div>
          </div>
        )}

        {form.youtube_url && !youtubeId && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
            <X className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-xs">URL non valido. Incolla un link YouTube valido.</span>
          </div>
        )}

        {/* Titolo */}
        <div>
          <label className="text-slate-400 text-xs font-medium mb-1 block">Titolo Video *</label>
          <Input
            placeholder="es. Intervista alla Pizzeria Da Mario"
            value={form.title}
            onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
            className="bg-slate-900 border-slate-700 text-white"
          />
        </div>

        {/* Selezione Azienda */}
        <div>
          <label className="text-slate-400 text-xs font-medium mb-1 block">Azienda *</label>
          <Select value={form.selected_user_id} onValueChange={handleSelectCompany}>
            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
              <SelectValue placeholder="Seleziona azienda..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {companyUsers.map(u => (
                <SelectItem key={u.id} value={u.id} className="text-white hover:bg-slate-700">
                  {u.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.company_email && (
            <p className="text-slate-500 text-xs mt-1">Email: {form.company_email}</p>
          )}
        </div>

        {/* Successo */}
        {success && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg px-4 py-3 text-center">
            <Check className="w-6 h-6 text-green-400 mx-auto mb-1" />
            <p className="text-green-400 font-medium text-sm">Video caricato con successo!</p>
          </div>
        )}

        {/* Submit */}
        {!success && (
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !form.title || !form.company_name || !youtubeId}
            className="w-full bg-[#d4af37] hover:bg-[#b8960c] text-slate-900 font-bold"
          >
            {createMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Caricamento...</>
            ) : (
              <><Youtube className="w-4 h-4 mr-2" />Pubblica Video</>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}