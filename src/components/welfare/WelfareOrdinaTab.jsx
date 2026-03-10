import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Download, Upload, CheckCircle, Loader2, CreditCard, ShoppingBag, Gift, X, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
    needsExcel: true,
    excelColonne: ['Matricola', 'Nome', 'Cognome', 'Codice Fiscale', 'Email', 'Valore del buono (€)', 'Quantità buoni']
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
    needsExcel: true,
    excelColonne: ['Nome', 'Cognome', 'Email', 'Importo (€)', 'Codice Fiscale']
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
    needsExcel: true,
    excelColonne: ['Nome', 'Cognome', 'Email', 'Importo (€)', 'Codice Fiscale']
  }
];

export default function WelfareOrdinaTab({ user }) {
  const [contractStatus, setContractStatus] = useState({});

  const handleDownload = (pdfUrl) => {
    window.open(pdfUrl, '_blank');
  };

  const downloadExcelTemplate = (contratto) => {
    const colonne = contratto.excelColonne;
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Template">
  <Table>
   <Row>
    ${colonne.map(col => `<Cell><Data ss:Type="String">${col}</Data></Cell>`).join('')}
   </Row>
  </Table>
 </Worksheet>
</Workbook>`;
    const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${contratto.id}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleContractUpload = async (contractId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setContractStatus(prev => ({ ...prev, [contractId]: { ...prev[contractId], uploading: true } }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setContractStatus(prev => ({ ...prev, [contractId]: { ...prev[contractId], uploading: false, uploaded: true, fileUrl: file_url, fileName: file.name } }));
    e.target.value = '';
  };

  const removeContractUpload = (contractId) => {
    setContractStatus(prev => ({ ...prev, [contractId]: { ...prev[contractId], uploaded: false, fileUrl: null, fileName: null } }));
  };

  const sendContract = async (contractId) => {
    const contratto = CONTRATTI.find(c => c.id === contractId);
    const status = contractStatus[contractId];
    setContractStatus(prev => ({ ...prev, [contractId]: { ...prev[contractId], sending: true } }));
    await base44.functions.invoke('sendWelfareEmail', {
      to: 'app.consorzio.imprenditori@gmail.com',
      subject: `CONTRATTO ${contratto.nome.toUpperCase()} - ${user.company_name || user.full_name}`,
      body: `<h2>Nuovo Contratto ${contratto.nome}</h2><p><strong>Azienda:</strong> ${user.company_name || user.full_name}</p><p><strong>Email:</strong> ${user.email}</p><p><strong>Telefono:</strong> ${user.telefono_referente || 'Non specificato'}</p><p><strong>Contratto allegato:</strong> <a href="${status.fileUrl}">${status.fileName}</a></p>`
    });
    const newRequest = await base44.entities.WelfareRequest.create({
      user_email: user.email,
      user_name: user.company_name || user.full_name,
      user_phone: user.telefono_referente || '',
      tipo_buono: contractId,
      contratto_url: status.fileUrl,
      contratto_nome: status.fileName,
      status: 'contratto_inviato'
    });
    setContractStatus(prev => ({ ...prev, [contractId]: { ...prev[contractId], sending: false, contractSent: true, requestId: newRequest.id } }));
  };

  const handleExcelUpload = async (contractId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setContractStatus(prev => ({ ...prev, [contractId]: { ...prev[contractId], excelUploading: true } }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setContractStatus(prev => ({ ...prev, [contractId]: { ...prev[contractId], excelUploading: false, excelUploaded: true, excelUrl: file_url, excelName: file.name } }));
    e.target.value = '';
  };

  const removeExcelUpload = (contractId) => {
    setContractStatus(prev => ({ ...prev, [contractId]: { ...prev[contractId], excelUploaded: false, excelUrl: null, excelName: null } }));
  };

  const sendExcel = async (contractId) => {
    const contratto = CONTRATTI.find(c => c.id === contractId);
    const status = contractStatus[contractId];
    setContractStatus(prev => ({ ...prev, [contractId]: { ...prev[contractId], excelSending: true } }));
    await base44.functions.invoke('sendWelfareEmail', {
      to: 'app.consorzio.imprenditori@gmail.com',
      subject: `TABELLA DIPENDENTI ${contratto.nome.toUpperCase()} - ${user.company_name || user.full_name}`,
      body: `<h2>Tabella Dipendenti per ${contratto.nome}</h2><p><strong>Azienda:</strong> ${user.company_name || user.full_name}</p><p><strong>Email:</strong> ${user.email}</p><p><strong>File Excel:</strong> <a href="${status.excelUrl}">${status.excelName}</a></p>`
    });
    if (status.requestId) {
      await base44.entities.WelfareRequest.update(status.requestId, {
        excel_url: status.excelUrl,
        excel_nome: status.excelName,
        status: 'excel_inviato'
      });
    }
    setContractStatus(prev => ({ ...prev, [contractId]: { ...prev[contractId], excelSending: false, excelSent: true } }));
  };

  return (
    <div className="space-y-5">
      {CONTRATTI.map((contratto) => {
        const Icon = contratto.icon;
        const status = contractStatus[contratto.id] || {};

        return (
          <Card key={contratto.id} className={`${contratto.bgColor} border-0 overflow-hidden shadow-lg rounded-2xl`}>
            <CardContent className="p-5">
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-12 h-12 rounded-2xl ${contratto.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-6 h-6 ${contratto.iconColor}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-slate-800 font-bold text-base">{contratto.nome}</h3>
                  <p className="text-slate-600 text-xs">{contratto.descrizione}</p>
                </div>
              </div>

              {/* Scarica contratto */}
              <Button onClick={() => handleDownload(contratto.pdfUrl)} variant="outline" size="sm" className="w-full mb-3 border-slate-400 bg-white hover:bg-slate-50 text-slate-700">
                <Download className="w-4 h-4 mr-2" />
                <span className="font-bold text-xs">Scarica Contratto</span>
              </Button>

              {/* Carica contratto firmato */}
              {!status.contractSent && (
                <>
                  {status.uploaded ? (
                    <div className="bg-green-100 border border-green-300 rounded-lg px-3 py-2 flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="text-green-700 text-xs truncate">{status.fileName}</span>
                      </div>
                      <button onClick={() => removeContractUpload(contratto.id)} className="text-red-500"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block mb-3">
                      <div className={`flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs ${status.uploading ? 'bg-slate-200 text-slate-400' : 'bg-pink-500 hover:bg-pink-600 text-white'}`}>
                        {status.uploading ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Caricamento...</span></> : <><Upload className="w-4 h-4" /><span>Carica Contratto Firmato</span></>}
                      </div>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleContractUpload(contratto.id, e)} className="hidden" disabled={status.uploading} />
                    </label>
                  )}
                  {status.uploaded && (
                    <Button onClick={() => sendContract(contratto.id)} disabled={status.sending} className={`w-full bg-gradient-to-r ${contratto.accentColor} hover:opacity-90 text-white font-bold text-xs`}>
                      {status.sending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Invio...</> : 'Invia Contratto'}
                    </Button>
                  )}
                </>
              )}

              {/* Post-invio contratto: Excel */}
              {status.contractSent && (
                <div className="mt-3 pt-3 border-t border-slate-300">
                  <div className="flex items-center gap-2 mb-3 bg-green-100 rounded-lg px-3 py-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-green-700 text-xs font-medium">Contratto Inviato!</span>
                  </div>
                  {contratto.needsExcel && !status.excelSent && (
                    <>
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3">
                        <div className="flex items-start gap-2 mb-2">
                          <FileSpreadsheet className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-blue-700 font-semibold text-xs">Carica la tabella dipendenti</p>
                            <p className="text-blue-600 text-[10px] mt-1">Scarica il template, compilalo e ricaricalo</p>
                          </div>
                        </div>
                        <Button onClick={() => downloadExcelTemplate(contratto)} variant="outline" size="sm" className="w-full mb-2 border-blue-300 bg-white hover:bg-blue-50 text-blue-700 text-xs">
                          <Download className="w-3 h-3 mr-2" />Scarica Template Excel
                        </Button>
                      </div>
                      {status.excelUploaded ? (
                        <div className="bg-green-100 border border-green-300 rounded-lg px-3 py-2 flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <span className="text-green-700 text-xs truncate">{status.excelName}</span>
                          </div>
                          <button onClick={() => removeExcelUpload(contratto.id)} className="text-red-500"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <label className="cursor-pointer block mb-3">
                          <div className={`flex items-center justify-center gap-2 py-2 px-4 rounded-xl border-2 border-dashed text-xs ${status.excelUploading ? 'border-slate-300 bg-slate-100 text-slate-400' : 'border-emerald-400 bg-emerald-50 text-emerald-600'}`}>
                            {status.excelUploading ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Caricamento...</span></> : <><Upload className="w-4 h-4" /><span>Carica File Excel</span></>}
                          </div>
                          <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => handleExcelUpload(contratto.id, e)} className="hidden" disabled={status.excelUploading} />
                        </label>
                      )}
                      {status.excelUploaded && (
                        <Button onClick={() => sendExcel(contratto.id)} disabled={status.excelSending} className={`w-full bg-gradient-to-r ${contratto.accentColor} hover:opacity-90 text-white font-bold text-xs`}>
                          {status.excelSending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Invio...</> : 'Invia Tabella Excel'}
                        </Button>
                      )}
                    </>
                  )}
                  {status.excelSent && (
                    <div className="flex items-center gap-2 mt-2 bg-green-100 rounded-lg px-3 py-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-green-700 text-xs font-medium">Tabella Excel Inviata!</span>
                    </div>
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