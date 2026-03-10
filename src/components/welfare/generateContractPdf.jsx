import { jsPDF } from 'jspdf';

function drawHeader(doc) {
  doc.setFillColor(0, 51, 102);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('CONSORZIO IMPRENDITORI', 105, 14, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('CLIK APP Srl - Piazza Solferino 20, 10121 Torino - P.IVA 11821600019', 105, 22, { align: 'center' });
}

function drawField(doc, label, value, x, y, w) {
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(label, x, y);
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(value || '_______________', x, y + 5);
  doc.setDrawColor(200, 200, 200);
  doc.line(x, y + 7, x + w, y + 7);
}

function drawSection(doc, title, y) {
  doc.setFillColor(240, 240, 245);
  doc.rect(15, y - 4, 180, 8, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 51, 102);
  doc.text(title, 20, y + 1);
  doc.setFont('helvetica', 'normal');
  return y + 10;
}

function drawCompanyData(doc, formData, startY) {
  let y = startY;
  drawField(doc, 'Ragione Sociale', formData.ragione_sociale, 20, y, 170);
  y += 14;
  drawField(doc, 'Indirizzo', formData.indirizzo, 20, y, 80);
  drawField(doc, 'Comune', formData.comune, 110, y, 80);
  y += 14;
  drawField(doc, 'CAP', formData.cap, 20, y, 30);
  drawField(doc, 'Prov.', formData.provincia, 60, y, 20);
  drawField(doc, 'P.IVA', formData.piva, 90, y, 100);
  y += 14;
  drawField(doc, 'Codice Fiscale', formData.codice_fiscale, 20, y, 170);
  y += 14;
  drawField(doc, 'Nome Referente', formData.nome_referente, 20, y, 80);
  drawField(doc, 'Cellulare', formData.cellulare, 110, y, 80);
  y += 14;
  drawField(doc, 'Codice SDI / PEC', formData.sdi_pec, 20, y, 80);
  drawField(doc, 'Email', formData.email, 110, y, 80);
  y += 14;
  return y;
}

function drawFooter(doc, formData) {
  const y = 250;
  doc.setDrawColor(200, 200, 200);
  doc.line(15, y, 195, y);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const today = new Date().toLocaleDateString('it-IT');
  doc.text(`Luogo e data: ${formData.comune || '____________'}, ${today}`, 20, y + 8);
  doc.text('Firma del cliente:', 20, y + 20);
  doc.line(20, y + 30, 90, y + 30);
  doc.text('CLIK APP Srl:', 120, y + 20);
  doc.line(120, y + 30, 190, y + 30);
}

export function generateBuoniPastoPdf(formData) {
  const doc = new jsPDF();
  drawHeader(doc);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 51, 102);
  doc.text('PROPOSTA DI CONTRATTO DI FORNITURA BUONI PASTO', 105, 42, { align: 'center' });

  let y = drawSection(doc, 'DATI AZIENDA', 55);
  y = drawCompanyData(doc, formData, y);

  y = drawSection(doc, 'SCONTO BUONI PASTO CONSORZIO IMPRENDITORI', y + 4);
  drawField(doc, 'Sconto applicato (%)', formData.sconto_percentuale || '', 20, y, 80);
  drawField(doc, 'Valore facciale buono (€)', formData.valore_buono || '', 110, y, 80);
  y += 18;

  y = drawSection(doc, 'CONDIZIONI E TERMINI DI PAGAMENTO', y);
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  const payText = 'I pagamenti delle fatture saranno effettuati anticipatamente mediante bonifico bancario.\nCLIK APP SRL - Banca delle Alpi Marittime gruppo BCC Iccrea:\nIBAN IT61L0845001000000000006545';
  doc.text(payText, 20, y + 2, { maxWidth: 170 });
  y += 18;

  y = drawSection(doc, 'VANTAGGI PER L\'AZIENDA', y);
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  const vantaggi = [
    '• Totalmente esenti da oneri fiscali e previdenziali',
    '• Deducibili al 100% rispetto a IRAP e IRES, no IRPEF',
    '• IVA al 4% interamente detraibile',
    '• Zero costi di gestione del servizio',
    '• Ottimizzazione attività contabili e pratiche amministrative',
    '• Limite esenzione fiscale 10€ sui Buoni Pasto digitali',
    '• Attivazione di locali graditi'
  ];
  vantaggi.forEach((v, i) => {
    doc.text(v, 20, y + 2 + (i * 5));
  });

  drawFooter(doc, formData);
  return doc;
}

