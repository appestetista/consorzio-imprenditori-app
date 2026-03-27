/**
 * Backend function per aggiornare le statistiche utente incrementalmente.
 * Viene chiamata dall'automation quando una ChatConversation viene creata/aggiornata.
 * 
 * Ottimizzazione: invece di ricalcolare tutto, aggiorna solo i delta.
 * Per le recenti, mantiene sempre le ultime 5.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();
    
    // Solo conversazioni con categoria sono rilevanti per le stats
    if (!data?.categoria) {
      return Response.json({ skipped: true, reason: 'no_categoria' });
    }
    
    const userEmail = data.user_email;
    if (!userEmail) {
      return Response.json({ skipped: true, reason: 'no_user_email' });
    }
    
    // Recupera o crea UserStats per questo utente
    const existingStats = await base44.asServiceRole.entities.UserStats.filter(
      { user_email: userEmail },
      '-updated_date',
      1
    );
    
    let stats = existingStats[0] || {
      user_email: userEmail,
      total_analyses: 0,
      this_month_count: 0,
      this_month_key: '',
      total_ratings: 0,
      ratings_count: 0,
      category_counts: {},
      recent_analyses: []
    };
    
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Reset conteggio mensile se cambiato mese
    if (stats.this_month_key !== currentMonthKey) {
      stats.this_month_count = 0;
      stats.this_month_key = currentMonthKey;
    }
    
    const isCreate = event?.type === 'create';
    const isUpdate = event?.type === 'update';
    
    if (isCreate) {
      // Nuova conversazione con categoria
      stats.total_analyses = (stats.total_analyses || 0) + 1;
      
      // Conteggio mensile (solo se creata questo mese)
      const createdDate = new Date(data.created_date);
      const createdMonthKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
      if (createdMonthKey === currentMonthKey) {
        stats.this_month_count = (stats.this_month_count || 0) + 1;
      }
      
      // Aggiorna conteggio categoria
      const catCounts = stats.category_counts || {};
      catCounts[data.categoria] = (catCounts[data.categoria] || 0) + 1;
      stats.category_counts = catCounts;
      
      // Rating se presente
      if (data.rating > 0) {
        stats.total_ratings = (stats.total_ratings || 0) + data.rating;
        stats.ratings_count = (stats.ratings_count || 0) + 1;
      }
      
      // Aggiungi alle recenti (mantieni solo ultime 5)
      const recent = stats.recent_analyses || [];
      recent.unshift({
        id: data.id || event?.entity_id,
        titolo: data.titolo,
        categoria: data.categoria,
        rating: data.rating || 0,
        created_date: data.created_date
      });
      stats.recent_analyses = recent.slice(0, 5);
      
    } else if (isUpdate) {
      // Aggiornamento: gestisci cambio rating
      const oldRating = old_data?.rating || 0;
      const newRating = data.rating || 0;
      
      if (newRating !== oldRating) {
        if (oldRating > 0 && newRating > 0) {
          // Cambiato rating: aggiusta delta
          stats.total_ratings = (stats.total_ratings || 0) - oldRating + newRating;
        } else if (oldRating === 0 && newRating > 0) {
          // Nuovo rating aggiunto
          stats.total_ratings = (stats.total_ratings || 0) + newRating;
          stats.ratings_count = (stats.ratings_count || 0) + 1;
        } else if (oldRating > 0 && newRating === 0) {
          // Rating rimosso
          stats.total_ratings = (stats.total_ratings || 0) - oldRating;
          stats.ratings_count = Math.max(0, (stats.ratings_count || 0) - 1);
        }
      }
      
      // Aggiorna rating nelle recenti se presente
      const recent = stats.recent_analyses || [];
      const idx = recent.findIndex(r => r.id === (data.id || event?.entity_id));
      if (idx >= 0) {
        recent[idx].rating = newRating;
        stats.recent_analyses = recent;
      }
    }
    
    stats.last_computed_at = now.toISOString();
    
    // Salva/aggiorna
    if (existingStats[0]?.id) {
      await base44.asServiceRole.entities.UserStats.update(existingStats[0].id, stats);
    } else {
      await base44.asServiceRole.entities.UserStats.create(stats);
    }
    
    return Response.json({ success: true, user_email: userEmail });
    
  } catch (error) {
    console.error('updateUserStats error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});