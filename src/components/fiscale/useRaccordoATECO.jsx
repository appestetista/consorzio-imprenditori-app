import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Hook per lookup automatico: dato codice ATECO + regione,
 * cerca in RaccordoATECOIRAP la categoria IRAP corretta.
 * Se non trova, fallback su "Impresa Ordinaria".
 * Restituisce { categoriaIrap, aliquotaIrap, fonte, loading }
 */
export default function useRaccordoATECO({ codiceAteco, regione, anno = 2026 }) {
  const [result, setResult] = useState({
    categoriaIrap: 'Impresa Ordinaria',
    aliquotaIrap: null,
    fonte: 'default',
    loading: false
  });

  useEffect(() => {
    if (!codiceAteco || !regione) {
      setResult({ categoriaIrap: 'Impresa Ordinaria', aliquotaIrap: null, fonte: 'default', loading: false });
      return;
    }

    const lookup = async () => {
      setResult(prev => ({ ...prev, loading: true }));

      // Cerca match esatto, poi prefissi progressivi (62.01.00 → 62.01 → 62 → sezione)
      const prefissi = [];
      const clean = codiceAteco.trim();
      prefissi.push(clean);
      
      // Genera prefissi via troncamento dei punti
      const parts = clean.split('.');
      for (let i = parts.length - 1; i >= 1; i--) {
        prefissi.push(parts.slice(0, i).join('.'));
      }
      // Aggiungi sezione (primo carattere se lettera, altrimenti prova a derivarla)
      if (clean.length > 0 && /^[A-Z]/.test(clean)) {
        prefissi.push(clean[0]);
      }

      // Rimuovi duplicati
      const uniquePrefissi = [...new Set(prefissi)];

      // Cerca nel raccordo per ogni prefisso, dal più specifico al più generico
      const raccordi = await base44.entities.RaccordoATECOIRAP.filter({ anno, regione });

      let found = null;
      for (const prefisso of uniquePrefissi) {
        const match = raccordi.find(r => r.codice_ateco === prefisso);
        if (match) {
          found = match;
          break;
        }
      }

      if (found) {
        setResult({
          categoriaIrap: found.categoria_irap,
          aliquotaIrap: found.aliquota_irap,
          fonte: 'raccordo',
          loading: false
        });
      } else {
        // Fallback: cerca aliquota "Impresa Ordinaria" da AliquoteIRAPRegionali
        const irapRecords = await base44.entities.AliquoteIRAPRegionali.filter({ anno, regione });
        const ordinaria = irapRecords.find(r => r.categoria === 'Impresa Ordinaria');
        setResult({
          categoriaIrap: 'Impresa Ordinaria',
          aliquotaIrap: ordinaria ? ordinaria.aliquota : null,
          fonte: 'default',
          loading: false
        });
      }
    };

    lookup();
  }, [codiceAteco, regione, anno]);

  return result;
}