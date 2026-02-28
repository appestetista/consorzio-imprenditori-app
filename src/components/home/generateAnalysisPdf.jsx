import { jsPDF } from 'jspdf';

const GOLD = [196, 169, 81];
const DARK = [30, 30, 40];
const WHITE = [255, 255, 255];
const GRAY = [160, 160, 170];
const SECTION_COLORS = {
  sintesi: [196, 169, 81],
  impatto: [52, 211, 153],
  rischi: [248, 113, 113],
  tempo: [96, 165, 250],
  raccomandazione: [163, 230, 53],
};

const SECTION_LABELS = {
  sintesi: 'Sintesi Decisionale',
  impatto: 'Impatto Economico Stimato',
  rischi: 'Rischi e Criticità',
  tempo: 'Tempo di Attuazione',
  raccomandazione: 'Raccomandazione Finale',
};

function wrapText(doc, text, maxWidth) {
  return doc.splitTextToSize(text || '', maxWidth);
}

export default function generateAnalysisPdf({ parsed, classification, category, userQuestion, plan }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentW = pw - margin * 2;
  let y = 20;

  const checkPage = (needed) => {
    if (y + needed > 275) {
      doc.addPage();
      y = 20;
    }
  };

  // Header
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pw, 38, 'F');
  doc.setTextColor(...GOLD);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Centro Decisionale Imprenditore', pw / 2, 16, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  const today = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(`Analisi del ${today}`, pw / 2, 24, { align: 'center' });

  // Badge categoria
  const cat = classification?.categoria || category || '';
  const sub = classification?.sottocategoria || '';
  if (cat) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GOLD);
    const badge = sub ? `${cat} — ${sub}` : cat;
    doc.text(badge.toUpperCase(), pw / 2, 32, { align: 'center' });
  }

  y = 46;

  // Richiesta utente
  if (userQuestion) {
    checkPage(20);
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.text('RICHIESTA DELL\'UTENTE', margin, y);
    y += 5;
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 90);
    doc.setFont('helvetica', 'italic');
    const lines = wrapText(doc, `"${userQuestion}"`, contentW);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 6;
  }

  // Linea separatrice
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pw - margin, y);
  y += 8;

  // Sezioni analisi
  const sectionKeys = ['sintesi', 'impatto', 'rischi', 'tempo', 'raccomandazione'];
  for (const key of sectionKeys) {
    const content = parsed[key];
    if (!content) continue;

    const color = SECTION_COLORS[key] || GOLD;
    const label = SECTION_LABELS[key];

    const lines = wrapText(doc, content, contentW - 4);
    const blockH = 8 + lines.length * 4.5 + 4;
    checkPage(blockH);

    // Barra laterale colorata
    doc.setFillColor(...color);
    doc.rect(margin, y, 2, blockH - 2, 'F');

    // Titolo sezione
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...color);
    doc.text(label.toUpperCase(), margin + 6, y + 5);

    // Contenuto
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 70);
    doc.text(lines, margin + 6, y + 11);
    y += blockH + 3;
  }

  // Piano operativo
  if (plan) {
    checkPage(15);
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pw - margin, y);
    y += 8;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GOLD);
    doc.text('PIANO OPERATIVO', margin, y);
    y += 6;

    if (plan.titolo_piano) {
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 50);
      doc.text(plan.titolo_piano, margin, y);
      y += 5;
    }

    // Durata + budget
    const meta = [plan.durata_totale && `Durata: ${plan.durata_totale}`, plan.budget_stimato && `Budget: ${plan.budget_stimato}`].filter(Boolean).join('  |  ');
    if (meta) {
      doc.setFontSize(8.5);
      doc.setTextColor(...GRAY);
      doc.setFont('helvetica', 'normal');
      doc.text(meta, margin, y);
      y += 7;
    }

    // Fasi
    if (plan.fasi?.length) {
      for (const fase of plan.fasi) {
        const azioniLines = (fase.azioni || []).map(a => `• ${a}`);
        const azioniText = azioniLines.join('\n');
        const wrappedAzioni = wrapText(doc, azioniText, contentW - 12);
        const faseH = 12 + wrappedAzioni.length * 4 + 6;
        checkPage(faseH);

        // Numero fase
        doc.setFillColor(...GOLD);
        doc.circle(margin + 3, y + 2, 3, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...WHITE);
        doc.text(String(fase.numero || ''), margin + 3, y + 3, { align: 'center' });

        // Nome fase
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40, 40, 50);
        doc.text(fase.nome || '', margin + 9, y + 3);
        y += 7;

        // Meta fase
        const faseMeta = [fase.durata, fase.responsabile && `Resp: ${fase.responsabile}`, fase.costo_stimato && `Costo: ${fase.costo_stimato}`].filter(Boolean).join('  |  ');
        if (faseMeta) {
          doc.setFontSize(7.5);
          doc.setTextColor(...GRAY);
          doc.setFont('helvetica', 'normal');
          doc.text(faseMeta, margin + 9, y);
          y += 4;
        }

        // Azioni
        if (wrappedAzioni.length) {
          doc.setFontSize(8.5);
          doc.setTextColor(70, 70, 80);
          doc.setFont('helvetica', 'normal');
          doc.text(wrappedAzioni, margin + 9, y + 1);
          y += wrappedAzioni.length * 3.8 + 4;
        }
        y += 2;
      }
    }

    // Primo passo domani
    if (plan.primo_passo_domani) {
      const ppLines = wrapText(doc, plan.primo_passo_domani, contentW - 8);
      checkPage(12 + ppLines.length * 4);

      doc.setFillColor(255, 248, 220);
      doc.roundedRect(margin, y, contentW, 8 + ppLines.length * 4.5, 2, 2, 'F');
      doc.setDrawColor(...GOLD);
      doc.roundedRect(margin, y, contentW, 8 + ppLines.length * 4.5, 2, 2, 'S');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...GOLD);
      doc.text('IL TUO PRIMO PASSO DOMANI', margin + 4, y + 5);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 70);
      doc.text(ppLines, margin + 4, y + 10);
      y += 12 + ppLines.length * 4.5;
    }
  }

  // Footer
  checkPage(15);
  y += 8;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pw - margin, y);
  y += 6;
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'italic');
  doc.text('Generato da Centro Decisionale Imprenditore', pw / 2, y, { align: 'center' });

  // Nome file
  const catSlug = (cat || 'Analisi').replace(/[^a-zA-Z0-9]/g, '_');
  const dateSlug = new Date().toISOString().slice(0, 10);
  doc.save(`Analisi_${catSlug}_${dateSlug}.pdf`);
}