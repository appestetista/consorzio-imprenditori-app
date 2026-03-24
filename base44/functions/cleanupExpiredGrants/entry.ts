import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Ottieni tutti i bandi
        const allGrants = await base44.asServiceRole.entities.FinancialGrant.list();
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const expiredGrants = [];
        const validGrants = [];
        
        for (const grant of allGrants) {
            if (grant.deadline) {
                const deadlineDate = new Date(grant.deadline);
                deadlineDate.setHours(0, 0, 0, 0);
                
                if (deadlineDate < today) {
                    expiredGrants.push(grant);
                } else {
                    validGrants.push(grant);
                }
            } else {
                // Bandi senza scadenza li teniamo
                validGrants.push(grant);
            }
        }
        
        // Elimina i bandi scaduti
        let deletedCount = 0;
        for (const grant of expiredGrants) {
            try {
                await base44.asServiceRole.entities.FinancialGrant.delete(grant.id);
                deletedCount++;
            } catch (e) {
                console.error(`Error deleting grant ${grant.id}:`, e.message);
            }
        }
        
        return Response.json({
            success: true,
            total_grants: allGrants.length,
            expired_deleted: deletedCount,
            remaining_grants: validGrants.length,
            today: today.toISOString().split('T')[0]
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});