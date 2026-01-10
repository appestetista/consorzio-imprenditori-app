import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // 1. Autentica utente (funziona per tutti)
        const user = await base44.auth.me();
        if (!user || !user.email) {
            return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
        }

        // 2. Verifica campi obbligatori
        const requiredFields = ['company_name', 'phone', 'vat_number', 'city'];
        const missingFields = requiredFields.filter(field => !user[field]);

        const isComplete = missingFields.length === 0;

        // 3. Aggiorna flag se necessario
        if (isComplete && !user.profile_completed) {
            await base44.auth.updateMe({ profile_completed: true });
        }

        return Response.json({
            isComplete,
            missingFields,
            user: {
                email: user.email,
                full_name: user.full_name,
                company_name: user.company_name,
                profile_completed: user.profile_completed
            }
        });

    } catch (error) {
        console.error('checkProfileCompleteness error:', error);
        return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
});