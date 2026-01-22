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
    descrizione: 'Buoni pasto digitali con esenzione fiscale fino a 10€',
    icon: CreditCard,
    bgColor: 'bg-orange-100',
    iconBg: 'bg-orange-200',
    iconColor: 'text-orange-600',
    accentColor: 'from-orange-400 to-amber-400',
    pdfUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/8b4e08588_buonipasto.pdf',
    needsExcel: false
  },
  {
    id: 'buoni_spesa',
    nome: 'Buoni Spesa',
    descrizione: 'Buoni spesa per supermercati e negozi convenzionati',
    icon: ShoppingBag,
    bgColor: 'bg-emerald-100',
    iconBg: 'bg-emerald-200',
    iconColor: 'text-emerald-600',
    accentColor: 'from-emerald-400 to-green-400',
    pdfUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/3ba3e9801_buonispesa.pdf',
    needsExcel: true
  },
  {
    id: 'buoni_omaggio',
    nome: 'Buoni Omaggio',
    descrizione: 'Buoni regalo per premi e omaggi ai collaboratori',
    icon: Gift,
    bgColor: 'bg-violet-100',
    iconBg: 'bg-violet-200',
    iconColor: 'text-violet-600',
    accentColor: 'from-violet-400 to-purple-400',
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
              <Card key={contratto.id} className={`${contratto.bgColor} border-0 overflow-hidden shadow-lg`}>
                <div className={`h-2 bg-gradient-to-r ${contratto.accentColor}`} />
                <CardContent className="p-5">
                  {/* Header riquadro */}
                  <div className="flex items-start gap-4 mb-5">
                    <div className={`w-14 h-14 rounded-2xl ${contratto.iconBg} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <Icon className={`w-7 h-7 ${contratto.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-slate-800 font-bold text-lg">{contratto.nome}</h3>
                      <p className="text-slate-600 text-sm">{contratto.descrizione}</p>
                    </div>
                  </div>

                  {/* STEP 1: Scarica contratto */}
                  <Button
                    onClick={() => handleDownload(contratto.pdfUrl)}
                    variant="outline"
                    className="w-full mb-3 border-slate-400 bg-white hover:bg-slate-50 text-slate-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    <span className="font-bold">Scarica Contratto</span>
                  </Button>

                  {/* STEP 2: Carica contratto firmato */}
                  {!status.contractSent && (
                    <>
                      {status.uploaded ? (
                        <div className="bg-green-100 border border-green-300 rounded-lg px-3 py-2 flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <span className="text-green-700 text-sm truncate">{status.fileName}</span>
                          </div>
                          <button onClick={() => removeContractUpload(contratto.id)} className="text-red-500 hover:text-red-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer block mb-3">
                          <div className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl transition-colors shadow-sm ${
                            status.uploading 
                              ? 'bg-slate-200 text-slate-400' 
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
                          className={`w-full bg-gradient-to-r ${contratto.accentColor} hover:opacity-90 text-white font-bold shadow-md`}
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
                    <div className="mt-4 pt-4 border-t border-slate-300">
                      <div className="flex items-center gap-2 mb-3 bg-green-100 rounded-lg px-3 py-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-green-700 font-medium">Contratto Inviato!</span>
                      </div>

                      {contratto.needsExcel && !status.excelSent && (
                        <>
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                            <div className="flex items-start gap-2 mb-2">
                              <FileSpreadsheet className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-blue-700 font-semibold text-sm">Ora crea una tabella Excel</p>
                                <p className="text-blue-600 text-xs mt-1">Segui questo esempio con i dati dei dipendenti:</p>
                              </div>
                            </div>
                            <img 
                              src={EXCEL_EXAMPLE_IMAGE} 
                              alt="Esempio Excel"
                              className="w-full rounded-lg border border-blue-200 mt-2 shadow-sm"
                            />
                            <p className="text-slate-500 text-xs mt-2">Colonne: Nome, Cognome, Email, Importo (€), Codice Fiscale</p>
                          </div>

                          {/* Upload Excel */}
                          {status.excelUploaded ? (
                            <div className="bg-green-100 border border-green-300 rounded-lg px-3 py-2 flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                <span className="text-green-700 text-sm truncate">{status.excelName}</span>
                              </div>
                              <button onClick={() => removeExcelUpload(contratto.id)} className="text-red-500 hover:text-red-600">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer block mb-3">
                              <div className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed transition-colors ${
                                status.excelUploading 
                                  ? 'border-slate-300 bg-slate-100 text-slate-400' 
                                  : 'border-emerald-400 hover:border-emerald-500 bg-emerald-50 text-emerald-600'
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
                              className={`w-full bg-gradient-to-r ${contratto.accentColor} hover:opacity-90 text-white font-bold`}
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
                        <div className="flex items-center gap-2 mt-3 bg-green-100 rounded-lg px-3 py-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-green-700 font-medium">Tabella Excel Inviata!</span>
                        </div>
                      )}

                      {!contratto.needsExcel && (
                        <p className="text-slate-600 text-sm">La tua richiesta è stata inviata. Ti contatteremo presto!</p>
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