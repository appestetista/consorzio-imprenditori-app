/**
 * Macchina a stati per le pratiche di Fiscalità Energetica
 * 
 * Stati:
 * - pending → richiesta creata (sistema)
 * - assigned → assegnata a consulente (sistema/admin)
 * - in_analysis → analisi preliminare (consulente)
 * - docs_requested → richiesta documenti (consulente)
 * - docs_received → documenti caricati (utente)
 * - report_ready → report pronto (consulente)
 * - in_progress → pratica operativa (consulente)
 * - completed → pratica conclusa (consulente)
 * - cancelled → pratica annullata (utente o consulente)
 */

// Transizioni valide: stato_corrente -> [stati_successivi_permessi]
const STATE_TRANSITIONS = {
  pending: ['assigned', 'cancelled'],
  assigned: ['in_analysis', 'cancelled'],
  in_analysis: ['docs_requested', 'report_ready', 'cancelled'],
  docs_requested: ['docs_received', 'cancelled'],
  docs_received: ['in_analysis', 'report_ready', 'cancelled'],
  report_ready: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [], // Stato finale
  cancelled: []  // Stato finale
};

// Chi può effettuare ogni transizione
const TRANSITION_ACTORS = {
  pending: {
    assigned: ['system', 'admin'],
    cancelled: ['user', 'admin']
  },
  assigned: {
    in_analysis: ['consultant'],
    cancelled: ['consultant', 'admin']
  },
  in_analysis: {
    docs_requested: ['consultant'],
    report_ready: ['consultant'],
    cancelled: ['consultant', 'admin']
  },
  docs_requested: {
    docs_received: ['user'],
    cancelled: ['user', 'consultant', 'admin']
  },
  docs_received: {
    in_analysis: ['consultant'],
    report_ready: ['consultant'],
    cancelled: ['consultant', 'admin']
  },
  report_ready: {
    in_progress: ['consultant'],
    cancelled: ['consultant', 'admin']
  },
  in_progress: {
    completed: ['consultant'],
    cancelled: ['consultant', 'admin']
  }
};

// Chi può caricare documenti in ogni stato
const UPLOAD_PERMISSIONS = {
  docs_requested: ['user'],
  in_analysis: ['consultant'],
  report_ready: ['consultant'],
  in_progress: ['consultant']
};

/**
 * Verifica se una transizione di stato è valida
 */
export function canTransition(fromStatus, toStatus, actorRole) {
  const allowedTransitions = STATE_TRANSITIONS[fromStatus] || [];
  
  if (!allowedTransitions.includes(toStatus)) {
    return { valid: false, reason: `Transizione da "${fromStatus}" a "${toStatus}" non permessa` };
  }
  
  const allowedActors = TRANSITION_ACTORS[fromStatus]?.[toStatus] || [];
  
  if (!allowedActors.includes(actorRole)) {
    return { valid: false, reason: `Ruolo "${actorRole}" non autorizzato per questa transizione` };
  }
  
  return { valid: true };
}

/**
 * Restituisce le transizioni disponibili per uno stato e ruolo
 */
export function getAvailableTransitions(currentStatus, actorRole) {
  const allowedTransitions = STATE_TRANSITIONS[currentStatus] || [];
  
  return allowedTransitions.filter(toStatus => {
    const allowedActors = TRANSITION_ACTORS[currentStatus]?.[toStatus] || [];
    return allowedActors.includes(actorRole);
  });
}

/**
 * Verifica se un attore può caricare documenti nello stato corrente
 */
export function canUploadDocument(currentStatus, actorRole) {
  const allowedRoles = UPLOAD_PERMISSIONS[currentStatus] || [];
  return allowedRoles.includes(actorRole);
}

/**
 * Crea un evento di storico
 */
export function createHistoryEvent(fromStatus, toStatus, actorEmail, actorRole, note = null) {
  return {
    timestamp: new Date().toISOString(),
    action: `status_change`,
    from_status: fromStatus,
    to_status: toStatus,
    actor_email: actorEmail,
    actor_role: actorRole,
    note
  };
}

/**
 * Crea un evento di upload documento
 */
export function createDocumentUploadEvent(actorEmail, actorRole, documentName) {
  return {
    timestamp: new Date().toISOString(),
    action: 'document_upload',
    from_status: null,
    to_status: null,
    actor_email: actorEmail,
    actor_role: actorRole,
    note: `Documento caricato: ${documentName}`
  };
}

/**
 * Labels leggibili per gli stati
 */
export const STATUS_LABELS = {
  pending: 'In attesa',
  assigned: 'Assegnata',
  in_analysis: 'In analisi',
  docs_requested: 'Documenti richiesti',
  docs_received: 'Documenti ricevuti',
  report_ready: 'Report pronto',
  in_progress: 'Pratica in corso',
  completed: 'Completata',
  cancelled: 'Annullata'
};

/**
 * Azioni leggibili per le transizioni
 */
export const TRANSITION_LABELS = {
  assigned: 'Assegna pratica',
  in_analysis: 'Avvia analisi',
  docs_requested: 'Richiedi documenti',
  docs_received: 'Conferma ricezione documenti',
  report_ready: 'Report completato',
  in_progress: 'Avvia pratica',
  completed: 'Chiudi pratica',
  cancelled: 'Annulla pratica'
};