export function generateBuoniSpesaPdf(formData) {
  const doc = new jsPDF();
  drawHeader(doc);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 51, 102);
  doc.text('PROPOSTA DI CONTRATTO DI FORNITURA BUONI SPESA', 105, 42, { align: 'center' });

  let y = drawSection(doc, 'DATI AZIENDA', 55);
  y = drawCompanyData(doc, formData, y);

  y = drawSection(doc, 'PIATTAFORMA TODUBA', y + 4);
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text('La piattaforma Toduba vi viene offerta senza nessun aggravio di canone e il servizio\npuò essere attivato in 24 ore.', 20, y + 2, { maxWidth: 170 });
  y += 14;

  y = drawSection(doc, 'COMMISSIONE BUONI SPESA CONSORZIO IMPRENDITORI', y);
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Commissione a voi applicata: 5%', 20, y + 2);
  y += 10;

  y = drawSection(doc, 'TEMPI DI ATTIVAZIONE', y);
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text('I tempi di attivazione e consegna sono nulli in quanto il tutto è gestito\ndigitalmente attraverso la piattaforma Toduba.', 20, y + 2, { maxWidth: 170 });
  y += 14;

  y = drawSection(doc, 'SCADENZA', y);
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text('I Buoni Spesa Consorzio Imprenditori hanno scadenza annuale, sempre visibile in app.', 20, y + 2, { maxWidth: 170 });
  y += 10;

  y = drawSection(doc, 'CONDIZIONI E TERMINI DI PAGAMENTO', y);
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text('I pagamenti delle fatture saranno effettuati anticipatamente mediante bonifico bancario.\nCLIK APP SRL - Banca delle Alpi Marittime gruppo BCC Iccrea:\nIBAN IT61L0845001000000000006545', 20, y + 2, { maxWidth: 170 });

  drawFooter(doc, formData);
  return doc;
}

export function generateBuoniOmaggioPdf(formData) {
  const doc = new jsPDF();
  drawHeader(doc);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 51, 102);
  doc.text('PROPOSTA DI CONTRATTO DI FORNITURA BUONI OMAGGIO', 105, 42, { align: 'center' });

  let y = drawSection(doc, 'DATI AZIENDA', 55);
  y = drawCompanyData(doc, formData, y);

  y = drawSection(doc, 'PIATTAFORMA TODUBA', y + 4);
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text('La piattaforma Toduba vi viene offerta senza nessun aggravio di canone e il servizio\npuò essere attivato in 24 ore.', 20, y + 2, { maxWidth: 170 });
  y += 14;

  y = drawSection(doc, 'COMMISSIONE BUONI OMAGGIO CONSORZIO IMPRENDITORI', y);
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Commissione a voi applicata: 5%', 20, y + 2);
  y += 10;

  y = drawSection(doc, 'TEMPI DI ATTIVAZIONE', y);
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text('I tempi di attivazione e consegna sono nulli in quanto il tutto è gestito\ndigitalmente attraverso la piattaforma Toduba.', 20, y + 2, { maxWidth: 170 });
  y += 14;

  y = drawSection(doc, 'SCADENZA', y);
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text('I Buoni Omaggio Consorzio Imprenditori hanno scadenza annuale, sempre visibile in app.', 20, y + 2, { maxWidth: 170 });
  y += 10;

  y = drawSection(doc, 'CONDIZIONI E TERMINI DI PAGAMENTO', y);
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text('I pagamenti delle fatture saranno effettuati anticipatamente mediante bonifico bancario.\nCLIK APP SRL - Banca delle Alpi Marittime gruppo BCC Iccrea:\nIBAN IT61L0845001000000000006545', 20, y + 2, { maxWidth: 170 });

  drawFooter(doc, formData);
  return doc;
}