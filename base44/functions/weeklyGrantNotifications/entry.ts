import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Funzione per verificare se un bando è compatibile con il profilo utente
function matchesUserProfile(grant, user) {
  // Check company size
  if (grant.eligible_company_sizes?.length > 0 && user?.company_size) {
    if (!grant.eligible_company_sizes.includes(user.company_size)) {
      return false;
    }
  }

  // Check region - usa le regioni di interesse dell'utente
  if (grant.eligible_regions?.length > 0) {
    const userInterestedRegions = user?.interested_regions || (user?.region ? [user.region] : []);
    if (userInterestedRegions.length > 0) {
      const hasRegionMatch = grant.eligible_regions.some(region => 
        userInterestedRegions.includes(region)
      );
      if (!hasRegionMatch) {
        return false;
      }
    }
  }

  // Check ATECO code
  if (grant.eligible_ateco_codes?.length > 0 && user?.ateco_code) {
    const hasMatch = grant.eligible_ateco_codes.some(code => 
      user.ateco_code.startsWith(code) || code.startsWith(user.ateco_code.substring(0, 2))
    );
    if (!hasMatch) {
      return false;
    }
  }

  // Check legal form
  if (grant.eligible_legal_forms?.length > 0 && user?.legal_form) {
    if (!grant.eligible_legal_forms.includes(user.legal_form)) {
      return false;
    }
  }

  return true;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verifica che sia un admin a chiamare (per automazione schedulata)
    const caller = await base44.auth.me();
    if (caller?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Recupera tutti gli utenti (user e consulente, esclusi admin)
    const allUsers = await base44.asServiceRole.entities.User.list();
    const targetUsers = allUsers.filter(u => u.role === 'user' || u.role === 'consulente');

    // Recupera tutti i bandi attivi (non scaduti)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const allGrants = await base44.asServiceRole.entities.FinancialGrant.list('-created_date');
    const validGrants = allGrants.filter(grant => {
      if (grant.deadline) {
        const deadlineDate = new Date(grant.deadline);
        deadlineDate.setHours(0, 0, 0, 0);
        return deadlineDate >= today;
      }
      return true;
    });

    // Recupera tutte le viste utente
    const allViews = await base44.asServiceRole.entities.UserGrantView.list();
    const viewsByEmail = {};
    allViews.forEach(v => {
      viewsByEmail[v.user_email] = v;
    });

    const results = {
      processed: 0,
      notificationsSent: 0,
      errors: []
    };

    for (const user of targetUsers) {
      try {
        // Filtra bandi compatibili con il profilo utente
        const compatibleGrants = validGrants.filter(grant => matchesUserProfile(grant, user));
        
        // Recupera ultima visita
        const userView = viewsByEmail[user.email];
        const lastViewedAt = userView?.last_viewed_at ? new Date(userView.last_viewed_at) : null;

        // Conta bandi nuovi dalla ultima visita
        let newGrantsCount;
        if (!lastViewedAt) {
          // Mai visitato - conta tutti i bandi compatibili
          newGrantsCount = compatibleGrants.length;
        } else {
          // Conta solo quelli creati dopo l'ultima visita
          newGrantsCount = compatibleGrants.filter(g => 
            new Date(g.created_date) > lastViewedAt
          ).length;
        }

        // Se ci sono nuovi bandi, invia notifica
        if (newGrantsCount > 0) {
          await base44.asServiceRole.entities.Notification.create({
            user_email: user.email,
            type: 'consultation', // Usiamo questo tipo per i bandi
            title: `🎯 ${newGrantsCount} nuovi bandi per te`,
            content: `Ci sono ${newGrantsCount} nuovi finanziamenti agevolati compatibili con il tuo profilo. Accedi per scoprirli!`,
            is_read: false,
            reference_id: 'grants_weekly'
          });
          results.notificationsSent++;
        }

        results.processed++;
      } catch (userError) {
        results.errors.push({
          email: user.email,
          error: userError.message
        });
      }
    }

    return Response.json({
      success: true,
      message: `Elaborati ${results.processed} utenti, inviate ${results.notificationsSent} notifiche`,
      results
    });

  } catch (error) {
    console.error('Error in weeklyGrantNotifications:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});