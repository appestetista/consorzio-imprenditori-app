import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Ottieni tutti i bandi ordinati per deadline
        const allGrants = await base44.asServiceRole.entities.FinancialGrant.filter({}, '-deadline', 5000);
        
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
        
        // Archivia i bandi scaduti
        let archivedCount = 0;
        for (const grant of expiredGrants) {
            try {
                await base44.asServiceRole.entities.FinancialGrant.update(grant.id, {
                    is_archived: true,
                    status: 'Chiuso',
                    archived_date: today.toISOString().split('T')[0]
                });
                archivedCount++;
            } catch (e) {
                console.error(`Error archiving grant ${grant.id}:`, e.message);
            }
        }
        
        return Response.json({
            success: true,
            total_grants: allGrants.length,
            expired_archived: archivedCount,
            remaining_grants: validGrants.length,
            today: today.toISOString().split('T')[0]
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});