import React from 'react';
import { Shield, Upload, FileText, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronUp, Trash2, Calendar, Loader2, Pencil, Camera, Image, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const STATO_COLORS = {
  conforme: '#22c55e',
  da_migliorare: '#f97316',
  non_conforme: '#ef4444',
  non_verificato: '#6b7280'
};

const STATO_LABELS = {
  conforme: 'Conforme',
  da_migliorare: 'Da migliorare',
  non_conforme: 'Non conforme',
  non_verificato: 'Non verificato'
};

export default function ComplianceChecklist({
  filteredNorms,
  expandedNorm,
  setExpandedNorm,
  editingNorm,
  setEditingNorm,
  uploadingDoc,
  analyzingDoc,
  handleDocumentUpload,
  removeDocument,
  updateNormMutation,
  deleteNormMutation,
  getTimelinePosition,
}) {
  return (
    <div className="space-y-3">
      {filteredNorms.map((norm) => {
        const timeline = getTimelinePosition(norm);
        const isExpanded = expandedNorm === norm.id;
        
        return (
          <Card key={norm.id} className="bg-slate-800 border-slate-700 overflow-hidden">
            <CardContent className="p-0">
              <button
                onClick={() => setExpandedNorm(isExpanded ? null : norm.id)}
                className="w-full p-4 flex items-start gap-3 text-left"
              >
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                  style={{ backgroundColor: STATO_COLORS[norm.stato] }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-white font-medium truncate">{norm.nome}</h4>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-slate-400 text-sm">{norm.categoria}</p>
                    {norm.stato_affidabilita === 'verificato' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                        <CheckCircle className="w-2.5 h-2.5" /> Verificato
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <AlertTriangle className="w-2.5 h-2.5" /> Non verificato
                      </span>
                    )}
                  </div>
                  {!isExpanded && (
                    <div className="mt-2 text-xs space-y-1">
                      <p className="text-slate-300 line-clamp-2">{norm.descrizione || 'Adempimento normativo obbligatorio'}</p>
                      {norm.riferimento_normativo && norm.riferimento_normativo !== 'non disponibile' && (
                        <p className="text-blue-400 text-[10px]">📜 {norm.riferimento_normativo}</p>
                      )}
                      <p className="text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="font-medium">
                          Ente: {norm.ente_controllo || (
                            norm.categoria === 'Sicurezza sul lavoro' ? 'ASL/Ispettorato del Lavoro' :
                            norm.categoria === 'Ambientale' ? 'ARPA/Provincia' :
                            norm.categoria === 'Antincendio' ? 'Vigili del Fuoco (VVF)' :
                            norm.categoria === 'Privacy e GDPR' ? 'Garante Privacy' :
                            norm.categoria === 'Igiene e Sanità' ? 'ASL/NAS' :
                            'Autorità competente'
                          )}
                        </span>
                      </p>
                    </div>
                  )}
                  <p className="text-xs mt-1" style={{ color: STATO_COLORS[norm.stato] }}>{STATO_LABELS[norm.stato]}</p>
                  {!isExpanded && (!norm.documenti_urls || norm.documenti_urls.length === 0) && (
                    <p className="text-xs mt-2 text-lime-400/80 flex items-center gap-1"><Camera className="w-3 h-3" /> Tocca per scattare o caricare documenti</p>
                  )}
                  {!isExpanded && norm.documenti_urls?.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex -space-x-2">
                        {norm.documenti_urls.slice(0, 3).map((url, idx) => {
                          const fileName = norm.documenti_nomi?.[idx] || '';
                          const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url) || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName);
                          return (
                            <div key={idx} className="w-8 h-8 rounded-md border-2 border-slate-800 overflow-hidden bg-slate-700">
                              {isImage ? <img src={url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><FileText className="w-4 h-4 text-lime-400/60" /></div>}
                            </div>
                          );
                        })}
                      </div>
                      <span className="text-xs text-slate-400">{norm.documenti_urls.length} {norm.documenti_urls.length === 1 ? 'documento' : 'documenti'}</span>
                    </div>
                  )}
                </div>
              </button>

              {timeline && norm.documenti_urls?.length > 0 && (
                <div className="px-4 pb-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Inizio periodo</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Scadenza: {new Date(timeline.scadenza).toLocaleDateString('it-IT')}</span>
                  </div>
                  <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${timeline.percentuale}%`, background: timeline.color === 'green' ? 'linear-gradient(90deg, #22c55e, #22c55e)' : timeline.color === 'orange' ? 'linear-gradient(90deg, #22c55e, #f97316)' : 'linear-gradient(90deg, #22c55e, #f97316, #ef4444)' }} />
                    <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-slate-900 shadow-lg" style={{ left: `calc(${timeline.percentuale}% - 8px)` }} />
                  </div>
                  <p className={`text-xs mt-1 text-right ${timeline.color === 'red' ? 'text-red-400' : timeline.color === 'orange' ? 'text-orange-400' : 'text-green-400'}`}>
                    {timeline.giorniMancanti > 0 ? `${timeline.giorniMancanti} giorni alla scadenza` : timeline.giorniMancanti === 0 ? 'Scade oggi!' : `Scaduto da ${Math.abs(timeline.giorniMancanti)} giorni`}
                  </p>
                </div>
              )}

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-700 pt-4 space-y-4">
                  {editingNorm?.id === norm.id ? (
                    <div className="space-y-3 bg-slate-900/50 rounded-lg p-3">
                      <div><Label className="text-slate-400 text-xs">Nome adempimento</Label><Input value={editingNorm.nome || ''} onChange={(e) => setEditingNorm({...editingNorm, nome: e.target.value})} className="bg-slate-800 border-slate-600 text-slate-900 mt-1" /></div>
                      <div><Label className="text-slate-400 text-xs">Descrizione</Label><Textarea value={editingNorm.descrizione || ''} onChange={(e) => setEditingNorm({...editingNorm, descrizione: e.target.value})} className="bg-slate-800 border-slate-600 text-slate-900 mt-1" rows={3} /></div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label className="text-slate-400 text-xs">Data scadenza</Label><Input type="date" value={editingNorm.data_scadenza || ''} onChange={(e) => setEditingNorm({...editingNorm, data_scadenza: e.target.value})} className="bg-slate-800 border-slate-600 text-slate-900 mt-1" /></div>
                        <div><Label className="text-slate-400 text-xs">Frequenza rinnovo (mesi)</Label><Input type="number" value={editingNorm.frequenza_rinnovo_mesi || ''} onChange={(e) => setEditingNorm({...editingNorm, frequenza_rinnovo_mesi: parseInt(e.target.value) || 0})} className="bg-slate-800 border-slate-600 text-slate-900 mt-1" min="0" /></div>
                      </div>
                      <div>
                        <Label className="text-slate-400 text-xs">Stato</Label>
                        <Select value={editingNorm.stato || 'non_verificato'} onValueChange={(value) => setEditingNorm({...editingNorm, stato: value})}>
                          <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-900 mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="conforme" className="text-green-400">✅ Conforme</SelectItem>
                            <SelectItem value="da_migliorare" className="text-orange-400">🟠 Da migliorare</SelectItem>
                            <SelectItem value="non_conforme" className="text-red-400">🔴 Non conforme</SelectItem>
                            <SelectItem value="non_verificato" className="text-slate-400">⚪ Non verificato</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-slate-400 text-xs">Note</Label><Textarea value={editingNorm.note || ''} onChange={(e) => setEditingNorm({...editingNorm, note: e.target.value})} className="bg-slate-800 border-slate-600 text-slate-900 mt-1" rows={2} placeholder="Aggiungi note..." /></div>
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" onClick={async () => { await updateNormMutation.mutateAsync({ id: norm.id, data: { nome: editingNorm.nome, descrizione: editingNorm.descrizione, data_scadenza: editingNorm.data_scadenza || null, frequenza_rinnovo_mesi: editingNorm.frequenza_rinnovo_mesi, stato: editingNorm.stato, note: editingNorm.note }}); setEditingNorm(null); }} className="bg-lime-400 text-slate-900 hover:bg-lime-500"><CheckCircle className="w-4 h-4 mr-1" /> Salva modifiche</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingNorm(null)} className="border-slate-600 text-slate-300">Annulla</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setEditingNorm({...norm})} className="w-full border-lime-500/50 text-lime-400 hover:bg-lime-500/20 mb-3"><Pencil className="w-4 h-4 mr-2" /> Modifica adempimento</Button>
                      {norm.descrizione && <div><p className="text-slate-400 text-xs mb-1">Descrizione</p><p className="text-white text-sm">{norm.descrizione}</p></div>}
                      <div className={`rounded-lg p-3 ${norm.stato_affidabilita === 'verificato' ? 'bg-green-500/10 border border-green-500/30' : 'bg-amber-500/10 border border-amber-500/30'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {norm.stato_affidabilita === 'verificato' ? <><CheckCircle className="w-4 h-4 text-green-400" /><p className="text-green-400 text-xs font-semibold">Fonte verificata</p></> : <><AlertTriangle className="w-4 h-4 text-amber-400" /><p className="text-amber-400 text-xs font-semibold">Fonte non verificata</p></>}
                        </div>
                        {norm.riferimento_normativo && norm.riferimento_normativo !== 'non disponibile' && <p className="text-slate-300 text-xs mb-1">📜 <span className="font-medium">{norm.riferimento_normativo}</span></p>}
                        {norm.fonte_ufficiale && norm.fonte_ufficiale !== 'non verificata' && <p className="text-slate-400 text-xs mb-1">Fonte: {norm.fonte_ufficiale}</p>}
                        {norm.link_verifica && <a href={norm.link_verifica} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs underline">🔗 Verifica su fonte ufficiale</a>}
                        {norm.ente_controllo && <p className="text-slate-400 text-xs mt-1">Ente controllo: {norm.ente_controllo}</p>}
                        {norm.stato_affidabilita !== 'verificato' && <p className="text-amber-300/70 text-[10px] mt-2 italic">⚠️ Adempimento basato su conoscenza AI - si consiglia verifica con un professionista</p>}
                      </div>
                      {norm.sanzione_prevista && (
                        <div className={`rounded-lg p-3 ${norm.sanzione_prevista.toLowerCase().includes('non verificata') ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                          <div className="flex items-center gap-2 mb-1"><AlertTriangle className={`w-4 h-4 ${norm.sanzione_prevista.toLowerCase().includes('non verificata') ? 'text-amber-400' : 'text-red-400'}`} /><p className={`text-xs font-medium ${norm.sanzione_prevista.toLowerCase().includes('non verificata') ? 'text-amber-400' : 'text-red-400'}`}>Sanzione prevista</p></div>
                          <p className={`text-sm ${norm.sanzione_prevista.toLowerCase().includes('non verificata') ? 'text-amber-300' : 'text-red-300'}`}>{norm.sanzione_prevista}</p>
                        </div>
                      )}
                    </>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-slate-400 text-xs">Documenti allegati</Label>
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer"><input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleDocumentUpload(e, norm.id)} disabled={uploadingDoc || analyzingDoc === norm.id} /><span className="bg-blue-500/20 text-blue-400 text-xs flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-500/30 transition-colors"><Camera className="w-3 h-3" /> Scatta</span></label>
                        <label className="cursor-pointer"><input type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={(e) => handleDocumentUpload(e, norm.id)} disabled={uploadingDoc || analyzingDoc === norm.id} /><span className="bg-lime-500/20 text-lime-400 text-xs flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-lime-500/30 transition-colors"><Upload className="w-3 h-3" /> Carica</span></label>
                      </div>
                    </div>
                    {analyzingDoc === norm.id && (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-3"><div className="flex items-center gap-2"><Loader2 className="w-4 h-4 text-blue-400 animate-spin" /><p className="text-blue-300 text-sm">L'AI sta analizzando il documento...</p></div></div>
                    )}
                    {norm.documenti_urls?.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {norm.documenti_urls.map((url, idx) => {
                          const fileName = norm.documenti_nomi?.[idx] || `Documento ${idx + 1}`;
                          const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url) || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName);
                          return (
                            <div key={idx} className="relative group bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
                              <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                                {isImage ? (
                                  <div className="aspect-square relative">
                                    <img src={url} alt={fileName} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                                    <div className="hidden w-full h-full items-center justify-center bg-slate-800"><FileText className="w-8 h-8 text-slate-500" /></div>
                                  </div>
                                ) : (
                                  <div className="aspect-square flex items-center justify-center bg-slate-800"><FileText className="w-10 h-10 text-lime-400/60" /></div>
                                )}
                              </a>
                              <div className="p-2"><p className="text-slate-300 text-xs truncate" title={fileName}>{fileName}</p></div>
                              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <label className="cursor-pointer"><input type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { removeDocument(idx, norm.id); handleDocumentUpload(e, norm.id); }}} disabled={uploadingDoc || analyzingDoc === norm.id} /><span className="bg-blue-500 text-white p-1.5 rounded-md flex items-center justify-center hover:bg-blue-600 transition-colors"><RefreshCw className="w-3 h-3" /></span></label>
                                <button onClick={() => removeDocument(idx, norm.id)} className="bg-red-500 text-white p-1.5 rounded-md hover:bg-red-600 transition-colors"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-slate-900/50 border border-dashed border-slate-700 rounded-lg p-6 text-center">
                        <Image className="w-10 h-10 text-slate-600 mx-auto mb-2" /><p className="text-slate-500 text-sm">Nessun documento caricato</p><p className="text-slate-600 text-xs mt-1">Usa i pulsanti sopra per scattare una foto o caricare un file</p>
                      </div>
                    )}
                  </div>

                  {norm.documenti_urls?.length > 0 && norm.stato !== 'non_verificato' && (
                    <div className="bg-slate-900 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${norm.stato === 'conforme' ? 'text-green-400' : norm.stato === 'da_migliorare' ? 'text-orange-400' : 'text-red-400'}`}>
                          {norm.stato === 'conforme' ? '✅ Documento a norma' : norm.stato === 'da_migliorare' ? '🟠 Da migliorare' : '🔴 Non conforme'}
                        </span>
                        {norm.data_ultima_verifica && <span className="text-slate-500 text-xs">Verificato: {new Date(norm.data_ultima_verifica).toLocaleDateString('it-IT')}</span>}
                      </div>
                      {norm.note && <p className="text-slate-400 text-xs mb-2">{norm.note}</p>}
                    </div>
                  )}

                  {editingNorm?.id !== norm.id && (
                    <>
                      {norm.data_scadenza && timeline && timeline.giorniMancanti <= 7 && timeline.giorniMancanti >= 0 && !norm.notifica_disabilitata && (
                        <Button variant="outline" size="sm" onClick={() => updateNormMutation.mutate({ id: norm.id, data: { notifica_disabilitata: true }})} className="w-full border-orange-500/50 text-orange-400 hover:bg-orange-500/20"><CheckCircle className="w-4 h-4 mr-2" /> Ho preso visione - Disabilita notifica</Button>
                      )}
                      {!norm.is_locked && (
                        <div className="flex gap-2 pt-2">
                          <Button variant="outline" size="sm" onClick={() => { if (confirm('Eliminare questa normativa?')) { deleteNormMutation.mutate(norm.id); }}} className="border-red-500/50 text-red-400 hover:bg-red-500/20"><Trash2 className="w-4 h-4 mr-1" /> Elimina</Button>
                        </div>
                      )}
                      {norm.is_locked && <p className="text-slate-500 text-xs italic pt-2">🔒 Adempimento obbligatorio - puoi modificare date e stato</p>}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}