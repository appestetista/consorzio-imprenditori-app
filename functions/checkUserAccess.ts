import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();

    if (!user) {
      return Response.json(
        { error: "ACCESS_DENIED_NO_PROFILE" },
        { status: 403 }
      );
    }

    const profiles = await base44.db.UserProfiles.findMany({
      where: { email: user.email },
      limit: 1,
    });

    if (!profiles || profiles.length === 0) {
      return Response.json(
        { error: "ACCESS_DENIED_NO_PROFILE" },
        { status: 403 }
      );
    }

    const profile = profiles[0];

    if (profile.is_active === false) {
      return Response.json(
        { error: "ACCESS_DENIED_INACTIVE_USER" },
        { status: 403 }
      );
    }

    return Response.json({
      role: profile.role,
      userProfileId: profile.id,
      email: profile.email,
    });
  } catch (err) {
    console.error("checkUserAccess error:", err);
    return Response.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
});
