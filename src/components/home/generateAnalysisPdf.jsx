import { jsPDF } from 'jspdf';

// --- Palette ---
const GOLD = [196, 169, 81];
const BLACK = [30, 30, 35];
const WHITE = [255, 255, 255];
const GRAY = [130, 130, 140];
const LIGHT_GRAY = [220, 220, 225];
const TEXT = [45, 45, 55];
const TEXT_LIGHT = [90, 90, 100];

const CATEGORY_HEX = {
  'Fiscale':       [16, 185, 129],
  'Legale':        [59, 130, 246],
  'Marketing':     [168, 85, 247],
  'Personale/HR':  [249, 115, 22],
  'Investimenti':  [196, 169, 81],
  'Operativa':     [6, 182, 212],
  'Strategica':    [239, 68, 68],
  'Confronto':     [99, 102, 241],
};

const SECTION_COLORS = {
  sintesi:         [196, 169, 81],
  impatto:         [16, 185, 129],
  rischi:          [239, 68, 68],
  tempo:           [139, 92, 246],
  raccomandazione: [196, 169, 81],
};

const SECTION_LABELS = {
  sintesi: 'Sintesi Decisionale',
  impatto: 'Impatto Economico',
  rischi: 'Rischi e Criticità',
  tempo: 'Tempo di Attuazione',
  raccomandazione: 'Raccomandazione Finale',
};

function cleanTaggedText(text) {
  if (!text) return '';
  return text.replace(/\[(VERIFICATO|STIMA|DA CONFERMARE)\s*[—–-]?\s*[^\]]*\]/g, '').trim();
}

function wrap(doc, text, maxW) {
  return doc.splitTextToSize(cleanTaggedText(text) || '', maxW);
}

