// checkUserAccess — Verifica accesso utente
//
// NOTA ARCHITETTURALE:
// Questa function originariamente leggeva l'entity UserProfiles per verificare
// role e is_active. UserProfiles (user_email, role, is_active) è RIDONDANTE
// rispetto all'entity User built-in che ha già: email, role (built-in),
// is_blocked, user_type, e tutti i dati profilo.
//
// È stata riscritta per usare base44.auth.me() + User entity,
// eliminando la dipendenza da UserProfiles.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || !user.email) {
      return Response.json(
        { error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    if (user.is_blocked === true) {
      return Response.json(
        { error: "ACCESS_DENIED_INACTIVE_USER" },
        { status: 403 }
      );
    }

    return Response.json({
      role: user.role,
      userType: user.user_type,
      email: user.email
    });

  } catch (err) {
    console.error("checkUserAccess error:", err);
    return Response.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
});