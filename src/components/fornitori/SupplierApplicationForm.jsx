import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, AlertTriangle, User, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SupplierApplicationForm({ request, user, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    message: '',
    phone: user?.cellulare_referente || user?.phone || ''
  });
  const queryClient = useQueryClient();

  const applyMutation = useMutation({
    mutationFn: async () => {
      const conversationId = [user.email, request.author_email].sort().join('_');
      
      // Crea il messaggio di candidatura
      await base44.entities.Message.create({
        from_email: user.email,
        to_email: request.author_email,
        content: `📋 CANDIDATURA per richiesta "${request.service_type}"\n\n👤 ${user.company_name || user.full_name}\n📧 ${user.email}\n📱 ${formData.phone}\n\n${formData.message}`,
        conversation_id: conversationId,
        is_read: false,
        source: 'fornitori_candidatura',
        source_reference: request.id
      });

      // Crea notifica per l'autore della richiesta
      await base44.entities.Notification.create({
        user_email: request.author_email,
        type: 'message',
        title: 'Nuova candidatura ricevuta',
        content: `${user.company_name || user.full_name} si è candidato per "${request.service_type}"`,
        reference_id: request.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-applications'] });
      onSuccess();
    }
  });

  return (
    <div className="space-y-4">
      {/* Warning - Non anonimo */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 text-sm font-medium">Candidatura non anonima</p>
            <p className="text-slate-400 text-xs mt-1">
              L'azienda che ha inserito la richiesta vedrà i tuoi dati di contatto e chi sei.
            </p>
          </div>
        </div>
      </div>

      {/* Info richiesta */}
      <div className="bg-slate-900 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-4 h-4 text-lime-400" />
          <span className="text-slate-400 text-xs">Richiesta:</span>
        </div>
        <p className="text-white font-medium">{request?.service_type}</p>
        <p className="text-slate-400 text-sm mt-1 line-clamp-2">{request?.problem_to_solve}</p>
      </div>

      {/* Info candidato */}
      <div className="bg-slate-900 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4 text-lime-400" />
          <span className="text-slate-400 text-xs">Ti candidi come:</span>
        </div>
        <p className="text-white font-medium">{user?.company_name || user?.full_name}</p>
        <p className="text-slate-400 text-sm">{user?.email}</p>
      </div>

      {/* Telefono */}
      <div>
        <Label className="text-slate-300 text-sm">Telefono di contatto *</Label>
        <Input
          placeholder="Il tuo numero di telefono"
          value={formData.phone}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
          className="bg-slate-900 border-slate-700 text-white mt-1"
        />
      </div>

      {/* Messaggio */}
      <div>
        <Label className="text-slate-300 text-sm">Presentati e descrivi come puoi aiutare *</Label>
        <Textarea
          placeholder="Descrivi la tua esperienza, come puoi risolvere il problema e perché sei la scelta giusta..."
          value={formData.message}
          onChange={(e) => setFormData({...formData, message: e.target.value})}
          className="bg-slate-900 border-slate-700 text-white mt-1"
          rows={4}
        />
      </div>

      {/* Pulsanti */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          className="flex-1 border-slate-600 text-slate-400 hover:text-white"
          onClick={onClose}
        >
          Annulla
        </Button>
        <Button
          onClick={() => applyMutation.mutate()}
          disabled={applyMutation.isPending || !formData.message.trim() || !formData.phone.trim()}
          className="flex-1 bg-lime-400 hover:bg-lime-500 text-slate-900"
        >
          {applyMutation.isPending ? (
            <div className="animate-spin w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full" />
          ) : (
            <>
              <Send className="w-4 h-4 mr-1" />
              Invia Candidatura
            </>
          )}
        </Button>
      </div>
    </div>
  );
}