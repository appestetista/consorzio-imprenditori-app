import { useLayoutEffect, useRef } from 'react';

/**
 * Hook per ripristinare la posizione scroll di una pagina.
 * Usa sessionStorage con chiave `scroll_y_{pageKey}`.
 * 
 * Chiamare `saveScroll(pageKey)` PRIMA di navigare via dalla pagina.
 * L'hook ripristina automaticamente lo scroll quando la pagina si monta.
 */
export function useScrollRestore(pageKey, { enabled = true } = {}) {
  const restoredRef = useRef(false);

  useLayoutEffect(() => {
    if (!enabled || restoredRef.current) return;
    try {
      const savedY = sessionStorage.getItem(`scroll_y_${pageKey}`);
      if (savedY) {
        sessionStorage.removeItem(`scroll_y_${pageKey}`);
        restoredRef.current = true;
        window.scrollTo(0, parseInt(savedY, 10));
      }
    } catch {}
  }, [pageKey, enabled]);
}

/**
 * Salva la posizione scroll corrente per una pagina specifica.
 * Chiamare PRIMA di navigare via.
 */
export function saveScrollPosition(pageKey) {
  try {
    sessionStorage.setItem(`scroll_y_${pageKey}`, String(window.scrollY));
  } catch {}
}