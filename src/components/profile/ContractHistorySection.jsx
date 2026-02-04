import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, FileText, Trash2, ChevronRight, AlertTriangle, CheckCircle, Info, Scale, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ContractHistorySection({ user }) {
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const queryClient = useQueryClient();

  const { data: historyAnalyses = [], isLoading } = useQuery({
    queryKey: ['contract-analyses-profile', user?.email],
    queryFn: () => base44.entities.ContractAnalysis.filter({ user_email: user?.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const deleteHistoryItem = async (id) => {
    await base44.entities.ContractAnalysis.delete(id);
    queryClient.invalidateQueries({ queryKey: ['contract-analyses-profile', user?.email] });
    if (selectedAnalysis?.id === id) {
      setSelectedAnalysis(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Vista dettaglio analisi selezionata
  if (selectedAnalysis) {
    return (
      <div className="space-y-4">
        <Button
          onClick={() => setSelectedAnalysis(null)}
          variant="outline"
          className="mb-4 border-slate-600 text-slate-300"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Torna allo storico
        </Button>

        {/* Documenti caricati */}
        {selectedAnalysis.file_urls?.length > 0 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-lime-400" />
                Documenti Analizzati
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {selectedAnalysis.file_urls.map((url, idx) => {
                  const fileName = selectedAnalysis.file_names?.[idx] || `File ${idx + 1}`;
                  const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || url.includes('image');
                  return (
                    <a 
                      key={idx} 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-slate-900 border border-slate-700 rounded-lg p-2 hover:border-lime-400 transition-colors"
                    >
                      {isImage ? (
                        <div className="aspect-square rounded overflow-hidden bg-slate-800 mb-1">
                          <img src={url} alt={fileName} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="aspect-square rounded bg-slate-800 flex items-center justify-center mb-1">
                          <FileText className="w-8 h-8 text-lime-400" />
                        </div>
                      )}
                      <p className="text-white text-[10px] truncate">{fileName}</p>
                    </a>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Riepilogo */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <h3 className="text-lime-400 font-semibold mb-2 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Riepilogo
            </h3>
            <p className="text-slate-300 text-sm">{selectedAnalysis.riepilogo}</p>
            <p className="text-slate-500 text-xs mt-2">
              Analizzato il {new Date(selectedAnalysis.created_date).toLocaleDateString('it-IT')}
            </p>
          </CardContent>
        </Card>

        {/* Tipo e Parti */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <h3 className="text-white font-semibold mb-3">Informazioni Generali</h3>
            <div className="space-y-2">
              <div>
                <span className="text-slate-400 text-sm">Tipo:</span>
                <p className="text-white">{selectedAnalysis.tipo_contratto}</p>
              </div>
              <div>
                <span className="text-slate-400 text-sm">Parti coinvolte:</span>
                <ul className="text-white text-sm">
                  {selectedAnalysis.parti_coinvolte?.map((parte, i) => (
                    <li key={i}>• {parte}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="text-slate-400 text-sm">Oggetto:</span>
                <p className="text-white text-sm">{selectedAnalysis.oggetto}</p>
              </div>
              <div>
                <span className="text-slate-400 text-sm">Durata:</span>
                <p className="text-white text-sm">{selectedAnalysis.durata}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Livello di Rischio */}
        {selectedAnalysis.livello_rischio && (
          <Card className={`border ${
            selectedAnalysis.livello_rischio === 'alto' ? 'bg-red-500/20 border-red-500/50' :
            selectedAnalysis.livello_rischio === 'medio' ? 'bg-orange-500/20 border-orange-500/50' :
            'bg-green-500/20 border-green-500/50'
          }`}>
            <CardContent className="p-4">
              <h3 className={`font-semibold mb-1 flex items-center gap-2 ${
                selectedAnalysis.livello_rischio === 'alto' ? 'text-red-400' :
                selectedAnalysis.livello_rischio === 'medio' ? 'text-orange-400' :
                'text-green-400'
              }`}>
                <Scale className="w-5 h-5" />
                Livello di Rischio: {selectedAnalysis.livello_rischio.toUpperCase()}
              </h3>
            </CardContent>
          </Card>
        )}

        {/* Clausole Vessatorie */}
        {selectedAnalysis.clausole_vessatorie?.length > 0 && (
          <Card className="bg-red-500/20 border-red-500/50">
            <CardContent className="p-4">
              <h3 className="text-red-400 font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                ⚠️ Clausole Vessatorie o Sfavorevoli
              </h3>
              <div className="space-y-4">
                {selectedAnalysis.clausole_vessatorie.map((cv, i) => (
                  <div key={i} className="bg-red-900/30 rounded-lg p-3 border border-red-500/30">
                    <p className="text-white text-sm font-medium mb-1">{cv.clausola}</p>
                    <p className="text-red-200 text-sm mb-2">❌ {cv.problema}</p>
                    {cv.riferimento_legge && (
                      <p className="text-red-300 text-xs italic">📜 Rif. normativo: {cv.riferimento_legge}</p>
                    )}
                    {cv.richiede_doppia_firma && (
                      <p className="text-yellow-400 text-xs mt-1 font-semibold">✍️ Richiede doppia sottoscrizione specifica</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Consigli */}
        {selectedAnalysis.consigli?.length > 0 && (
          <Card className="bg-green-500/20 border-green-500/50">
            <CardContent className="p-4">
              <h3 className="text-green-400 font-semibold mb-2">💡 Cosa Fare Prima di Firmare</h3>
              <ul className="space-y-1">
                {selectedAnalysis.consigli.map((consiglio, i) => (
                  <li key={i} className="text-green-200 text-sm">• {consiglio}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con link a nuova analisi */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
          <History className="w-5 h-5 text-lime-400" />
          Storico Analisi Contratti
        </h2>
        <Link to={createPageUrl('AnalisiContratti')}>
          <Button className="bg-lime-400 hover:bg-lime-500 text-slate-900" size="sm">
            + Nuova Analisi
          </Button>
        </Link>
      </div>

      {historyAnalyses.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-white font-medium mb-2">Nessuna analisi salvata</h3>
            <p className="text-slate-400 text-sm mb-4">
              Non hai ancora analizzato nessun contratto. Vai nella sezione "Analisi Contratti" per iniziare!
            </p>
            <Link to={createPageUrl('AnalisiContratti')}>
              <Button className="bg-lime-400 hover:bg-lime-500 text-slate-900">
                Analizza un contratto
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {historyAnalyses.map((item) => (
            <Card key={item.id} className="bg-slate-800 border-slate-700 hover:border-lime-400/50 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  item.livello_rischio === 'alto' ? 'bg-red-500/20' :
                  item.livello_rischio === 'medio' ? 'bg-orange-500/20' :
                  'bg-green-500/20'
                }`}>
                  <FileText className={`w-5 h-5 ${
                    item.livello_rischio === 'alto' ? 'text-red-400' :
                    item.livello_rischio === 'medio' ? 'text-orange-400' :
                    'text-green-400'
                  }`} />
                </div>
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => setSelectedAnalysis(item)}
                >
                  <p className="text-white text-sm font-medium truncate">
                    {item.tipo_contratto || 'Contratto'}
                  </p>
                  <p className="text-slate-400 text-xs">
                    {new Date(item.created_date).toLocaleDateString('it-IT', { 
                      day: 'numeric', 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                    {item.file_names?.length > 0 && ` • ${item.file_names.length} file`}
                  </p>
                  {item.livello_rischio && (
                    <span className={`text-xs font-medium ${
                      item.livello_rischio === 'alto' ? 'text-red-400' :
                      item.livello_rischio === 'medio' ? 'text-orange-400' :
                      'text-green-400'
                    }`}>
                      Rischio {item.livello_rischio}
                    </span>
                  )}
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteHistoryItem(item.id); }}
                  className="text-red-400 hover:text-red-300 p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ChevronRight 
                  className="w-5 h-5 text-slate-500 cursor-pointer" 
                  onClick={() => setSelectedAnalysis(item)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}