import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Se l'utente ha già un user_type assegnato, non fare nulla
    // (evita di bloccare utenti già registrati correttamente)
    if (user.user_type) {
      return Response.json({ 
        success: true, 
        already_assigned: true,
        message: 'Tipo utente già assegnato',
        user_type: user.user_type
      });
    }

    // Cerca se c'è un invito pendente per questa email (case-insensitive)
    const allPendingInvites = await base44.asServiceRole.entities.PendingInvite.filter({
      is_registered: false
    });
    const pendingInvites = allPendingInvites.filter(
      inv => inv.email?.toLowerCase() === user.email.toLowerCase()
    );

    if (pendingInvites.length === 0) {
      // Controlla se esiste un invito già registrato per questa email
      // (caso in cui l'utente ha già completato la registrazione in precedenza)
      const allRegisteredInvites = await base44.asServiceRole.entities.PendingInvite.filter({
        is_registered: true
      });
      const registeredInvites = allRegisteredInvites.filter(
        inv => inv.email?.toLowerCase() === user.email.toLowerCase()
      );

      if (registeredInvites.length > 0) {
        // L'utente era già stato autorizzato, non bloccare
        return Response.json({ 
          success: true, 
          already_registered: true,
          message: 'Utente già registrato'
        });
      }

      // Controlla se esiste un Consultant con questa email (creato manualmente dall'admin)
      const allConsultants = await base44.asServiceRole.entities.Consultant.filter({});
      const existingConsultants = allConsultants.filter(
        c => c.email?.toLowerCase() === user.email.toLowerCase()
      );

      if (existingConsultants.length > 0) {
        // Il consulente esiste già - autorizza e assegna tipo utente
        const consultant = existingConsultants[0];
        
        // Prepara permessi basati sulle sezioni assegnate al consulente
        const permissions = {};
        const allSections = [
          'calendario', 'video_interviste', 'cultura_aziendale', 'consulenze',
          'finanziamenti', 'contatta_membri', 'risparmio_energetico', 'marketplace',
          'imprenditori', 'fornitori', 'welfare_aziendale', 'analisi_contratti',
          'import_export', 'compliance'
        ];
        
        allSections.forEach(section => {
          permissions[section] = false;
        });
        
        if (consultant.assigned_sections && consultant.assigned_sections.length > 0) {
          consultant.assigned_sections.forEach(section => {
            permissions[section] = true;
          });
        }
        permissions.consulenze = true; // Sempre abilitata per consulenti

        await base44.asServiceRole.entities.User.update(user.id, {
          user_type: 'consulente',
          is_blocked: false,
          block_reason: null,
          zona: consultant.zona || null,
          permissions: permissions
        });

        // Crea anche il PendingInvite per tracciamento (segnato come già registrato)
        await base44.asServiceRole.entities.PendingInvite.create({
          email: user.email.toLowerCase(),
          user_type: 'consulente',
          invited_by: 'auto-from-consultant',
          is_registered: true,
          zona: consultant.zona || null,
          consultant_category: consultant.category || null,
          consultant_name: consultant.name || null,
          assigned_sections: consultant.assigned_sections || []
        });

        return Response.json({ 
          success: true, 
          message: 'Consulente autorizzato da record esistente',
          user_type: 'consulente'
        });
      }

      // Controlla se l'utente esiste già nel DB con dati aziendali (aggiunto manualmente dall'admin)
      // Se ha company_name o company_email o zona, significa che è stato pre-configurato
      if (user.company_name || user.company_email || user.zona) {
        // L'utente è stato aggiunto manualmente - autorizza come utente normale
        await base44.asServiceRole.entities.User.update(user.id, {
          user_type: 'utente',
          is_blocked: false,
          block_reason: null
        });

        // Crea PendingInvite per tracciamento (segnato come già registrato)
        await base44.asServiceRole.entities.PendingInvite.create({
          email: user.email.toLowerCase(),
          user_type: 'utente',
          invited_by: 'auto-from-user-record',
          is_registered: true,
          zona: user.zona || null
        });

        return Response.json({ 
          success: true, 
          message: 'Utente autorizzato da record esistente',
          user_type: 'utente'
        });
      }

      // Nessun invito trovato - blocca l'utente
      await base44.asServiceRole.entities.User.update(user.id, {
        is_blocked: true,
        block_reason: 'email_non_autorizzata'
      });
      
      return Response.json({ 
        success: false, 
        blocked: true,
        message: 'Email non autorizzata'
      });
    }

    const invite = pendingInvites[0];
    
    // Prepara i dati da aggiornare sull'utente
    const updateData = {
      user_type: invite.user_type,
      is_blocked: false,
      block_reason: null
    };

    // Imposta zona se presente (per tutti i tipi utente)
    if (invite.zona) {
      updateData.zona = invite.zona;
    }

    // Se è un consulente, assegna anche i permessi specifici
    if (invite.user_type === 'consulente') {
      // Imposta i permessi basati sulle sezioni assegnate
      if (invite.assigned_sections && invite.assigned_sections.length > 0) {
        const permissions = {};
        const allSections = [
          'calendario', 'video_interviste', 'cultura_aziendale', 'consulenze',
          'finanziamenti', 'contatta_membri', 'risparmio_energetico', 'marketplace',
          'imprenditori', 'fornitori', 'welfare_aziendale', 'analisi_contratti',
          'import_export', 'compliance'
        ];
        
        // Disabilita tutte le sezioni di default
        allSections.forEach(section => {
          permissions[section] = false;
        });
        
        // Abilita solo le sezioni assegnate
        invite.assigned_sections.forEach(section => {
          permissions[section] = true;
        });

        // Consulenze sempre abilitata per i consulenti
        permissions.consulenze = true;

        updateData.permissions = permissions;
      }

      // Crea anche il record Consultant se non esiste
      const allConsultantsCheck = await base44.asServiceRole.entities.Consultant.filter({});
      const existingConsultants = allConsultantsCheck.filter(
        c => c.email?.toLowerCase() === user.email.toLowerCase()
      );

      if (existingConsultants.length === 0 && invite.consultant_category) {
        await base44.asServiceRole.entities.Consultant.create({
          name: invite.consultant_name || user.full_name || user.email,
          email: user.email.toLowerCase(),
          category: invite.consultant_category,
          city: invite.zona || 'Da definire',
          phone: 'Da definire',
          zona: invite.zona || '',
          assigned_sections: invite.assigned_sections || [],
          free_consultations_per_user: 1
        });
      }
    }

    // Aggiorna l'utente con i dati
    await base44.asServiceRole.entities.User.update(user.id, updateData);

    // Segna l'invito come completato
    await base44.asServiceRole.entities.PendingInvite.update(invite.id, {
      is_registered: true
    });

    return Response.json({ 
      success: true, 
      message: 'Tipo utente e permessi assegnati',
      user_type: invite.user_type,
      assigned_sections: invite.assigned_sections
    });

  } catch (error) {
    console.error('Errore assignUserType:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});