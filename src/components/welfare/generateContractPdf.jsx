import { jsPDF } from 'jspdf';

// ─── COLORI CORPORATE ───
const C = {
  navy: [0, 41, 82],
  navyLight: [0, 61, 122],
  gold: [191, 155, 48],
  goldLight: [220, 190, 90],
  white: [255, 255, 255],
  offWhite: [248, 248, 250],
  lightGray: [235, 237, 242],
  medGray: [180, 185, 195],
  darkGray: [80, 85, 95],
  text: [30, 35, 45],
  accent: [0, 102, 179],
};

// ─── DECORAZIONI ───
function drawPageBorder(doc) {
  // Bordo esterno doppio
  doc.setDrawColor(...C.navy);
  doc.setLineWidth(1.2);
  doc.rect(8, 8, 194, 281);
  doc.setLineWidth(0.3);
  doc.rect(11, 11, 188, 275);
  // Angoli decorativi (piccoli rombi)
  const corners = [[11, 11], [199, 11], [11, 286], [199, 286]];
  corners.forEach(([cx, cy]) => {
    doc.setFillColor(...C.gold);
    doc.circle(cx, cy, 1.8, 'F');
  });
}

function drawHeaderBand(doc) {
  // Banda superiore navy con sfumatura simulata
  doc.setFillColor(...C.navy);
  doc.rect(11, 11, 188, 32, 'F');
  // Linea gold sotto header
  doc.setFillColor(...C.gold);
  doc.rect(11, 43, 188, 1.5, 'F');
  // Logo testo
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('CONSORZIO IMPRENDITORI', 105, 24, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.goldLight);
  doc.text('CLIK APP Srl  •  Piazza Solferino 20, 10121 Torino  •  P.IVA 11821600019', 105, 32, { align: 'center' });
  doc.setTextColor(200, 210, 230);
  doc.setFontSize(7);
  doc.text('Tel. 011 0000000  •  info@consorzioimprenditori.it  •  www.consorzioimprenditori.it', 105, 38, { align: 'center' });
}

function drawSubtitleBand(doc, title) {
  const y = 50;
  // Linea gold sottile
  doc.setFillColor(...C.offWhite);
  doc.rect(15, y - 2, 180, 11, 'F');
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.4);
  doc.line(15, y - 2, 195, y - 2);
  doc.line(15, y + 9, 195, y + 9);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.navy);
  doc.text(title, 105, y + 5, { align: 'center' });
  return y + 16;
}

function drawSectionHeader(doc, title, y) {
  // Barra sezione con accento laterale
  doc.setFillColor(...C.navy);
  doc.rect(15, y - 1, 3, 7, 'F'); // barra laterale
  doc.setFillColor(...C.lightGray);
  doc.rect(19, y - 1, 176, 7, 'F'); // sfondo
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.navy);
  doc.text(title, 22, y + 3.5);
  doc.setFont('helvetica', 'normal');
  return y + 11;
}

function drawFieldPair(doc, label1, value1, label2, value2, y, x1 = 20, w1 = 80, x2 = 110, w2 = 80) {
  doc.setFontSize(6.5);
  doc.setTextColor(...C.medGray);
  doc.text(label1.toUpperCase(), x1, y);
  if (label2) doc.text(label2.toUpperCase(), x2, y);
  doc.setFontSize(10);
  doc.setTextColor(...C.text);
  doc.setFont('helvetica', 'bold');
  doc.text(value1 || '—', x1, y + 5);
  if (label2) doc.text(value2 || '—', x2, y + 5);
  doc.setFont('helvetica', 'normal');
  // Linea sottile sotto
  doc.setDrawColor(...C.lightGray);
  doc.setLineWidth(0.2);
  doc.line(x1, y + 7, x1 + w1, y + 7);
  if (label2) doc.line(x2, y + 7, x2 + w2, y + 7);
  return y + 13;
}

