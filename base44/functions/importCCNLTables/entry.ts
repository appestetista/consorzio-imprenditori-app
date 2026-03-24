import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as XLSX from 'npm:xlsx@0.18.5';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { file_url, dry_run } = await req.json();
    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    const fileResponse = await fetch(file_url);
    const arrayBuffer = await fileResponse.arrayBuffer();
    // Read with raw: true to get raw cell values before formatting
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', raw: true });

    const allRecords = [];
    const sheetSummary = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      // Use raw values to avoid comma-splitting issues
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });

      if (rows.length < 8) {
        sheetSummary.push({ sheet: sheetName, status: 'skipped', reason: 'too few rows' });
        continue;
      }

      let codiceCnel = '';
      let settore = '';
      let ccnlNome = '';
      let categoria = '';
      let dataTabella = '';

      for (let i = 0; i < Math.min(7, rows.length); i++) {
        const row = rows[i];
        const label = String(row[0] || '').trim();
        const value = String(row[1] || '').trim();
        if (label === 'Codice CNEL') codiceCnel = value;
        else if (label === 'Settore') settore = value;
        else if (label === 'CCNL') ccnlNome = value;
        else if (label === 'Categoria') categoria = value;
        else if (label === 'Data tabella') dataTabella = value;
      }

      if (!ccnlNome && !settore) {
        ccnlNome = String(rows[0][0] || '').trim();
      }

      let currentTableType = null;
      let headerRow = null;
      let colMap = null;
      let recordCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const firstCell = String(row[0] || '').trim().toUpperCase();

        if (firstCell === 'TABELLA QUALIFICATI') {
          currentTableType = 'qualificati';
          headerRow = null;
          colMap = null;
          continue;
        } else if (firstCell === 'TABELLA APPRENDISTI') {
          currentTableType = 'apprendisti';
          headerRow = null;
          colMap = null;
          continue;
        }

        if (firstCell === 'LIVELLO' && currentTableType) {
          // Build column map from header
          colMap = {};
          for (let c = 0; c < row.length; c++) {
            const h = String(row[c] || '').trim().toUpperCase();
            if (h === 'LIVELLO') colMap.livello = c;
            else if (h === 'PAGA BASE') colMap.paga_base = c;
            else if (h === 'CONTINGENZA') colMap.contingenza = c;
            else if (h === 'TERZO ELEMENTO') colMap.terzo_elemento = c;
            else if (h === 'TOTALE') colMap.totale = c;
            else if (h === 'IMPORTO SCATTO') colMap.importo_scatto = c;
            else if (h === 'DIVISORE ORARIO') colMap.divisore_orario = c;
            else if (h.startsWith('DIVISORE GIORN')) colMap.divisore_giornaliero = c;
          }
          headerRow = i;
          continue;
        }

        if (headerRow !== null && currentTableType && colMap && i > headerRow) {
          const livello = String(row[colMap.livello] || '').trim();

          if (!livello) {
            headerRow = null;
            if (currentTableType === 'apprendisti') {
              currentTableType = null;
              colMap = null;
            }
            continue;
          }

          const parseNum = (colKey) => {
            if (colMap[colKey] === undefined) return 0;
            const v = row[colMap[colKey]];
            if (v === undefined || v === null || v === '') return 0;
            if (typeof v === 'number') return v;
            const s = String(v).replace(',', '.').trim();
            const n = Number(s);
            return isNaN(n) ? 0 : n;
          };

          const pagaBase = parseNum('paga_base');
          const contingenza = parseNum('contingenza');
          const terzoElemento = parseNum('terzo_elemento');
          const totale = parseNum('totale');
          const importoScatto = parseNum('importo_scatto');
          const divisoreOrario = parseNum('divisore_orario');
          const divisoreGiornaliero = parseNum('divisore_giornaliero');

          if (totale > 0 || pagaBase > 0) {
            allRecords.push({
              sheet_name: sheetName,
              ccnl_nome: ccnlNome || categoria || sheetName,
              codice_cnel: codiceCnel,
              settore: settore,
              categoria: categoria,
              data_tabella: dataTabella,
              tipo_tabella: currentTableType,
              livello: livello,
              paga_base: pagaBase,
              contingenza: contingenza,
              terzo_elemento: terzoElemento,
              totale: totale || pagaBase,
              importo_scatto: importoScatto,
              divisore_orario: divisoreOrario,
              divisore_giornaliero: divisoreGiornaliero,
            });
            recordCount++;
          }
        }
      }

      sheetSummary.push({ 
        sheet: sheetName, 
        ccnl: ccnlNome || categoria,
        codice: codiceCnel,
        records: recordCount,
        status: recordCount > 0 ? 'ok' : 'no_data'
      });
    }

    if (dry_run) {
      return Response.json({
        status: 'dry_run',
        total_records: allRecords.length,
        total_sheets: workbook.SheetNames.length,
        sheets_ok: sheetSummary.filter(s => s.status === 'ok').length,
        sample_records: allRecords.slice(0, 5),
        sample_meta: allRecords.filter(r => r.ccnl_nome.includes('Metalmeccanica') && r.ccnl_nome.includes('Industria') && r.tipo_tabella === 'qualificati').slice(0, 3),
      });
    }

    // Bulk insert in batches of 40 with delays to avoid rate limits
    let insertedCount = 0;
    const batchSize = 40;
    const errors = [];

    for (let i = 0; i < allRecords.length; i += batchSize) {
      const batch = allRecords.slice(i, i + batchSize);
      let retries = 0;
      let success = false;
      
      while (!success && retries < 3) {
        try {
          await base44.asServiceRole.entities.TabellaCCNL.bulkCreate(batch);
          insertedCount += batch.length;
          success = true;
        } catch (err) {
          retries++;
          if (err.message.includes('Rate limit') && retries < 3) {
            await sleep(2000 * retries);
          } else {
            errors.push({ batch_start: i, error: err.message });
            success = true; // skip batch
          }
        }
      }
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < allRecords.length) {
        await sleep(300);
      }
    }

    return Response.json({
      status: 'success',
      total_records: allRecords.length,
      inserted: insertedCount,
      total_sheets: workbook.SheetNames.length,
      sheets_with_data: sheetSummary.filter(s => s.status === 'ok').length,
      errors: errors.length > 0 ? errors.slice(0, 10) : null,
    });

  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});