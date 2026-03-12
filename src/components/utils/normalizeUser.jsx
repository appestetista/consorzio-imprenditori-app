/**
 * Normalizza i dati utente per gestire la differenza tra:
 * - Utenti caricati via auth.me() -> dati appiattiti a livello root
 * - Utenti caricati via User.filter() -> dati dentro .data
 * 
 * Questa funzione restituisce sempre un oggetto con i dati a livello root.
 */
export function normalizeUser(user) {
  if (!user) return null;
  
  // Se i dati sono già a livello root (auth.me()), restituisci così com'è
  // Se sono dentro .data (User.filter()), appiattisci
  const data = user.data || {};
  
  return {
    // Campi sempre a livello root
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    created_date: user.created_date,
    updated_date: user.updated_date,
    
    // Campi che possono essere in root o in .data
    user_type: user.user_type || data.user_type,
    is_blocked: user.is_blocked ?? data.is_blocked ?? false,
    block_reason: user.block_reason || data.block_reason,
    zona: user.zona || data.zona,
    
    // Permessi - possono essere in root o in .data
    permissions: user.permissions || data.permissions || {},
    
    // Dati aziendali
    company_name: user.company_name || data.company_name,
    company_logo: user.logo_url || user.company_logo || data.logo_url || data.company_logo,
    logo_url: user.logo_url || data.logo_url,
    company_email: user.company_email || data.company_email,
    company_size: user.company_size || data.company_size,
    specializzazione: user.specializzazione || data.specializzazione,
    
    // Dati referente
    referente: user.referente || data.referente,
    cellulare_referente: user.cellulare_referente || data.cellulare_referente,
    referente_email: user.referente_email || data.referente_email,
    
    // Contatti
    phone: user.phone || data.phone,
    website: user.website || data.website,
    
    // Indirizzo
    address: user.address || data.address,
    city: user.city || data.city,
    province: user.province || data.province,
    postal_code: user.postal_code || data.postal_code,
    region: user.region || data.region,
    regione: user.regione || data.regione,
    paese: user.paese || data.paese,
    
    // Dati fiscali
    vat_number: user.vat_number || data.vat_number,
    codice_fiscale: user.codice_fiscale || data.codice_fiscale,
    codice_sdi: user.codice_sdi || data.codice_sdi,
    ragione_sociale_fatturazione: user.ragione_sociale_fatturazione || data.ragione_sociale_fatturazione,
    forma_giuridica: user.forma_giuridica || data.forma_giuridica,
    regime_fiscale: user.regime_fiscale || data.regime_fiscale,
    periodicita_iva: user.periodicita_iva || data.periodicita_iva,
    numero_soci: user.numero_soci || data.numero_soci,
    capitale_sociale: user.capitale_sociale || data.capitale_sociale,
    gestione_inps: user.gestione_inps || data.gestione_inps,
    ha_compenso_amministratore: user.ha_compenso_amministratore ?? data.ha_compenso_amministratore ?? null,
    tipo_contabilita: user.tipo_contabilita || data.tipo_contabilita,
    founding_date: user.founding_date || data.founding_date,
    tipo_cooperativa: user.tipo_cooperativa || data.tipo_cooperativa,
    mutualita_prevalente: user.mutualita_prevalente ?? data.mutualita_prevalente ?? null,
    soci_accomandatari: user.soci_accomandatari || data.soci_accomandatari,
    soci_accomandanti: user.soci_accomandanti || data.soci_accomandanti,
    riduzione_contributiva_forfettario: user.riduzione_contributiva_forfettario ?? data.riduzione_contributiva_forfettario ?? false,
    settore: user.settore || data.settore,
    fatturato_annuo: user.fatturato_annuo || data.fatturato_annuo,
    numero_dipendenti: user.numero_dipendenti || data.numero_dipendenti,
    
    // Profilo bandi
    ateco_code: user.ateco_code || data.ateco_code,
    legal_form: user.legal_form || data.legal_form,
    interested_regions: user.interested_regions || data.interested_regions || [],
    interested_grant_types: user.interested_grant_types || data.interested_grant_types || [],
    years_of_activity: user.years_of_activity || data.years_of_activity,
    annual_revenue: user.annual_revenue || data.annual_revenue,
    employees_count: user.employees_count || data.employees_count,
    
    // Timestamp video
    last_video_view_at: user.last_video_view_at || data.last_video_view_at,
    
    // Mantieni anche l'oggetto data originale per retrocompatibilità
    _originalData: data
  };
}

/**
 * Verifica se un utente è un consulente
 */
export function isUserConsultant(user) {
  if (!user) return false;
  const normalized = typeof user.user_type !== 'undefined' ? user : normalizeUser(user);
  return normalized.user_type === 'consulente' || normalized.role === 'consulente';
}

/**
 * Ottiene i permessi dell'utente normalizzati
 */
export function getUserPermissions(user) {
  if (!user) return {};
  const normalized = typeof user.permissions !== 'undefined' && Object.keys(user.permissions).length > 0 
    ? user 
    : normalizeUser(user);
  return normalized.permissions || {};
}