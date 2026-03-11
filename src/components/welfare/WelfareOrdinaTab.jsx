import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Download, Upload, CheckCircle, Loader2, X, FileSpreadsheet, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ContractFormFields from './ContractFormFields';
import WelfareSimulazione from './WelfareSimulazione';
import WelfareInfoPanel from './WelfareInfoPanel';
import { generateBuoniPastoPdf, generateBuoniSpesaPdf, generateBuoniOmaggioPdf } from './generateContractPdf';

const GENERATORS = {
  buoni_pasto: generateBuoniPastoPdf,
  buoni_spesa: generateBuoniSpesaPdf,
  buoni_omaggio: generateBuoniOmaggioPdf,
};

const EXTRA_FIELDS = {
  buoni_pasto: [
    { key: 'sconto_percentuale', label: 'Sconto applicato (%)', placeholder: 'Es. 3' },
    { key: 'valore_buono', label: 'Valore facciale buono (€)', fieldType: 'select', options: ['3,00', '5,00', '7,00', '8,00'] },
  ],
  buoni_spesa: [
    { key: 'valore_buono', label: 'Importo buono spesa (€)', fieldType: 'select', options: ['25,00', '50,00', '75,00', '100,00', '150,00', '200,00', '250,00', '300,00', '400,00', '500,00', '750,00', '1.000,00', '1.500,00', '2.000,00'] },
  ],
  buoni_omaggio: [
    { key: 'valore_buono', label: 'Importo buono omaggio (€)', fieldType: 'select', options: ['10,00', '15,00', '20,00', '25,00', '30,00', '40,00', '50,00'] },
  ],
};

const EXCEL_COLUMNS = {
  buoni_pasto: ['Matricola', 'Nome', 'Cognome', 'Codice Fiscale', 'Email', 'Valore del buono (€)', 'Quantità buoni'],
  buoni_spesa: ['Nome', 'Cognome', 'Email', 'Importo (€)', 'Codice Fiscale'],
  buoni_omaggio: ['Nome', 'Cognome', 'Email', 'Importo (€)', 'Codice Fiscale'],
};

// Mappa: campo form → campo entità User
const FORM_TO_PROFILE = {
  ragione_sociale: 'company_name',
  email: 'company_email',
  cellulare: 'cellulare_referente',
  nome_referente: 'referente',
  indirizzo: 'address',
  comune: 'city',
  cap: 'postal_code',
  provincia: 'province',
  piva: 'vat_number',
  codice_fiscale: 'codice_fiscale',
  sdi_pec: 'codice_sdi',
};