function drawFieldFull(doc, label, value, y) {
  doc.setFontSize(6.5);
  doc.setTextColor(...C.medGray);
  doc.text(label.toUpperCase(), 20, y);
  doc.setFontSize(10);
  doc.setTextColor(...C.text);
  doc.setFont('helvetica', 'bold');
  doc.text(value || '—', 20, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(...C.lightGray);
  doc.setLineWidth(0.2);
  doc.line(20, y + 7, 190, y + 7);
  return y + 13;
}

function drawCompanyBlock(doc, fd, startY) {
  let y = startY;
  y = drawFieldFull(doc, 'Ragione Sociale', fd.ragione_sociale, y);
  y = drawFieldPair(doc, 'Indirizzo', fd.indirizzo, 'Comune', fd.comune, y);
  y = drawFieldPair(doc, 'CAP', fd.cap, 'Provincia', fd.provincia, y, 20, 35, 65, 25);
  // P.IVA sulla stessa riga
  doc.setFontSize(6.5);
  doc.setTextColor(...C.medGray);
  doc.text('P.IVA', 100, y - 13 + 13);
  doc.setFontSize(10);
  doc.setTextColor(...C.text);
  doc.setFont('helvetica', 'bold');
  doc.text(fd.piva || '—', 100, y - 13 + 18);
  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(...C.lightGray);
  doc.line(100, y - 13 + 20, 190, y - 13 + 20);
  y += 0; // già contato sopra

  y = drawFieldFull(doc, 'Codice Fiscale', fd.codice_fiscale, y);
  y = drawFieldPair(doc, 'Referente', fd.nome_referente, 'Cellulare', fd.cellulare, y);
  y = drawFieldPair(doc, 'Codice SDI / PEC', fd.sdi_pec, 'Email', fd.email, y);
  return y;
}

function drawTextBlock(doc, text, y, opts = {}) {
  const { indent = 20, maxW = 170, size = 8 } = opts;
  doc.setFontSize(size);
  doc.setTextColor(...C.darkGray);
  doc.setFont('helvetica', 'normal');
  const lines = doc.splitTextToSize(text, maxW);
  doc.text(lines, indent, y);
  return y + lines.length * (size * 0.45) + 3;
}

function drawBullets(doc, items, y) {
  doc.setFontSize(8);
  doc.setTextColor(...C.darkGray);
  items.forEach((item, i) => {
    // Pallino gold
    doc.setFillColor(...C.gold);
    doc.circle(23, y + (i * 5.5) - 0.5, 0.8, 'F');
    doc.text(item, 27, y + (i * 5.5));
  });
  return y + items.length * 5.5 + 2;
}

function drawHighlightBox(doc, text, y) {
  const lines = doc.splitTextToSize(text, 164);
  const h = lines.length * 5 + 6;
  doc.setFillColor(245, 248, 255);
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.4);
  doc.roundedRect(18, y, 174, h, 2, 2, 'FD');
  doc.setFontSize(9);
  doc.setTextColor(...C.navy);
  doc.setFont('helvetica', 'bold');
  doc.text(lines, 25, y + 5);
  doc.setFont('helvetica', 'normal');
  return y + h + 4;
}

function drawFooterArea(doc, fd) {
  const y = 248;
  // Linea decorativa
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.5);
  doc.line(15, y, 195, y);
  doc.setDrawColor(...C.navy);
  doc.setLineWidth(0.15);
  doc.line(15, y + 1, 195, y + 1);

  const today = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });

  doc.setFontSize(8);
  doc.setTextColor(...C.darkGray);
  doc.text(`Luogo e data: ${fd.comune || '____________'}, ${today}`, 20, y + 9);

  // Box firma cliente
  doc.setFillColor(...C.offWhite);
  doc.rect(18, y + 14, 75, 22, 'F');
  doc.setDrawColor(...C.medGray);
  doc.setLineWidth(0.2);
  doc.rect(18, y + 14, 75, 22, 'S');
  doc.setFontSize(7);
  doc.setTextColor(...C.medGray);
  doc.text('FIRMA E TIMBRO DEL CLIENTE', 55.5, y + 18, { align: 'center' });
  doc.setDrawColor(...C.navy);
  doc.setLineWidth(0.3);
  doc.line(25, y + 32, 86, y + 32);

  // Box firma CLIK APP
  doc.setFillColor(...C.offWhite);
  doc.rect(117, y + 14, 75, 22, 'F');
  doc.setDrawColor(...C.medGray);
  doc.setLineWidth(0.2);
  doc.rect(117, y + 14, 75, 22, 'S');
  doc.setFontSize(7);
  doc.setTextColor(...C.medGray);
  doc.text('CLIK APP Srl', 154.5, y + 18, { align: 'center' });
  doc.setDrawColor(...C.navy);
  doc.setLineWidth(0.3);
  doc.line(124, y + 32, 185, y + 32);

  // Footer basso
  doc.setFontSize(6);
  doc.setTextColor(...C.medGray);
  doc.text('Documento generato digitalmente tramite Consorzio Imprenditori App', 105, 283, { align: 'center' });
}

