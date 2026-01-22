import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Download, Upload, CheckCircle, Loader2, CreditCard, ShoppingBag, Gift, X, FileSpreadsheet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';

const CONTRATTI = [
  {
    id: 'buoni_pasto',
    nome: 'Buoni Pasto',
    descrizione: 'Buoni pasto digitali con esenzione fiscale fino a 8€',
    icon: CreditCard,
    color: 'from-orange-500 to-amber-500',
    pdfUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/8b4e08588_buonipasto.pdf',
    needsExcel: false
  },
  {
    id: 'buoni_spesa',
    nome: 'Buoni Spesa',
    descrizione: 'Buoni spesa per supermercati e negozi convenzionati',
    icon: ShoppingBag,
    color: 'from-green-500 to-emerald-500',
    pdfUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/3ba3e9801_buonispesa.pdf',
    needsExcel: true
  },
  {
    id: 'buoni_omaggio',
    nome: 'Buoni Omaggio',
    descrizione: 'Buoni regalo per premi e omaggi ai collaboratori',
    icon: Gift,
    color: 'from-purple-500 to-violet-500',
    pdfUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/edb949281_buoniomaggio.pdf',
    needsExcel: true
  }
];

const EXCEL_EXAMPLE_IMAGE = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/e2de31a19_buonispesa-omaggi.png';