export default function generateAnalysisPdf({ parsed, classification, category, userQuestion, plan }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 16; // margin
  const cw = pw - m * 2; // content width
  let y = 0;

  const cat = classification?.categoria || category || '';
  const sub = classification?.sottocategoria || '';
  const accentColor = CATEGORY_HEX[cat] || GOLD;

  const addFooter = () => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...GRAY);
    doc.text('Analisi generata con dati verificati da fonti ufficiali. Verifica sempre con il tuo consulente.', pw / 2, ph - 8, { align: 'center' });
    doc.setDrawColor(...LIGHT_GRAY);
    doc.line(m, ph - 12, pw - m, ph - 12);
  };

  const checkPage = (needed) => {
    if (y + needed > ph - 18) {
      addFooter();
      doc.addPage();
      y = 14;
    }
  };

  // ===== HEADER =====
  doc.setFillColor(250, 250, 252);
  doc.rect(0, 0, pw, 42, 'F');
  // Accent line top
  doc.setFillColor(...accentColor);
  doc.rect(0, 0, pw, 1.5, 'F');

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK);
  doc.text('CONSORZIO', m, 16);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text('Analisi AI', m + doc.getTextWidth('CONSORZIO') + 3, 16);

  // Data
  const today = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_LIGHT);
  doc.text(today, pw - m, 16, { align: 'right' });

  // Categoria + sottocategoria
  if (cat) {
    y = 28;
    // Badge background
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    const badgeText = cat.toUpperCase();
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const badgeW = doc.getTextWidth(badgeText) + 8;
    doc.roundedRect(m, y - 4, badgeW, 7, 1.5, 1.5, 'F');
    doc.setTextColor(...WHITE);
    doc.text(badgeText, m + 4, y + 1);

    if (sub) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT_LIGHT);
      doc.text(sub, m + badgeW + 3, y + 1);
    }
  }

  y = 48;

  // ===== AFFIDABILITA =====
  if (parsed.affidabilita) {
    const aff = parsed.affidabilita;
    const punteggio = aff.punteggio ?? 0;
    checkPage(22);

    // Box
    doc.setFillColor(248, 248, 250);
    doc.roundedRect(m, y, cw, 18, 2, 2, 'F');
    doc.setDrawColor(...LIGHT_GRAY);
    doc.roundedRect(m, y, cw, 18, 2, 2, 'S');

    // Label
    let affLabel = 'Affidabilità dati';
    if (punteggio >= 8) affLabel = 'Alta affidabilità';
    else if (punteggio >= 5) affLabel = 'Media affidabilità';
    else affLabel = 'Bassa affidabilità';

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLACK);
    doc.text(affLabel, m + 4, y + 6);

    // Punteggio
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...accentColor);
    doc.text(`${punteggio}/10`, pw - m - 4, y + 6, { align: 'right' });

    // Barra
    const barX = m + 4;
    const barY = y + 9;
    const barW = cw - 8;
    const barH = 2.5;
    doc.setFillColor(230, 230, 235);
    doc.roundedRect(barX, barY, barW, barH, 1, 1, 'F');
    const fillW = Math.min(barW * (punteggio / 10), barW);
    let barC = [16, 185, 129];
    if (punteggio < 5) barC = [239, 68, 68];
    else if (punteggio < 8) barC = [245, 158, 11];
    doc.setFillColor(...barC);
    doc.roundedRect(barX, barY, fillW, barH, 1, 1, 'F');

    // Dettagli sotto barra
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_LIGHT);
    const affParts = [];
    if (aff.verificati != null) affParts.push(`${aff.verificati} verificati`);
    if (aff.stimati != null) affParts.push(`${aff.stimati} stimati`);
    if (aff.da_confermare != null) affParts.push(`${aff.da_confermare} da confermare`);
    if (affParts.length > 0) {
      doc.text(affParts.join('   •   '), m + 4, y + 16);
    }

    y += 22;
  }

  // ===== DOMANDA UTENTE =====
  if (userQuestion) {
    checkPage(18);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRAY);
    doc.text('DOMANDA', m, y + 4);
    y += 7;
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...TEXT);
    const qLines = wrap(doc, `"${userQuestion}"`, cw);
    doc.text(qLines, m, y);
    y += qLines.length * 4.5 + 4;

    doc.setDrawColor(...LIGHT_GRAY);
    doc.line(m, y, pw - m, y);
    y += 6;
  }

  // ===== 5 SEZIONI =====
  const sectionKeys = ['sintesi', 'impatto', 'rischi', 'tempo', 'raccomandazione'];
  for (const key of sectionKeys) {
    const content = parsed[key];
    if (!content) continue;

    const color = SECTION_COLORS[key] || GOLD;
    const label = SECTION_LABELS[key];
    const isRaccomandazione = key === 'raccomandazione';

    const lines = wrap(doc, content, cw - 8);
    const blockH = 10 + lines.length * 4.2 + 4;
    checkPage(blockH);

    // Accent bar left
    doc.setFillColor(...color);
    doc.rect(m, y, isRaccomandazione ? 3 : 2, blockH - 2, 'F');

    // Background per raccomandazione
    if (isRaccomandazione) {
      doc.setFillColor(255, 252, 240);
      doc.rect(m + 3, y, cw - 3, blockH - 2, 'F');
    }

    // Label
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...color);
    doc.text(label.toUpperCase(), m + 7, y + 5);

    // Content
    doc.setFontSize(isRaccomandazione ? 10 : 9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT);
    doc.text(lines, m + 7, y + 11);
    y += blockH + 2;
  }

  // ===== FONTI =====
  if (parsed.fonti?.length > 0) {
    checkPage(10 + parsed.fonti.length * 5);
    y += 2;
    doc.setDrawColor(...LIGHT_GRAY);
    doc.line(m, y, pw - m, y);
    y += 6;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRAY);
    doc.text('FONTI CONSULTATE', m, y);
    y += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    for (const f of parsed.fonti) {
      checkPage(6);
      const tipoLabel = f.tipo === 'istituzionale' ? '🏛' : f.tipo === 'specializzata' ? '📚' : f.tipo === 'media' ? '📰' : '🌐';
      doc.setTextColor(...TEXT);
      doc.text(`${tipoLabel}  ${f.nome || ''}`, m + 2, y);
      if (f.url) {
        doc.setTextColor(59, 130, 246);
        const urlText = f.url.length > 70 ? f.url.substring(0, 70) + '...' : f.url;
        doc.textWithLink(urlText, m + 2, y + 4, { url: f.url });
        y += 9;
      } else {
        y += 5;
      }
    }
  }

  // ===== PIANO OPERATIVO =====
  if (plan) {
    y += 4;
    checkPage(15);
    doc.setDrawColor(...LIGHT_GRAY);
    doc.line(m, y, pw - m, y);
    y += 8;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...accentColor);
    doc.text('PIANO OPERATIVO', m, y);
    y += 6;

    if (plan.titolo_piano) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BLACK);
      doc.text(plan.titolo_piano, m, y);
      y += 5;
    }

    const meta = [
      plan.durata_totale && `Durata: ${plan.durata_totale}`,
      plan.budget_stimato && `Budget: ${plan.budget_stimato}`
    ].filter(Boolean).join('   |   ');
    if (meta) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY);
      doc.text(meta, m, y);
      y += 7;
    }

    // Fasi
    if (plan.fasi?.length) {
      for (const fase of plan.fasi) {
        const azioniText = (fase.azioni || []).map(a => `• ${a}`).join('\n');
        const wAzioni = wrap(doc, azioniText, cw - 14);
        const faseH = 14 + wAzioni.length * 3.8 + 4;
        checkPage(faseH);

        // Numero
        doc.setFillColor(...accentColor);
        doc.circle(m + 3, y + 2.5, 3, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...WHITE);
        doc.text(String(fase.numero || ''), m + 3, y + 3.5, { align: 'center' });

        // Nome
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLACK);
        doc.text(fase.nome || '', m + 9, y + 3.5);
        y += 7;

        // Meta
        const fMeta = [
          fase.durata,
          fase.responsabile && `Resp: ${fase.responsabile}`,
          fase.costo_stimato && `Costo: ${fase.costo_stimato}`
        ].filter(Boolean).join('  |  ');
        if (fMeta) {
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...GRAY);
          doc.text(fMeta, m + 9, y);
          y += 4;
        }

        // Azioni
        if (wAzioni.length) {
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...TEXT);
          doc.text(wAzioni, m + 9, y + 1);
          y += wAzioni.length * 3.8 + 3;
        }
        y += 2;
      }
    }

    // Primo passo
    if (plan.primo_passo_domani) {
      const ppLines = wrap(doc, plan.primo_passo_domani, cw - 10);
      const ppH = 10 + ppLines.length * 4.2;
      checkPage(ppH);

      doc.setFillColor(255, 252, 235);
      doc.roundedRect(m, y, cw, ppH, 2, 2, 'F');
      doc.setDrawColor(...accentColor);
      doc.roundedRect(m, y, cw, ppH, 2, 2, 'S');

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...accentColor);
      doc.text('PRIMO PASSO DOMANI MATTINA', m + 4, y + 5.5);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT);
      doc.text(ppLines, m + 4, y + 10.5);
      y += ppH + 4;
    }
  }

  // ===== FOOTER =====
  addFooter();

  // Salva
  const catSlug = (cat || 'Analisi').replace(/[^a-zA-Z0-9]/g, '_');
  const dateSlug = new Date().toISOString().slice(0, 10);
  doc.save(`Consorzio_Analisi_${catSlug}_${dateSlug}.pdf`);
}