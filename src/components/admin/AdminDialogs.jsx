import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Mail, Trash2 } from 'lucide-react';

export function AdminMessagesDialog({ open, onOpenChange, messages, onMarkRead }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Messaggi da Utenti e Consulenti</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {messages.length === 0 ? (
            <p className="text-slate-400 text-center py-8">Nessun messaggio ricevuto</p>
          ) : (
            messages.map((msg) => (
              <Card key={msg.id} className={`border ${!msg.is_read ? 'bg-lime-400/10 border-lime-400/30' : 'bg-slate-900 border-slate-700'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-white font-bold">{msg.sender_name}</h3>
                      <p className="text-slate-400 text-xs">{msg.from_email}</p>
                      <p className="text-lime-400 text-xs">{msg.sender_type === 'consulente' ? '👔 Consulente' : '👤 Utente'}</p>
                    </div>
                    {!msg.is_read && <span className="bg-lime-400 text-slate-900 text-xs font-bold px-2 py-1 rounded">NUOVO</span>}
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3 mb-3">
                    <p className="text-white text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-slate-500 text-xs">
                      {msg.created_date ? new Date(msg.created_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </p>
                    <div className="flex gap-2">
                      {!msg.is_read && (
                        <Button size="sm" variant="outline" className="border-lime-400 text-lime-400 hover:bg-lime-400/20" onClick={() => onMarkRead(msg.id)}>
                          <Eye className="w-4 h-4 mr-1" /> Segna letto
                        </Button>
                      )}
                      <Link to={createPageUrl('Messaggi')}>
                        <Button size="sm" className="bg-lime-400 hover:bg-lime-500 text-slate-900 [&>svg]:text-slate-900">
                          <Mail className="w-4 h-4 mr-1" /> Rispondi
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ConsultationMessagesDialog({ open, onOpenChange, messages }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Messaggi Consulenze (Utenti ↔ Consulenti)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {messages.length === 0 ? (
            <p className="text-slate-400 text-center py-8">Nessun messaggio tra utenti e consulenti</p>
          ) : (
            messages.map((msg) => (
              <Card key={msg.id} className={`border ${!msg.is_read ? 'bg-orange-400/10 border-orange-400/30' : 'bg-slate-900 border-slate-700'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${msg.from_type === 'consulente' ? 'bg-blue-500/20 text-blue-400' : 'bg-lime-400/20 text-lime-400'}`}>
                          {msg.from_type === 'consulente' ? '👔 Consulente' : '👤 Utente'}
                        </span>
                        <span className="text-slate-500">→</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${msg.to_type === 'consulente' ? 'bg-blue-500/20 text-blue-400' : 'bg-lime-400/20 text-lime-400'}`}>
                          {msg.to_type === 'consulente' ? '👔 Consulente' : '👤 Utente'}
                        </span>
                      </div>
                      <p className="text-white font-bold">{msg.from_name}</p>
                      <p className="text-slate-400 text-xs">→ {msg.to_name}</p>
                    </div>
                    {!msg.is_read && <span className="bg-orange-400 text-slate-900 text-xs font-bold px-2 py-1 rounded">NUOVO</span>}
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3 mb-3">
                    <p className="text-white text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-slate-500 text-xs">
                      {msg.created_date ? new Date(msg.created_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </p>
                    <Link to={`${createPageUrl('Messaggi')}?contact=${encodeURIComponent(msg.from_email)}`}>
                      <Button size="sm" className="bg-lime-400 hover:bg-lime-500 text-slate-900">
                        <Mail className="w-4 h-4 mr-1" /> Apri chat
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function VideoRequestsDialog({ open, onOpenChange, requests, onMarkRead, onDelete }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Richieste Video Interviste</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {requests.length === 0 ? (
            <p className="text-slate-400 text-center py-8">Nessuna richiesta ricevuta</p>
          ) : (
            requests.map((request) => (
              <Card key={request.id} className={`border ${request.status === 'pending' ? 'bg-lime-400/10 border-lime-400/30' : 'bg-slate-900 border-slate-700'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-white font-bold">{request.requester_name}</h3>
                      <p className="text-slate-400 text-xs">{request.requester_email}</p>
                      {request.requester_phone && <p className="text-slate-400 text-xs">{request.requester_phone}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {request.status === 'pending' && <span className="bg-lime-400 text-slate-900 text-xs font-bold px-2 py-1 rounded">NUOVO</span>}
                      <button onClick={() => { if (confirm('Eliminare questa richiesta?')) onDelete(request.id); }} className="text-red-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3 mb-3">
                    <p className="text-white text-sm whitespace-pre-wrap">{request.message}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-slate-500 text-xs">
                      {request.created_date ? new Date(request.created_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </p>
                    {request.status === 'pending' && (
                      <Button size="sm" variant="outline" className="border-lime-400 text-lime-400 hover:bg-lime-400/20" onClick={() => onMarkRead(request.id)}>
                        <Eye className="w-4 h-4 mr-1" /> Segna come letto
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}