export default function WelfareOrdinaTab({ user, tipo = 'buoni_pasto' }) {
  const [formData, setFormData] = useState({});
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [simulazioneCompletata, setSimulazioneCompletata] = useState(false);
  const [datiSimulazione, setDatiSimulazione] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Pre-compila dal profilo utente (campi reali entità User)
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        ragione_sociale: prev.ragione_sociale || user.company_name || '',
        email: prev.email || user.company_email || user.email || '',
        cellulare: prev.cellulare || user.cellulare_referente || user.telefono_referente || user.phone || '',
        nome_referente: prev.nome_referente || user.referente || user.full_name || '',
        indirizzo: prev.indirizzo || user.address || '',
        comune: prev.comune || user.city || '',
        cap: prev.cap || user.postal_code || '',
        provincia: prev.provincia || user.province || '',
        piva: prev.piva || user.vat_number || '',
        codice_fiscale: prev.codice_fiscale || user.codice_fiscale || '',
        sdi_pec: prev.sdi_pec || user.codice_sdi || user.billing_pec || '',
      }));
    }
  }, [user]);

  // Salva modifiche form anche nel profilo utente (debounce)
  const saveTimeoutRef = useRef(null);
  const lastSavedRef = useRef({});

  const handleFormDataChange = useCallback((updater) => {
    setFormData(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Trova campi modificati che hanno mapping al profilo
      const profileUpdate = {};
      for (const [formKey, profileKey] of Object.entries(FORM_TO_PROFILE)) {
        if (next[formKey] !== undefined && next[formKey] !== lastSavedRef.current[formKey]) {
          profileUpdate[profileKey] = next[formKey];
        }
      }
      if (Object.keys(profileUpdate).length > 0) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
          setSavingProfile(true);
          await base44.auth.updateMe(profileUpdate);
          // Aggiorna ref per evitare salvataggi duplicati
          for (const [formKey] of Object.entries(FORM_TO_PROFILE)) {
            if (next[formKey] !== undefined) lastSavedRef.current[formKey] = next[formKey];
          }
          setSavingProfile(false);
        }, 1500);
      }
      return next;
    });
  }, []);

  const isFormValid = formData.ragione_sociale && formData.email && formData.piva && formData.cellulare;

  const handleGeneratePdf = () => {
    if (!isFormValid) {
      toast.error('Compila i campi obbligatori (*)');
      return;
    }
    const generator = GENERATORS[tipo];
    const doc = generator(formData);
    const labels = { buoni_pasto: 'Buoni_Pasto', buoni_spesa: 'Buoni_Spesa', buoni_omaggio: 'Buoni_Omaggio' };
    doc.save(`Contratto_${labels[tipo]}_${formData.ragione_sociale.replace(/\s+/g, '_')}.pdf`);
    setPdfGenerated(true);
    setShowForm(false);
    toast.success('PDF generato! Scaricalo, firmalo e ricaricalo qui sotto.');
  };

  const handleContractUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadStatus(prev => ({ ...prev, uploading: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUploadStatus(prev => ({ ...prev, uploading: false, uploaded: true, fileUrl: file_url, fileName: file.name }));
    e.target.value = '';
  };

  const sendContract = async () => {
    setUploadStatus(prev => ({ ...prev, sending: true }));
    const labels = { buoni_pasto: 'Buoni Pasto', buoni_spesa: 'Buoni Spesa', buoni_omaggio: 'Buoni Omaggio' };
    await base44.functions.invoke('sendWelfareEmail', {
      to: 'app.consorzio.imprenditori@gmail.com',
      subject: `CONTRATTO ${labels[tipo].toUpperCase()} - ${formData.ragione_sociale}`,
      body: `<h2>Nuovo Contratto ${labels[tipo]}</h2><p><strong>Azienda:</strong> ${formData.ragione_sociale}</p><p><strong>Email:</strong> ${formData.email}</p><p><strong>Telefono:</strong> ${formData.cellulare}</p><p><strong>Contratto firmato:</strong> <a href="${uploadStatus.fileUrl}">${uploadStatus.fileName}</a></p>${uploadStatus.excelUrl ? `<p><strong>Tabella dipendenti:</strong> <a href="${uploadStatus.excelUrl}">${uploadStatus.excelName}</a></p>` : ''}`
    });
    const req = await base44.entities.WelfareRequest.create({
      user_email: user.email,
      user_name: formData.ragione_sociale,
      user_phone: formData.cellulare,
      tipo_buono: tipo,
      contratto_url: uploadStatus.fileUrl,
      contratto_nome: uploadStatus.fileName,
      excel_url: uploadStatus.excelUrl || '',
      excel_nome: uploadStatus.excelName || '',
      status: uploadStatus.excelUrl ? 'excel_inviato' : 'contratto_inviato'
    });
    setUploadStatus(prev => ({ ...prev, sending: false, contractSent: true, requestId: req.id }));
    toast.success('Contratto inviato con successo!');
  };

  const downloadExcelTemplate = () => {
    const cols = EXCEL_COLUMNS[tipo];
    const xml = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Template"><Table><Row>${cols.map(c => `<Cell><Data ss:Type="String">${c}</Data></Cell>`).join('')}</Row></Table></Worksheet></Workbook>`;
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_dipendenti_${tipo}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadStatus(prev => ({ ...prev, excelUploading: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUploadStatus(prev => ({ ...prev, excelUploading: false, excelUploaded: true, excelUrl: file_url, excelName: file.name }));
    e.target.value = '';
  };

  const labels = { buoni_pasto: 'Buoni Pasto', buoni_spesa: 'Buoni Spesa', buoni_omaggio: 'Buoni Omaggio' };
  const extraFields = EXTRA_FIELDS[tipo] || [];

  return (
    <div className="space-y-4">
      {/* STEP 1: Compila i dati */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <h3 className="text-white font-bold text-sm flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-pink-400" />
            1. Dati del contratto
          </h3>
          <p className="text-slate-400 text-[10px] mb-2">Pre-compilati dal tuo profilo. Tocca ✏️ per modificare.</p>
          <div className="mt-3">
            <ContractFormFields formData={formData} setFormData={handleFormDataChange} extraFields={extraFields} />
            {(tipo === 'buoni_spesa' || tipo === 'buoni_omaggio') && (
              <WelfareSimulazione
                valoreBuono={formData.valore_buono}
                tipo={tipo}
                userEmail={user?.email}
                onProcedi={(dati) => { setSimulazioneCompletata(true); setDatiSimulazione(dati); }}
              />
            )}
            {(tipo === 'buoni_pasto' || simulazioneCompletata) && (
              <Button onClick={handleGeneratePdf} className="w-full mt-4 bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs">
                <Download className="w-4 h-4 mr-2" />
                Genera e Scarica PDF Contratto {labels[tipo]}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* STEP 2: Ricarica firmato */}
      {pdfGenerated && !uploadStatus.contractSent && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <h3 className="text-white font-bold text-sm flex items-center gap-2 mb-3">
              <Upload className="w-4 h-4 text-pink-400" />
              2. Ricarica il contratto firmato
            </h3>
            <p className="text-slate-400 text-xs mb-3">Scarica il PDF, stampalo, firmalo e ricaricalo qui sotto (PDF, JPG, PNG)</p>
            {uploadStatus.uploaded ? (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-green-400 text-xs truncate">{uploadStatus.fileName}</span>
                </div>
                <button onClick={() => setUploadStatus(p => ({ ...p, uploaded: false, fileUrl: null, fileName: null }))} className="text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer block mb-3">
                <div className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed text-xs ${uploadStatus.uploading ? 'border-slate-600 bg-slate-700 text-slate-400' : 'border-pink-400 bg-pink-500/10 text-pink-400'}`}>
                  {uploadStatus.uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Caricamento...</> : <><Upload className="w-4 h-4" />Carica Contratto Firmato</>}
                </div>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleContractUpload} className="hidden" disabled={uploadStatus.uploading} />
              </label>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Tabella dipendenti + Invio */}
      {uploadStatus.uploaded && !uploadStatus.contractSent && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <h3 className="text-white font-bold text-sm flex items-center gap-2 mb-3">
              <FileSpreadsheet className="w-4 h-4 text-pink-400" />
              3. Tabella dipendenti (opzionale)
            </h3>
            <Button onClick={downloadExcelTemplate} variant="outline" size="sm" className="w-full mb-3 border-slate-600 text-slate-300 hover:bg-slate-700 text-xs">
              <Download className="w-3 h-3 mr-2" />Scarica Template Excel
            </Button>
            {uploadStatus.excelUploaded ? (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-green-400 text-xs truncate">{uploadStatus.excelName}</span>
                </div>
                <button onClick={() => setUploadStatus(p => ({ ...p, excelUploaded: false, excelUrl: null, excelName: null }))} className="text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer block mb-3">
                <div className={`flex items-center justify-center gap-2 py-2 px-4 rounded-xl border-2 border-dashed text-xs ${uploadStatus.excelUploading ? 'border-slate-600 bg-slate-700 text-slate-400' : 'border-emerald-400 bg-emerald-500/10 text-emerald-400'}`}>
                  {uploadStatus.excelUploading ? <><Loader2 className="w-4 h-4 animate-spin" />Caricamento...</> : <><Upload className="w-4 h-4" />Carica File Excel</>}
                </div>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} className="hidden" disabled={uploadStatus.excelUploading} />
              </label>
            )}
            <Button onClick={sendContract} disabled={uploadStatus.sending} className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-90 text-white font-bold text-sm mt-2">
              {uploadStatus.sending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Invio in corso...</> : '📨 Invia Contratto'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Completato */}
      {uploadStatus.contractSent && (
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
            <h3 className="text-green-400 font-bold text-sm">Contratto Inviato!</h3>
            <p className="text-slate-400 text-xs mt-1">Riceverai conferma via email</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}