export default function WelfareOrdina() {
  const [user, setUser] = useState(null);
  const [contractStatus, setContractStatus] = useState({});
  // contractStatus[id] = { uploading, uploaded, fileUrl, fileName, contractSent, excelUploading, excelUploaded, excelUrl, excelName, excelSent }

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const handleDownload = (pdfUrl) => {
    window.open(pdfUrl, '_blank');
  };

  const handleContractUpload = async (contractId, e) => {
    const file = e.target.files[0];
    if (!file) return;

    setContractStatus(prev => ({
      ...prev,
      [contractId]: { ...prev[contractId], uploading: true }
    }));

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    
    setContractStatus(prev => ({
      ...prev,
      [contractId]: { 
        ...prev[contractId], 
        uploading: false, 
        uploaded: true, 
        fileUrl: file_url, 
        fileName: file.name 
      }
    }));
    e.target.value = '';
  };

  const removeContractUpload = (contractId) => {
    setContractStatus(prev => ({
      ...prev,
      [contractId]: { ...prev[contractId], uploaded: false, fileUrl: null, fileName: null }
    }));
  };

  const sendContract = async (contractId) => {
    const contratto = CONTRATTI.find(c => c.id === contractId);
    const status = contractStatus[contractId];
    
    setContractStatus(prev => ({
      ...prev,
      [contractId]: { ...prev[contractId], sending: true }
    }));

    await base44.integrations.Core.SendEmail({
      to: 'app.consorzio.imprenditori@gmail.com',
      subject: `CONTRATTO ${contratto.nome.toUpperCase()} - ${user.company_name || user.full_name}`,
      body: `
        <h2>Nuovo Contratto ${contratto.nome}</h2>
        <p><strong>Azienda:</strong> ${user.company_name || user.full_name}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Telefono:</strong> ${user.telefono_referente || 'Non specificato'}</p>
        <p><strong>Contratto allegato:</strong> <a href="${status.fileUrl}">${status.fileName}</a></p>
      `
    });

    setContractStatus(prev => ({
      ...prev,
      [contractId]: { ...prev[contractId], sending: false, contractSent: true }
    }));
  };

  const handleExcelUpload = async (contractId, e) => {
    const file = e.target.files[0];
    if (!file) return;

    setContractStatus(prev => ({
      ...prev,
      [contractId]: { ...prev[contractId], excelUploading: true }
    }));

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    
    setContractStatus(prev => ({
      ...prev,
      [contractId]: { 
        ...prev[contractId], 
        excelUploading: false, 
        excelUploaded: true, 
        excelUrl: file_url, 
        excelName: file.name 
      }
    }));
    e.target.value = '';
  };

  const removeExcelUpload = (contractId) => {
    setContractStatus(prev => ({
      ...prev,
      [contractId]: { ...prev[contractId], excelUploaded: false, excelUrl: null, excelName: null }
    }));
  };

  const sendExcel = async (contractId) => {
    const contratto = CONTRATTI.find(c => c.id === contractId);
    const status = contractStatus[contractId];
    
    setContractStatus(prev => ({
      ...prev,
      [contractId]: { ...prev[contractId], excelSending: true }
    }));

    await base44.integrations.Core.SendEmail({
      to: 'app.consorzio.imprenditori@gmail.com',
      subject: `TABELLA DIPENDENTI ${contratto.nome.toUpperCase()} - ${user.company_name || user.full_name}`,
      body: `
        <h2>Tabella Dipendenti per ${contratto.nome}</h2>
        <p><strong>Azienda:</strong> ${user.company_name || user.full_name}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>File Excel:</strong> <a href="${status.excelUrl}">${status.excelName}</a></p>
      `
    });

    setContractStatus(prev => ({
      ...prev,
      [contractId]: { ...prev[contractId], excelSending: false, excelSent: true }
    }));
  };

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('WelfareAziendale')} className="text-pink-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-white text-xl font-bold">Ordina</h1>
        </div>

        <div className="space-y-6">
          {CONTRATTI.map((contratto) => {
            const Icon = contratto.icon;
            const status = contractStatus[contratto.id] || {};

            return (
              <Card key={contratto.id} className="bg-slate-800 border-slate-700 overflow-hidden">
                <div className={`h-2 bg-gradient-to-r ${contratto.color}`} />
                <CardContent className="p-4">
                  {/* Header riquadro */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${contratto.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-bold">{contratto.nome}</h3>
                      <p className="text-slate-400 text-sm">{contratto.descrizione}</p>
                    </div>
                  </div>

                  {/* STEP 1: Scarica contratto */}
                  <Button
                    onClick={() => handleDownload(contratto.pdfUrl)}
                    variant="outline"
                    className="w-full mb-3 border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Scarica Contratto
                  </Button>

                  {/* STEP 2: Carica contratto firmato */}
                  {!status.contractSent && (
                    <>
                      {status.uploaded ? (
                        <div className="bg-green-500/20 border border-green-500/50 rounded-lg px-3 py-2 flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                            <span className="text-green-400 text-sm truncate">{status.fileName}</span>
                          </div>
                          <button onClick={() => removeContractUpload(contratto.id)} className="text-red-400 hover:text-red-300">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer block mb-3">
                          <div className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-colors ${
                            status.uploading 
                              ? 'bg-slate-700 text-slate-400' 
                              : 'bg-pink-500 hover:bg-pink-600 text-white'
                          }`}>
                            {status.uploading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Caricamento...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                <span>Carica Contratto Firmato</span>
                              </>
                            )}
                          </div>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleContractUpload(contratto.id, e)}
                            className="hidden"
                            disabled={status.uploading}
                          />
                        </label>
                      )}

                      {/* STEP 3: Invia contratto */}
                      {status.uploaded && (
                        <Button
                          onClick={() => sendContract(contratto.id)}
                          disabled={status.sending}
                          className={`w-full bg-gradient-to-r ${contratto.color} hover:opacity-90 text-white font-bold`}
                        >
                          {status.sending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Invio...
                            </>
                          ) : (
                            'Invia Contratto'
                          )}
                        </Button>
                      )}
                    </>
                  )}

                  {/* STEP 4: Contratto inviato - mostra richiesta Excel (solo per buoni spesa/omaggio) */}
                  {status.contractSent && (
                    <div className="mt-4 pt-4 border-t border-slate-700">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-green-400 font-medium">Contratto Inviato!</span>
                      </div>

                      {contratto.needsExcel && !status.excelSent && (
                        <>
                          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 mb-4">
                            <div className="flex items-start gap-2 mb-2">
                              <FileSpreadsheet className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-blue-300 font-medium text-sm">Ora crea una tabella Excel</p>
                                <p className="text-blue-200 text-xs mt-1">Segui questo esempio con i dati dei dipendenti:</p>
                              </div>
                            </div>
                            <img 
                              src={EXCEL_EXAMPLE_IMAGE} 
                              alt="Esempio Excel"
                              className="w-full rounded-lg border border-slate-600 mt-2"
                            />
                            <p className="text-slate-400 text-xs mt-2">Colonne: Nome, Cognome, Email, Importo (€), Codice Fiscale</p>
                          </div>

                          {/* Upload Excel */}
                          {status.excelUploaded ? (
                            <div className="bg-green-500/20 border border-green-500/50 rounded-lg px-3 py-2 flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                                <span className="text-green-400 text-sm truncate">{status.excelName}</span>
                              </div>
                              <button onClick={() => removeExcelUpload(contratto.id)} className="text-red-400 hover:text-red-300">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer block mb-3">
                              <div className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg border-2 border-dashed transition-colors ${
                                status.excelUploading 
                                  ? 'border-slate-600 bg-slate-700/50 text-slate-400' 
                                  : 'border-emerald-500/50 hover:border-emerald-400 bg-emerald-500/10 text-emerald-400'
                              }`}>
                                {status.excelUploading ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Caricamento...</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-4 h-4" />
                                    <span>Carica File Excel</span>
                                  </>
                                )}
                              </div>
                              <input
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={(e) => handleExcelUpload(contratto.id, e)}
                                className="hidden"
                                disabled={status.excelUploading}
                              />
                            </label>
                          )}

                          {/* Invia Excel */}
                          {status.excelUploaded && (
                            <Button
                              onClick={() => sendExcel(contratto.id)}
                              disabled={status.excelSending}
                              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                            >
                              {status.excelSending ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Invio...
                                </>
                              ) : (
                                'Invia Tabella Excel'
                              )}
                            </Button>
                          )}
                        </>
                      )}

                      {status.excelSent && (
                        <div className="flex items-center gap-2 mt-3">
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          <span className="text-green-400 font-medium">Tabella Excel Inviata!</span>
                        </div>
                      )}

                      {!contratto.needsExcel && (
                        <p className="text-slate-400 text-sm">La tua richiesta è stata inviata. Ti contatteremo presto!</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      <BottomNav currentPage="WelfareAziendale" />
    </div>
  );
}