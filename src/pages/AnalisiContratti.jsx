import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileSearch, Upload, FileText, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';

export default function AnalisiContratti() {
  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

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

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
      setAnalysis(null);
    } else {
      setError('Per favore carica un file PDF');
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // Upload del file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      setUploading(false);
      setAnalyzing(true);

      // Analisi con LLM
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Sei un esperto legale italiano. Analizza questo contratto e fornisci:
1. Tipo di contratto
2. Parti coinvolte
3. Oggetto del contratto
4. Durata e scadenze importanti
5. Clausole principali
6. Eventuali criticità o punti di attenzione
7. Consigli per il cliente

Sii dettagliato ma chiaro, usando un linguaggio comprensibile.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            tipo_contratto: { type: "string" },
            parti_coinvolte: { type: "array", items: { type: "string" } },
            oggetto: { type: "string" },
            durata: { type: "string" },
            scadenze: { type: "array", items: { type: "string" } },
            clausole_principali: { type: "array", items: { type: "string" } },
            criticita: { type: "array", items: { type: "string" } },
            consigli: { type: "array", items: { type: "string" } },
            riepilogo: { type: "string" }
          }
        }
      });

      setAnalysis(result);
    } catch (e) {
      console.error(e);
      setError('Errore durante l\'analisi del contratto. Riprova.');
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setFile(null);
    setAnalysis(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('Home')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-white text-xl font-bold">Analisi Contratti</h1>
        </div>

        {/* Hero Card */}
        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 border-0 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <FileSearch className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-white text-xl font-bold">Analisi AI</h2>
                <p className="text-white/80 text-sm">Carica un contratto PDF per analizzarlo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {!analysis ? (
          <>
            {/* Upload Area */}
            <Card className="bg-slate-800 border-slate-700 mb-4">
              <CardContent className="p-6">
                <label className="block cursor-pointer">
                  <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center hover:border-lime-400 transition-colors">
                    {file ? (
                      <div className="space-y-2">
                        <FileText className="w-12 h-12 text-lime-400 mx-auto" />
                        <p className="text-white font-medium">{file.name}</p>
                        <p className="text-slate-400 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-12 h-12 text-slate-500 mx-auto" />
                        <p className="text-slate-400">Clicca per caricare un PDF</p>
                        <p className="text-slate-500 text-sm">Contratti, accordi, documenti legali</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </CardContent>
            </Card>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <Button
              onClick={handleAnalyze}
              disabled={!file || uploading || analyzing}
              className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 font-semibold py-6"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Caricamento...
                </>
              ) : analyzing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analisi in corso...
                </>
              ) : (
                <>
                  <FileSearch className="w-5 h-5 mr-2" />
                  Analizza Contratto
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            {/* Risultati Analisi */}
            <div className="space-y-4">
              {/* Riepilogo */}
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <h3 className="text-lime-400 font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Riepilogo
                  </h3>
                  <p className="text-slate-300 text-sm">{analysis.riepilogo}</p>
                </CardContent>
              </Card>

              {/* Tipo e Parti */}
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <h3 className="text-white font-semibold mb-3">Informazioni Generali</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-400 text-sm">Tipo:</span>
                      <p className="text-white">{analysis.tipo_contratto}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Parti coinvolte:</span>
                      <ul className="text-white text-sm">
                        {analysis.parti_coinvolte?.map((parte, i) => (
                          <li key={i}>• {parte}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Oggetto:</span>
                      <p className="text-white text-sm">{analysis.oggetto}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Durata:</span>
                      <p className="text-white text-sm">{analysis.durata}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Scadenze */}
              {analysis.scadenze?.length > 0 && (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <h3 className="text-white font-semibold mb-2">📅 Scadenze Importanti</h3>
                    <ul className="space-y-1">
                      {analysis.scadenze.map((scadenza, i) => (
                        <li key={i} className="text-slate-300 text-sm">• {scadenza}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Clausole */}
              {analysis.clausole_principali?.length > 0 && (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <h3 className="text-white font-semibold mb-2">📋 Clausole Principali</h3>
                    <ul className="space-y-1">
                      {analysis.clausole_principali.map((clausola, i) => (
                        <li key={i} className="text-slate-300 text-sm">• {clausola}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Criticità */}
              {analysis.criticita?.length > 0 && (
                <Card className="bg-orange-500/20 border-orange-500/50">
                  <CardContent className="p-4">
                    <h3 className="text-orange-400 font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Punti di Attenzione
                    </h3>
                    <ul className="space-y-1">
                      {analysis.criticita.map((critica, i) => (
                        <li key={i} className="text-orange-200 text-sm">• {critica}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Consigli */}
              {analysis.consigli?.length > 0 && (
                <Card className="bg-green-500/20 border-green-500/50">
                  <CardContent className="p-4">
                    <h3 className="text-green-400 font-semibold mb-2">💡 Consigli</h3>
                    <ul className="space-y-1">
                      {analysis.consigli.map((consiglio, i) => (
                        <li key={i} className="text-green-200 text-sm">• {consiglio}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={resetAnalysis}
                variant="outline"
                className="w-full border-slate-600 text-white hover:bg-slate-800"
              >
                Analizza un altro contratto
              </Button>
            </div>
          </>
        )}
      </main>

      <BottomNav currentPage="AnalisiContratti" unreadMessages={messages.length} />
    </div>
  );
}