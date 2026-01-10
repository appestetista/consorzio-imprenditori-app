import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // ACTION 1: Get current user
        const user = await base44.auth.me();
        
        // ACTION 2: Check if user exists
        if (!user) {
            return Response.json({ 
                error: 'ACCESS_DENIED_NO_PROFILE',
                message: 'Nessun profilo utente trovato' 
            }, { status: 403 });
        }
        
        // ACTION 3: Check if user is active (not blocked)
        if (user.is_blocked) {
            return Response.json({ 
                error: 'ACCESS_DENIED_INACTIVE_USER',
                message: 'Utente non attivo o bloccato' 
            }, { status: 403 });
        }
        
        // ACTION 4: Return user data
        return Response.json({ 
            success: true,
            role: user.role,
            userProfileId: user.id,
            email: user.email
        });

    } catch (error) {
        console.error('Errore checkUserAccess:', error);
        return Response.json({ 
            error: 'INTERNAL_ERROR',
            message: error.message 
        }, { status: 500 });
    }
});