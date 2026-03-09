import React, { useState } from 'react';
import { Phone, Check, Video, Building2, Briefcase, Calendar, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';

const AVATAR_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/e2d0a3f74_77e2d0ae-8e3f-4761-9628-f7e9e7372e6f-removebg-preview.png";

export default function ConsultantCard({
  consultant,
  category,
  assignment,
  availableConsultations,
  completedBookings,
  isRequested,
  activeBooking,
  consultationMessage,
  meetingPreference,
  meetingLink,
  onMessageChange,
  onPreferenceChange,
  onLinkChange,
  onSubmit,
  isSubmitting,
}) {
  const [validationError, setValidationError] = useState('');
  const hasAvailable = availableConsultations > 0;

  const handleSubmit = () => {
    if (!consultationMessage?.trim() || !meetingPreference) {
      setValidationError('Completa tutti i campi e seleziona la modalità di incontro');
      return;
    }
    setValidationError('');
    onSubmit();
  };

  return (
    <div className="flex items-start gap-1 py-6 border-b border-slate-700/50 last:border-b-0 overflow-visible">
      {/* Avatar a sinistra */}
      <div className="flex-shrink-0 flex flex-col items-center pt-1 w-24">
        <img 
          src={AVATAR_URL}
          alt="Consulente"
          className="w-40 h-40 object-contain drop-shadow-[0_4px_15px_rgba(212,175,55,0.3)] -mx-8"
        />
        {/* Badge disponibilità sotto avatar */}
        <div className={`mt-2 rounded-full px-2.5 py-0.5 text-xs font-bold ${hasAvailable ? 'bg-lime-400/20 text-lime-400' : 'bg-red-500/20 text-red-400'}`}>
          {availableConsultations} disp.
        </div>
        {/* Pulsante Chiama sotto disponibilità */}
        {consultant.phone && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2 bg-slate-700 hover:bg-slate-600 text-white border-slate-600 h-7 text-xs px-3"
            onClick={() => window.open(`tel:${consultant.phone}`)}
          >
            <Phone className="w-3 h-3 mr-1" />
            Chiama
          </Button>
        )}
      </div>

      {/* Contenuto a destra */}
      <div className="flex-1 min-w-0">
        {/* Header: categoria + stato */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="text-lime-400 font-semibold text-sm truncate">{category}</h3>
          {isRequested && (
            <Badge className="bg-green-600 text-xs flex-shrink-0">
              <Check className="w-3 h-3 mr-1" />
              Inviata
            </Badge>
          )}
        </div>

        {/* Info consulente compatte */}
        <div className="flex items-center gap-2 mb-1">
          {consultant.logo_url && (
            <img 
              src={consultant.logo_url} 
              alt={consultant.name}
              className="w-8 h-8 object-contain rounded bg-slate-800 border border-slate-700 flex-shrink-0"
            />
          )}
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{consultant.name}</p>
            <p className="text-slate-400 text-xs truncate">{consultant.referente || ''}</p>
          </div>
        </div>

        {/* Stat riga: completate + appuntamento */}
        <div className="flex items-center gap-3 text-xs mb-2">
          <span className="text-green-400">{completedBookings} completate</span>
          {activeBooking?.scheduled_date && (
            <span className="text-blue-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(activeBooking.scheduled_date).toLocaleString('it-IT', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
              })}
            </span>
          )}
        </div>

        {/* Se non disponibile */}
        {!hasAvailable ? (
          <p className="text-slate-500 text-xs italic">Nessuna consulenza gratuita disponibile</p>
        ) : (
          <>
              <div className="space-y-2">
                <Textarea
                  placeholder="Oggetto della consulenza..."
                  value={consultationMessage || ''}
                  onChange={(e) => onMessageChange(e.target.value)}
                  disabled={isRequested}
                  className="bg-slate-900 border-slate-600 text-white min-h-[60px] text-sm"
                  rows={2}
                />

                {/* Modalità incontro compatta */}
                <RadioGroup
                  value={meetingPreference || ''}
                  onValueChange={onPreferenceChange}
                  disabled={isRequested}
                  className="flex flex-col gap-2"
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="online" id={`o-${consultant.id}`} className="border-lime-400 text-lime-400 data-[state=checked]:bg-lime-400 w-3.5 h-3.5" />
                    <Label htmlFor={`o-${consultant.id}`} className="text-white text-xs flex items-center gap-1 cursor-pointer">
                      <Video className="w-3 h-3 text-blue-400" /> Online
                    </Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem 
                      value="sede_azienda" 
                      id={`sa-${consultant.id}`} 
                      className="border-lime-400 text-lime-400 data-[state=checked]:bg-lime-400 w-3.5 h-3.5" 
                      disabled={consultant.sede_azienda_disabled} 
                    />
                    <Label htmlFor={`sa-${consultant.id}`} className={`text-xs flex items-center gap-1 cursor-pointer ${consultant.sede_azienda_disabled ? 'text-slate-500' : 'text-white'}`}>
                      <Building2 className="w-3 h-3 text-amber-400" /> Sede azienda
                    </Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="sede_consulente" id={`sc-${consultant.id}`} className="border-lime-400 text-lime-400 data-[state=checked]:bg-lime-400 w-3.5 h-3.5" />
                    <Label htmlFor={`sc-${consultant.id}`} className="text-white text-xs flex items-center gap-1 cursor-pointer">
                      <Briefcase className="w-3 h-3 text-purple-400" /> Sede consulente
                    </Label>
                  </div>
                </RadioGroup>

                {meetingPreference === 'sede_azienda' && !consultant.sede_azienda_disabled && consultant.rimborso_carburante > 0 && (
                  <p className="text-amber-400 text-xs">
                    ⚠️ Rimborso carburante: €{consultant.rimborso_carburante}
                  </p>
                )}

                {meetingPreference === 'online' && (
                  <Input
                    placeholder="Link call (Meet, Zoom...)"
                    value={meetingLink || ''}
                    onChange={(e) => onLinkChange(e.target.value)}
                    disabled={isRequested}
                    className="bg-slate-900 border-slate-600 text-white text-sm h-8"
                  />
                )}

                {/* Pulsante Invia */}
                <div className="pt-1 flex justify-end">
                  <Button
                    size="sm"
                    className="bg-lime-400 hover:bg-lime-500 text-slate-900 border-0 h-7 text-xs px-3"
                    onClick={handleSubmit}
                    disabled={isRequested || isSubmitting}
                  >
                    <Send className="w-3 h-3 mr-1" />
                    Invia
                  </Button>
                </div>
                {validationError && (
                  <p className="text-red-400 text-xs mt-1">{validationError}</p>
                )}
              </div>
          </>
        )}
      </div>
    </div>
  );
}