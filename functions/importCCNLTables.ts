import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as XLSX from 'npm:xlsx@0.18.5';

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

    // Download the file
    const fileResponse = await fetch(file_url);
    const arrayBuffer = await fileResponse.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });

    const allRecords = [];
    const sheetSummary = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      if (rows.length < 8) {
        sheetSummary.push({ sheet: sheetName, status: 'skipped', reason: 'too few rows' });
        continue;
      }

      // Parse header metadata (rows 0-5 typically)
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
        // Try first row as category name
        ccnlNome = String(rows[0][0] || '').trim();
      }

      // Parse tables - find TABELLA QUALIFICATI and TABELLA APPRENDISTI sections
      let currentTableType = null;
      let headerRow = null;
      let recordCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const firstCell = String(row[0] || '').trim().toUpperCase();

        if (firstCell === 'TABELLA QUALIFICATI') {
          currentTableType = 'qualificati';
          headerRow = null;
          continue;
        } else if (firstCell === 'TABELLA APPRENDISTI') {
          currentTableType = 'apprendisti';
          headerRow = null;
          continue;
        }

        // Detect header row
        if (firstCell === 'LIVELLO' && currentTableType) {
          headerRow = i;
          continue;
        }

        // Parse data rows (after header)
        if (headerRow !== null && currentTableType && i > headerRow) {
          const livello = String(row[0] || '').trim();

          // Empty row = end of section
          if (!livello) {
            if (currentTableType === 'qualificati') {
              // Keep going, apprendisti section might follow
              headerRow = null;
            } else {
              headerRow = null;
              currentTableType = null;
            }
            continue;
          }

          // Parse numeric values - handle Italian comma format (1469,68 stored as two cells)
          const parseAmount = (idx) => {
            const v1 = row[idx];
            const v2 = row[idx + 1];
            
            if (v1 === undefined || v1 === null || v1 === '') return 0;
            
            // If it's already a proper number
            if (typeof v1 === 'number' && (v2 === undefined || v2 === null || v2 === '' || typeof v2 === 'number')) {
              // Could be integer part and decimal part split across columns
              if (typeof v2 === 'number' && v2 >= 0 && v2 < 100) {
                return v1 + v2 / 100;
              }
              return v1;
            }

            const s1 = String(v1).trim();
            const s2 = String(v2 || '').trim();
            
            // Try combining as Italian number (1469,68 split into 1469 and 68)
            if (s1 && s2 && !isNaN(Number(s1)) && !isNaN(Number(s2))) {
              return Number(s1) + Number(s2) / 100;
            }
            
            // Try parsing as single number
            const parsed = Number(s1.replace(',', '.'));
            return isNaN(parsed) ? 0 : parsed;
          };

          // Columns layout: LIVELLO | PAGA BASE(2cols) | CONTINGENZA(2cols) | TERZO ELEMENTO(2cols) | TOTALE(2cols) | IMPORTO SCATTO(2cols) | DIVISORE ORARIO(2cols) | DIVISORE GIORNALIERO
          // Each numeric value takes 2 columns because of Italian comma format
          const pagaBase = parseAmount(1);
          const contingenza = parseAmount(3);
          const terzoElemento = parseAmount(5);
          const totale = parseAmount(7);
          const importoScatto = parseAmount(9);
          const divisoreOrario = parseAmount(11);
          const divisoreGiornaliero = parseAmount(13);

          if (totale > 0 || pagaBase > 0) {
            const record = {
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
            };
            allRecords.push(record);
            recordCount++;
          }
        }
      }

      sheetSummary.push({ 
        sheet: sheetName, 
        ccnl: ccnlNome || categoria,
        codice: codiceCnel,
        settore: settore,
        records: recordCount,
        status: recordCount > 0 ? 'ok' : 'no_data'
      });
    }

    if (dry_run) {
      return Response.json({
        status: 'dry_run',
        total_records: allRecords.length,
        total_sheets: workbook.SheetNames.length,
        sheets: sheetSummary,
        sample_records: allRecords.slice(0, 10),
      });
    }

    // Bulk insert in batches of 50
    let insertedCount = 0;
    const batchSize = 50;
    const errors = [];

    for (let i = 0; i < allRecords.length; i += batchSize) {
      const batch = allRecords.slice(i, i + batchSize);
      try {
        await base44.asServiceRole.entities.TabellaCCNL.bulkCreate(batch);
        insertedCount += batch.length;
      } catch (err) {
        errors.push({ batch_start: i, error: err.message });
        // Try individual inserts for this batch
        for (const record of batch) {
          try {
            await base44.asServiceRole.entities.TabellaCCNL.create(record);
            insertedCount++;
          } catch (innerErr) {
            errors.push({ record: record.livello, ccnl: record.ccnl_nome, error: innerErr.message });
          }
        }
      }
    }

    return Response.json({
      status: 'success',
      total_records: allRecords.length,
      inserted: insertedCount,
      total_sheets: workbook.SheetNames.length,
      sheets_summary: sheetSummary.filter(s => s.status === 'ok').length + ' sheets with data',
      errors: errors.length > 0 ? errors.slice(0, 20) : null,
    });

  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});