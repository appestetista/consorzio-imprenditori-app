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
// BUONI PASTO (2 pagine, stile Toduba)
// ════════════════════════════════════════════════════════════════

function drawBPHeader(doc) {
  // Banda beige/rosa in alto (stile Toduba)
  doc.setFillColor(235, 215, 200);
  doc.rect(0, 0, 210, 18, 'F');
  // Logo testo Consorzio Imprenditori centrato
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120, 90, 60);
  doc.text('CONSORZIO IMPRENDITORI', 105, 10, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  // Linea gold sotto
  doc.setFillColor(...C.gold);
  doc.rect(0, 18, 210, 0.8, 'F');
}

function drawBPFooterBand(doc) {
  // Banda beige/rosa in basso con info aziendali (stile Toduba)
  const y = 274;
  doc.setFillColor(235, 215, 200);
  doc.rect(0, y, 210, 23, 'F');
  doc.setFillColor(...C.gold);
  doc.rect(0, y, 210, 0.6, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bolditalic');
  doc.setTextColor(60, 40, 20);
  doc.text('CLIK APP S.r.l. - Piazza Solferino 20 - 10121 Torino +39 011 02 41 887', 105, y + 5, { align: 'center' });
  doc.text('buoni@toduba.it - www.toduba.it', 105, y + 10, { align: 'center' });
  doc.text('P IVA 11821600019 - Capitale Sociale i.v € 944.584,89', 105, y + 15, { align: 'center' });
  doc.setFont('helvetica', 'normal');
}

export function generateBuoniPastoPdf(fd) {
  const doc = new jsPDF();

  // ──────── PAGINA 1 ────────
  drawBPHeader(doc);

  // Titolo principale
  let y = 28;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.navy);
  doc.text('PROPOSTA DI CONTRATTO DI FORNITURA', 105, y, { align: 'center' });
  y += 7;
  doc.text('BUONI PASTO CONSORZIO IMPRENDITORI', 105, y, { align: 'center' });
  y += 4;
  // Linea decorativa
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.6);
  doc.line(40, y, 170, y);

  // Sotto-titolo azienda fornitrice
  y += 7;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.text);
  doc.text('CLIK APP Srl', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(' con sede in Torino, Piazza Solferino 20, 10121 Torino, P.IVA 11821600019', 42, y);
  y += 4;
  doc.setFontSize(7);
  doc.setTextColor(...C.darkGray);
  doc.text('in persona del legale rappresentante munito dei poteri necessari', 20, y);

  // ── Dati azienda ──
  y += 8;
  // Ragione sociale
  doc.setFontSize(7);
  doc.setTextColor(...C.medGray);
  doc.text('Ragione sociale', 20, y);
  doc.setDrawColor(...C.medGray);
  doc.setLineWidth(0.15);
  doc.line(55, y, 190, y);
  doc.setFontSize(10);
  doc.setTextColor(...C.text);
  doc.setFont('helvetica', 'bold');
  if (fd.ragione_sociale) doc.text(fd.ragione_sociale, 56, y);
  doc.setFont('helvetica', 'normal');

  // Indirizzo + Comune
  y += 10;
  doc.setFontSize(7);
  doc.setTextColor(...C.medGray);
  doc.text('Indirizzo', 20, y);
  doc.line(40, y, 105, y);
  doc.text('comune', 112, y);
  doc.line(128, y, 190, y);
  doc.setFontSize(9);
  doc.setTextColor(...C.text);
  if (fd.indirizzo) doc.text(fd.indirizzo, 41, y);
  if (fd.comune) doc.text(fd.comune, 129, y);

  // Cap + Prov + P.iva
  y += 10;
  doc.setFontSize(7);
  doc.setTextColor(...C.medGray);
  doc.text('Cap', 20, y);
  doc.line(30, y, 52, y);
  doc.text('Prov', 58, y);
  doc.line(68, y, 90, y);
  doc.text('P.iva', 96, y);
  doc.line(108, y, 190, y);
  doc.setFontSize(9);
  doc.setTextColor(...C.text);
  if (fd.cap) doc.text(fd.cap, 31, y);
  if (fd.provincia) doc.text(fd.provincia, 69, y);
  if (fd.piva) doc.text(fd.piva, 109, y);

  // Nome referente
  y += 10;
  doc.setFontSize(7);
  doc.setTextColor(...C.medGray);
  doc.text('Nome referente', 20, y);
  doc.line(52, y, 190, y);
  doc.setFontSize(9);
  doc.setTextColor(...C.text);
  if (fd.nome_referente) doc.text(fd.nome_referente, 53, y);

  // Cellulare + Codice SDI/PEC
  y += 10;
  doc.setFontSize(7);
  doc.setTextColor(...C.medGray);
  doc.text('Cellulare', 20, y);
  doc.line(38, y, 105, y);
  doc.text('Codice SDI/PEC', 112, y);
  doc.line(140, y, 190, y);
  doc.setFontSize(9);
  doc.setTextColor(...C.text);
  if (fd.cellulare) doc.text(fd.cellulare, 39, y);
  if (fd.sdi_pec) doc.text(fd.sdi_pec, 141, y);

  // Email
  y += 10;
  doc.setFontSize(7);
  doc.setTextColor(...C.medGray);
  doc.text('Email', 20, y);
  doc.line(32, y, 190, y);
  doc.setFontSize(9);
  doc.setTextColor(...C.text);
  if (fd.email) doc.text(fd.email, 33, y);

  // ── Locale Preferito (se compilato) ──
  if (fd.locale_preferito && fd.locale_preferito.trim()) {
    y += 12;
    // Calcola altezza dinamica del box
    const localeLines = doc.splitTextToSize(fd.locale_preferito, 120);
    const localitaText = fd.localita_locale_preferito ? fd.localita_locale_preferito.trim() : '';
    const boxH = 32 + (localeLines.length > 1 ? (localeLines.length - 1) * 4.5 : 0) + (localitaText ? 6 : 0);

    // Box evidenziato
    doc.setFillColor(245, 248, 255);
    doc.setDrawColor(...C.accent);
    doc.setLineWidth(0.5);
    doc.roundedRect(18, y - 3, 174, boxH, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.navy);
    doc.text('LOCALE PREFERITO PER CONVENZIONE', 22, y + 3);

    // Nome locale
    let innerY = y + 10;
    doc.setFontSize(7);
    doc.setTextColor(...C.medGray);
    doc.setFont('helvetica', 'normal');
    doc.text('Nome locale:', 22, innerY);
    doc.setFontSize(10);
    doc.setTextColor(...C.text);
    doc.setFont('helvetica', 'bold');
    doc.text(localeLines, 52, innerY);
    innerY += localeLines.length * 4.5 + 2;

    // Località
    if (localitaText) {
      doc.setFontSize(7);
      doc.setTextColor(...C.medGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Località:', 22, innerY);
      doc.setFontSize(10);
      doc.setTextColor(...C.text);
      doc.setFont('helvetica', 'bold');
      doc.text(localitaText, 52, innerY);
      innerY += 6;
    }

    // Clausola
    innerY += 2;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...C.darkGray);
    doc.text('N.B. Il presente contratto sarà valido per il locale sopra indicato solo previa verifica della disponibilità', 22, innerY);
    doc.text('da parte della nostra direzione. In caso di indisponibilità, il cliente sarà tempestivamente informato.', 22, innerY + 3.5);
    doc.setFont('helvetica', 'normal');

    y += boxH + 2;
  }

  // ── Costo del Servizio ──
  y += 14;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.navy);
  doc.text('Costo del Servizio Buoni Pasto', 20, y);
  y += 3;
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.5);
  doc.line(20, y, 120, y);

  y += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text);
  doc.text('Valore facciale del buono pasto:', 20, y);
  doc.setFont('helvetica', 'bold');
  doc.text(fd.valore_buono ? `€ ${fd.valore_buono} IVA esclusa` : '________________ € IVA esclusa', 80, y);

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.darkGray);
  const costoLines = [
    'Per il servizio di fornitura dei Buoni Pasto, viene applicata una commissione di servizio',
    'calcolata come segue:',
    '',
    '    •  5% sull\'importo totale fino a € 30.000',
    '    •  3% sull\'importo eccedente € 30.000',
    '',
    'La commissione di servizio verrà fatturata contestualmente alla fornitura dei buoni.'
  ];
  costoLines.forEach(line => {
    doc.text(line, 20, y);
    y += 4.5;
  });

  // ── Condizioni e termini di pagamento ──
  y += 4;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.navy);
  doc.text('Condizioni e termini di pagamento', 20, y);
  y += 3;
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.5);
  doc.line(20, y, 130, y);

  y += 7;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text);
  doc.text('I pagamenti delle fatture saranno effettuati anticipatamente mediante', 20, y);
  y += 4.5;
  doc.text('bonifico bancario CLIK APP SRL – Banca delle Alpi Marittime gruppo BCC Iccrea:', 20, y);
  y += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.text('IBAN IT61L0845001000000000006545', 20, y);
  doc.setFont('helvetica', 'normal');

  drawBPFooterBand(doc);

  // ──────── PAGINA 2 ────────
  doc.addPage();
  drawBPHeader(doc);

  y = 28;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text);
  doc.text('Con i ', 20, y);
  doc.setFont('helvetica', 'bold');
  doc.text('Buoni Pasto Consorzio Imprenditori', 32, y);
  doc.setFont('helvetica', 'normal');
  doc.text(' la vostra azienda non dovrà più', 98, y);
  y += 5;
  doc.text('sostenere nessun costo diretto o indiretto e i Buoni saranno caricati in tempo', 20, y);
  y += 5;
  doc.text('reale nel portafoglio digitale di ogni dipendente che avrà sempre sotto controllo', 20, y);
  y += 5;
  doc.text('sull\'app il saldo residuo.', 20, y);

  y += 8;
  doc.text('Inoltre grazie al sistema ', 20, y);
  doc.setFont('helvetica', 'bold');
  doc.text('geolocalizzato integrato', 62, y);
  doc.setFont('helvetica', 'normal');
  doc.text(', ogni dipendente potrà', 103, y);
  y += 5;
  doc.text('visionare in tempo reale sull\'app tutti i punti vendita convenzionati e nel caso', 20, y);
  y += 5;
  doc.text('gradisse l\'attivazione di un esercizio mancante, questo sarà contattato per', 20, y);
  y += 5;
  doc.text('l\'attivazione.', 20, y);

  // Vantaggi per l'azienda
  y += 10;
  doc.setFontSize(9);
  doc.setTextColor(...C.text);
  doc.text('Vantaggi per l\'azienda nell\'utilizzare i Buoni Pasto Consorzio Imprenditori:', 20, y);

  y += 8;
  const vantaggi = [
    'Sono totalmente esenti da oneri fiscali e previdenziali',
    'Sono deducibili al 100% rispetto a IRAP e IRES e non sono sottoposti a costi IRPEF',
    'L\'IVA al 4% è interamente detraibile',
    'Zero costi di gestione del servizio',
    'Ottimizzazione attività contabili e pratiche amministrative',
    'Limite esenzione fiscale 8€ sui Buoni Pasto Consorzio Imprenditori',
    'Attivazione di locali graditi',
  ];
  vantaggi.forEach((v) => {
    // Icona fulmine verde (simula con triangolo)
    doc.setFillColor(0, 160, 80);
    doc.triangle(23, y - 2.5, 25, y + 0.5, 21, y + 0.5, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.text);
    doc.text(v, 29, y);
    doc.setFont('helvetica', 'normal');
    y += 7;
  });

  // ── Firma ──
  y += 8;
  const today = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });

  doc.setFontSize(9);
  doc.setTextColor(...C.darkGray);
  doc.text('Luogo, data', 20, y);
  doc.text('Clik App Srl', 140, y);

  y += 6;
  doc.setDrawColor(...C.text);
  doc.setLineWidth(0.3);
  doc.line(20, y, 80, y);
  doc.line(140, y, 190, y);

  y += 14;
  doc.setFontSize(9);
  doc.text('Firma e timbro per accettazione', 20, y);

  y += 6;
  doc.setDrawColor(...C.text);
  doc.setLineWidth(0.4);
  doc.line(20, y, 190, y);

  drawBPFooterBand(doc);

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