import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, Loader2, Star, Globe, Mail, Phone, MapPin, 
  Shield, CheckCircle, Send, AlertTriangle, ExternalLink,
  ChevronDown, ChevronUp, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

function AffinabilityBadge({ score }) {
  if (score >= 8) return <Badge className="bg-green-500/20 text-green-400 text-xs">Molto affidabile</Badge>;
  if (score >= 6) return <Badge className="bg-lime-500/20 text-lime-400 text-xs">Affidabile</Badge>;
  if (score >= 4) return <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Da verificare</Badge>;
  return <Badge className="bg-red-500/20 text-red-400 text-xs">Rischioso</Badge>;
}

function SupplierCard({ supplier, index, selected, onToggle, emailSent }) {
  const [expanded, setExpanded] = useState(false);
  const hasEmail = supplier.email && supplier.email !== 'non_trovata';

  return (
    <div className={`bg-slate-800 rounded-xl border transition-all ${
      selected ? 'border-lime-400/50 bg-slate-800/80' : 'border-slate-700'
    } ${emailSent ? 'opacity-70' : ''}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          {!emailSent && hasEmail && (
            <div className="pt-1">
              <Checkbox
                checked={selected}
                onCheckedChange={() => onToggle(index)}
                className="border-slate-600 data-[state=checked]:bg-lime-400 data-[state=checked]:border-lime-400"
              />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-white font-medium text-sm">{supplier.name}</h4>
                {supplier.city && (
                  <p className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" /> {supplier.city}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <AffinabilityBadge score={supplier.affidabilita_score} />
                {emailSent && (
                  <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                    <Send className="w-3 h-3 mr-1" /> Inviata
                  </Badge>
                )}
              </div>
            </div>

            {supplier.description && (
              <p className="text-slate-400 text-xs mt-1.5">{supplier.description}</p>
            )}

            {/* Rating and reviews */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {supplier.rating > 0 && (
                <span className="text-yellow-400 text-xs flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" /> {supplier.rating.toFixed(1)}
                  {supplier.reviews_count > 0 && <span className="text-slate-500">({supplier.reviews_count})</span>}
                </span>
              )}
              {supplier.years_active > 0 && (
                <span className="text-slate-500 text-xs">{supplier.years_active} anni</span>
              )}
              <span className="text-slate-600 text-xs">
                Affidabilità: {supplier.affidabilita_score}/10
              </span>
            </div>

            {/* Expand/collapse details */}
            <button 
              onClick={() => setExpanded(!expanded)} 
              className="text-slate-500 text-xs mt-2 flex items-center gap-1 hover:text-lime-400"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Meno dettagli' : 'Più dettagli'}
            </button>

            {expanded && (
              <div className="mt-3 space-y-2 bg-slate-900 rounded-lg p-3">
                {supplier.affidabilita_reason && (
                  <p className="text-slate-400 text-xs">
                    <span className="text-slate-500 font-medium">Valutazione:</span> {supplier.affidabilita_reason}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {supplier.website && (
                    <a href={supplier.website} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-cyan-400 flex items-center gap-1 hover:underline">
                      <Globe className="w-3 h-3" /> Sito web <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {hasEmail && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {supplier.email}
                    </span>
                  )}
                  {supplier.phone && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {supplier.phone}
                    </span>
                  )}
                </div>
                {!hasEmail && (
                  <div className="flex items-center gap-2 text-amber-400 text-xs">
                    <AlertTriangle className="w-3 h-3" />
                    Email non trovata - non contattabile automaticamente
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SupplierSearchResults({ request, onRefresh }) {
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const queryClient = useQueryClient();
  const suppliers = request.found_suppliers || [];
  const hasResults = suppliers.length > 0;
  const isSearching = request.status === 'ricerca_in_corso';

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: () => base44.functions.invoke('searchSuppliers', { request_id: request.id }),
    onSuccess: (res) => {
      toast.success(`Trovati ${res.data?.suppliers_count || 0} fornitori!`);
      onRefresh();
    },
    onError: (err) => {
      toast.error('Errore nella ricerca: ' + (err?.response?.data?.error || err.message));
    }
  });

  // Contact mutation
  const contactMutation = useMutation({
    mutationFn: () => base44.functions.invoke('contactSuppliers', {
      request_id: request.id,
      selected_supplier_indices: Array.from(selectedIndices)
    }),
    onSuccess: (res) => {
      const data = res.data;
      toast.success(`Email inviate a ${data?.sent_count || 0} fornitori su ${data?.total_selected || 0} selezionati`);
      setSelectedIndices(new Set());
      onRefresh();
    },
    onError: (err) => {
      toast.error('Errore invio email: ' + (err?.response?.data?.error || err.message));
    }
  });

  const toggleSelect = (index) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAll = () => {
    const contactable = suppliers
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.email && s.email !== 'non_trovata' && !s.quote_sent);
    if (selectedIndices.size === contactable.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(contactable.map(({ i }) => i)));
    }
  };

  const contactableCount = suppliers.filter(s => s.email && s.email !== 'non_trovata' && !s.quote_sent).length;
  const alreadySent = suppliers.filter(s => s.quote_sent).length;

  return (
    <div className="space-y-4">
      {/* Search button if no results yet */}
      {!hasResults && !isSearching && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 text-center space-y-4">
          <div className="w-14 h-14 bg-lime-400/10 rounded-full flex items-center justify-center mx-auto">
            <Search className="w-7 h-7 text-lime-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Avvia ricerca fornitori</h3>
            <p className="text-slate-400 text-sm mt-1">
              L'AI cercherà fornitori reali per "<span className="text-lime-400">{request.category}</span>" 
              {request.locality && ` nella zona di ${request.locality}`}
            </p>
          </div>
          <Button 
            onClick={() => searchMutation.mutate()}
            disabled={searchMutation.isPending}
            className="w-full bg-lime-400 text-slate-900 hover:bg-lime-500 font-semibold"
          >
            {searchMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Ricerca in corso...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Cerca fornitori con AI</>
            )}
          </Button>
          <p className="text-slate-600 text-xs">La ricerca potrebbe richiedere 15-30 secondi</p>
        </div>
      )}

      {/* Loading state */}
      {(isSearching || searchMutation.isPending) && !hasResults && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-lime-400 mx-auto" />
          <p className="text-white font-medium">Ricerca fornitori in corso...</p>
          <p className="text-slate-400 text-sm">L'AI sta cercando fornitori reali, verificando recensioni e contatti</p>
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-sm">
                {suppliers.length} fornitori trovati
              </h3>
              {alreadySent > 0 && (
                <p className="text-blue-400 text-xs">{alreadySent} già contattati</p>
              )}
            </div>
            <div className="flex gap-2">
              {contactableCount > 0 && (
                <Button variant="outline" size="sm" onClick={selectAll}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs">
                  {selectedIndices.size === contactableCount ? 'Deseleziona' : 'Seleziona tutti'}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => searchMutation.mutate()}
                disabled={searchMutation.isPending}
                className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs">
                <Search className="w-3 h-3 mr-1" /> Ripeti ricerca
              </Button>
            </div>
          </div>

          {/* AI suggestions */}
          {request.ai_suggestions?.length > 0 && (
            <div className="bg-lime-400/5 border border-lime-400/20 rounded-lg p-3">
              <p className="text-lime-400 text-xs font-medium flex items-center gap-1 mb-1">
                <Sparkles className="w-3 h-3" /> Suggerimenti AI
              </p>
              <ul className="space-y-1">
                {request.ai_suggestions.map((s, i) => (
                  <li key={i} className="text-slate-400 text-xs">• {s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Anonymity reminder */}
          <div className="bg-slate-900 rounded-lg p-2.5 flex items-start gap-2">
            <Shield className="w-4 h-4 text-lime-400 mt-0.5 flex-shrink-0" />
            <p className="text-slate-400 text-xs">
              Le email saranno inviate <span className="text-lime-400 font-medium">a nome del Consorzio</span>. 
              Nessun dato della tua azienda verrà condiviso.
            </p>
          </div>

          {/* Suppliers list */}
          <div className="space-y-2">
            {suppliers.map((supplier, index) => (
              <SupplierCard
                key={index}
                supplier={supplier}
                index={index}
                selected={selectedIndices.has(index)}
                onToggle={toggleSelect}
                emailSent={supplier.quote_sent}
              />
            ))}
          </div>

          {/* Send button */}
          {selectedIndices.size > 0 && (
            <div className="sticky bottom-0 bg-slate-900 border-t border-slate-700 p-3 -mx-4 px-4 rounded-t-xl">
              <Button
                onClick={() => contactMutation.mutate()}
                disabled={contactMutation.isPending}
                className="w-full bg-lime-400 text-slate-900 hover:bg-lime-500 font-semibold"
              >
                {contactMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Invio in corso...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Invia richiesta a {selectedIndices.size} fornitori</>
                )}
              </Button>
              <p className="text-slate-600 text-xs text-center mt-1">
                Email anonima a nome del Consorzio Imprenditori
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}