// ════════════════════════════════════════════════════════════════
// BUONI PASTO
// ════════════════════════════════════════════════════════════════
export function generateBuoniPastoPdf(fd) {
  const doc = new jsPDF();
  drawPageBorder(doc);
  drawHeaderBand(doc);
  let y = drawSubtitleBand(doc, 'PROPOSTA DI CONTRATTO DI FORNITURA BUONI PASTO');

  y = drawSectionHeader(doc, 'DATI AZIENDA COMMITTENTE', y);
  y = drawCompanyBlock(doc, fd, y);

  y = drawSectionHeader(doc, 'CONDIZIONI ECONOMICHE BUONI PASTO', y + 2);
  y = drawFieldPair(doc, 'Sconto applicato (%)', fd.sconto_percentuale ? `${fd.sconto_percentuale}%` : '', 'Valore facciale buono (€)', fd.valore_buono ? `€ ${fd.valore_buono}` : '', y);

  y = drawSectionHeader(doc, 'CONDIZIONI E TERMINI DI PAGAMENTO', y + 1);
  y = drawHighlightBox(doc, 'Pagamento anticipato mediante bonifico bancario.\nCLIK APP SRL — Banca delle Alpi Marittime (BCC Iccrea)\nIBAN: IT61L0845001000000000006545', y);

  y = drawSectionHeader(doc, 'VANTAGGI PER L\'AZIENDA', y);
  y = drawBullets(doc, [
    'Totalmente esenti da oneri fiscali e previdenziali',
    'Deducibili al 100% rispetto a IRAP e IRES, no IRPEF',
    'IVA al 4% interamente detraibile',
    'Zero costi di gestione del servizio',
    'Ottimizzazione attività contabili e pratiche amministrative',
    'Limite esenzione fiscale 10€ sui Buoni Pasto digitali',
    'Attivazione di locali graditi',
  ], y);

  drawFooterArea(doc, fd);
  return doc;
}

// ════════════════════════════════════════════════════════════════
// BUONI SPESA
// ════════════════════════════════════════════════════════════════
export function generateBuoniSpesaPdf(fd) {
  const doc = new jsPDF();
  drawPageBorder(doc);
  drawHeaderBand(doc);
  let y = drawSubtitleBand(doc, 'PROPOSTA DI CONTRATTO DI FORNITURA BUONI SPESA');

  y = drawSectionHeader(doc, 'DATI AZIENDA COMMITTENTE', y);
  y = drawCompanyBlock(doc, fd, y);

  y = drawSectionHeader(doc, 'PIATTAFORMA TODUBA', y + 2);
  y = drawTextBlock(doc, 'La piattaforma Toduba vi viene offerta senza nessun aggravio di canone e il servizio può essere attivato in 24 ore.', y);

  y = drawSectionHeader(doc, 'COMMISSIONE BUONI SPESA', y);
  y = drawHighlightBox(doc, 'Commissione applicata: 5%', y);

  y = drawSectionHeader(doc, 'TEMPI DI ATTIVAZIONE', y);
  y = drawTextBlock(doc, 'I tempi di attivazione e consegna sono nulli in quanto il tutto è gestito digitalmente attraverso la piattaforma Toduba.', y);

  y = drawSectionHeader(doc, 'SCADENZA', y);
  y = drawTextBlock(doc, 'I Buoni Spesa Consorzio Imprenditori hanno scadenza annuale, sempre visibile in app.', y);

  y = drawSectionHeader(doc, 'CONDIZIONI E TERMINI DI PAGAMENTO', y);
  y = drawHighlightBox(doc, 'Pagamento anticipato mediante bonifico bancario.\nCLIK APP SRL — Banca delle Alpi Marittime (BCC Iccrea)\nIBAN: IT61L0845001000000000006545', y);

  drawFooterArea(doc, fd);
  return doc;
}

// ════════════════════════════════════════════════════════════════
// BUONI OMAGGIO
// ════════════════════════════════════════════════════════════════
export function generateBuoniOmaggioPdf(fd) {
  const doc = new jsPDF();
  drawPageBorder(doc);
  drawHeaderBand(doc);
  let y = drawSubtitleBand(doc, 'PROPOSTA DI CONTRATTO DI FORNITURA BUONI OMAGGIO');

  y = drawSectionHeader(doc, 'DATI AZIENDA COMMITTENTE', y);
  y = drawCompanyBlock(doc, fd, y);

  y = drawSectionHeader(doc, 'PIATTAFORMA TODUBA', y + 2);
  y = drawTextBlock(doc, 'La piattaforma Toduba vi viene offerta senza nessun aggravio di canone e il servizio può essere attivato in 24 ore.', y);

  y = drawSectionHeader(doc, 'COMMISSIONE BUONI OMAGGIO', y);
  y = drawHighlightBox(doc, 'Commissione applicata: 5%', y);

  y = drawSectionHeader(doc, 'TEMPI DI ATTIVAZIONE', y);
  y = drawTextBlock(doc, 'I tempi di attivazione e consegna sono nulli in quanto il tutto è gestito digitalmente attraverso la piattaforma Toduba.', y);

  y = drawSectionHeader(doc, 'SCADENZA', y);
  y = drawTextBlock(doc, 'I Buoni Omaggio Consorzio Imprenditori hanno scadenza annuale, sempre visibile in app.', y);

  y = drawSectionHeader(doc, 'CONDIZIONI E TERMINI DI PAGAMENTO', y);
  y = drawHighlightBox(doc, 'Pagamento anticipato mediante bonifico bancario.\nCLIK APP SRL — Banca delle Alpi Marittime (BCC Iccrea)\nIBAN: IT61L0845001000000000006545', y);

  drawFooterArea(doc, fd);
  return doc;
}