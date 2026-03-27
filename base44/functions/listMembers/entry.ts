import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { page = 1, pageSize = 50, searchTerm = '', zone = 'all', excludeConsulenti = true, entityType = 'User' } = body;

    let allRecords;
    if (entityType === 'Consultant') {
      allRecords = await base44.asServiceRole.entities.Consultant.list();
    } else {
      allRecords = await base44.asServiceRole.entities.User.list();
    }

    // Apply filters
    let filtered = allRecords;

    if (entityType === 'User' && excludeConsulenti) {
      filtered = filtered.filter(r => r.user_type !== 'consulente');
    }

    if (zone && zone !== 'all') {
      filtered = filtered.filter(r => r.zona === zone);
    }

    if (searchTerm && searchTerm.trim()) {
      const s = searchTerm.toLowerCase().trim();
      if (entityType === 'Consultant') {
        filtered = filtered.filter(r =>
          r.name?.toLowerCase().includes(s) ||
          r.email?.toLowerCase().includes(s) ||
          r.category?.toLowerCase().includes(s)
        );
      } else {
        filtered = filtered.filter(r =>
          r.company_name?.toLowerCase().includes(s) ||
          r.full_name?.toLowerCase().includes(s) ||
          r.email?.toLowerCase().includes(s)
        );
      }
    }

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    return Response.json({
      records: paged,
      totalCount,
      totalPages,
      currentPage: page,
      pageSize,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});