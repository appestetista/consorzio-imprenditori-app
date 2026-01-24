import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cerca se c'è un invito pendente per questa email
    const pendingInvites = await base44.asServiceRole.entities.PendingInvite.filter({
      email: user.email.toLowerCase(),
      is_registered: false
    });

    if (pendingInvites.length === 0) {
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
      const existingConsultants = await base44.asServiceRole.entities.Consultant.filter({
        email: user.email.toLowerCase()
      });

      if (existingConsultants.length === 0 && invite.consultant_category) {
        await base44.asServiceRole.entities.Consultant.create({
          name: user.full_name || user.email,
          email: user.email.toLowerCase(),
          category: invite.consultant_category,
          city: invite.zona || '',
          available_slots: 100
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