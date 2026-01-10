import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 1. Utente autenticato
    const user = await base44.auth.me();
    if (!user || !user.email) {
      return Response.json(
        { error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // 2. Lettura entity UserProfiles (METODO CORRETTO)
    const profiles = await base44.asServiceRole.entities.UserProfiles.filter({
      user_email: user.email
    });

    if (!profiles || profiles.length === 0) {
      return Response.json(
        { error: "ACCESS_DENIED_NO_PROFILE" },
        { status: 403 }
      );
    }

    const profile = profiles[0];

    if (profile.is_active !== true) {
      return Response.json(
        { error: "ACCESS_DENIED_INACTIVE_USER" },
        { status: 403 }
      );
    }

    return Response.json({
      role: profile.role,
      userProfileId: profile.id,
      email: profile.user_email
    });

  } catch (err) {
    console.error("checkUserAccess error:", err);
    return Response.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
});
