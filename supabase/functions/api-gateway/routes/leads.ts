export async function handleLeads(
  req: Request,
  url: URL,
  path: string, // expects e.g., /v1/leads or /v1/leads/123
  authClient: any,
  keyData: any,
  requestId: string,
  finalizeRequest: (status: number, payload: any) => Response,
  supabaseService: any
) {
  const permissions: string[] = keyData.permissions || [];
  const orgId = keyData.organization_id;
  const method = req.method;

  // Extract ID if present in the path e.g. /v1/leads/123 -> id = "123"
  // Remove /v1/leads or /api/v1/leads prefix
  const cleanPath = path.replace(/^\/api\/v1\/leads/, '').replace(/^\/v1\/leads/, '');
  const pathParts = cleanPath.split('/').filter(Boolean);
  const leadId = pathParts[0];
  const subAction = pathParts[1]; // assign, status, activities

  // Idempotency check helper
  const checkIdempotency = async (key: string | null) => {
    if (!key) return null;
    const { data } = await supabaseService
      .from('api_idempotency')
      .select('response_status, response_body')
      .eq('organization_id', orgId)
      .eq('idempotency_key', key)
      .single();
    return data;
  };

  const saveIdempotency = async (key: string | null, status: number, body: any) => {
    if (!key) return;
    await supabaseService.from('api_idempotency').insert([{
      organization_id: orgId,
      api_key_id: keyData.id,
      idempotency_key: key,
      endpoint: path,
      method: method,
      response_status: status,
      response_body: body
    }]);
  };

  // Helper to check permission
  const checkPermission = (perm: string) => {
    if (!permissions.includes(perm)) {
      return finalizeRequest(403, { error: { code: 'FORBIDDEN', message: `Missing required permission: ${perm}` } });
    }
    return null;
  };

  try {
    // ---------------------------------------------------------
    // GET /leads OR GET /leads/:id
    // ---------------------------------------------------------
    if (method === 'GET') {
      const denied = checkPermission('leads:read');
      if (denied) return denied;

      // GET Single Lead
      if (leadId) {
        const { data, error } = await authClient
          .from('leads')
          .select('*, lead_activities(*)')
          .eq('id', leadId)
          .eq('organization_id', orgId)
          .single();

        if (error) return finalizeRequest(404, { error: { code: 'NOT_FOUND', message: 'Lead not found' } });
        return finalizeRequest(200, { data });
      }

      // GET List Leads
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
      let limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50')));
      const offset = (page - 1) * limit;

      let query = authClient.from('leads').select('*', { count: 'exact' }).eq('organization_id', orgId);

      // Filters
      if (url.searchParams.has('status')) query = query.eq('lead_status', url.searchParams.get('status'));
      if (url.searchParams.has('source')) query = query.eq('lead_source', url.searchParams.get('source'));
      if (url.searchParams.has('course')) query = query.eq('course', url.searchParams.get('course'));
      if (url.searchParams.has('assigned_counselor')) query = query.eq('assigned_counselor', url.searchParams.get('assigned_counselor'));
      if (url.searchParams.has('city')) query = query.eq('city', url.searchParams.get('city'));
      if (url.searchParams.has('state')) query = query.eq('state', url.searchParams.get('state'));
      
      const search = url.searchParams.get('search');
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,external_id.ilike.%${search}%`);
      }

      const { data, error, count } = await query
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) return finalizeRequest(400, { error: { code: 'DATABASE_ERROR', message: error.message } });

      return finalizeRequest(200, { 
        data, 
        meta: { page, limit, total: count, has_more: (offset + limit) < (count || 0) } 
      });
    }

    // ---------------------------------------------------------
    // POST /leads (Create)
    // ---------------------------------------------------------
    if (method === 'POST' && !leadId) {
      const denied = checkPermission('leads:create');
      if (denied) return denied;

      const idempotencyKey = req.headers.get('Idempotency-Key');
      const cached = await checkIdempotency(idempotencyKey);
      if (cached) {
         // Return exactly the previous response if idempotency key exists
         return finalizeRequest(cached.response_status, cached.response_body);
      }

      const body = await req.json();
      
      // Parse Full Name if first_name not provided
      let firstName = body.first_name;
      let lastName = body.last_name;
      if (!firstName && body.full_name) {
          const parts = body.full_name.split(' ');
          firstName = parts[0];
          lastName = parts.slice(1).join(' ');
      }

      if (!firstName) return finalizeRequest(422, { error: { code: 'VALIDATION_ERROR', message: 'first_name is required' } });
      if (!body.email && !body.phone) return finalizeRequest(422, { error: { code: 'VALIDATION_ERROR', message: 'Either email or phone is required' } });

      // Duplicate Detection logic
      if (body.external_id || body.email || body.phone) {
         let dupQuery = authClient.from('leads').select('id').eq('organization_id', orgId);
         const ors = [];
         if (body.external_id) ors.push(`external_id.eq.${body.external_id}`);
         if (body.email) ors.push(`email.eq.${body.email}`);
         if (body.phone) ors.push(`phone.eq.${body.phone}`);
         
         const { data: dupData } = await dupQuery.or(ors.join(',')).limit(1).maybeSingle();
         
         if (dupData) {
             const dupPayload = { data: { lead_id: dupData.id }, meta: { created: false, duplicate: true } };
             await saveIdempotency(idempotencyKey, 200, dupPayload);
             return finalizeRequest(200, dupPayload);
         }
      }

      const newLead = {
        organization_id: orgId,
        first_name: firstName,
        last_name: lastName || null,
        email: body.email || null,
        phone: body.phone || null,
        state: body.state || null,
        city: body.city || null,
        budget: body.budget || null,
        lead_source: body.source || 'API',
        campaign: body.campaign || null,
        course: body.course || null,
        lead_status: 'New',
        priority: 'Low',
        external_id: body.external_id || null,
        medium: body.medium || null,
        utm_source: body.utm_source || null,
        utm_medium: body.utm_medium || null,
        utm_campaign: body.utm_campaign || null,
        utm_content: body.utm_content || null,
        utm_term: body.utm_term || null,
        landing_page: body.landing_page || null,
        referrer: body.referrer || null,
        preferred_specialization: body.specialization || null
      };

      const { data: lead, error: insertError } = await authClient
        .from('leads')
        .insert([newLead])
        .select()
        .single();

      if (insertError) {
         if (insertError.code === '23505') { // Unique violation fallback
             return finalizeRequest(409, { error: { code: 'CONFLICT', message: 'A lead with this external_id already exists.' } });
         }
         return finalizeRequest(400, { error: { code: 'DATABASE_ERROR', message: insertError.message } });
      }

      // Automatically add lead note if provided
      if (body.lead_notes) {
          await authClient.from('lead_activities').insert([{
              lead_id: lead.id,
              type: 'Note',
              content: body.lead_notes,
              author: 'API',
              metadata: { source: 'API Payload' }
          }]);
      }

      const successPayload = { data: lead, meta: { created: true } };
      await saveIdempotency(idempotencyKey, 201, successPayload);
      return finalizeRequest(201, successPayload);
    }

    // ---------------------------------------------------------
    // PATCH /leads/:id (Update)
    // ---------------------------------------------------------
    if (method === 'PATCH' && leadId && !subAction) {
      const denied = checkPermission('leads:update');
      if (denied) return denied;

      const body = await req.json();
      
      // Restrict system fields
      const restrictedFields = ['id', 'organization_id', 'created_by', 'created_at', 'updated_at', 'deleted_at', 'ai_score', 'ai_insights', 'ai_summary'];
      for (const field of restrictedFields) {
          if (body[field] !== undefined) {
             return finalizeRequest(422, { error: { code: 'RESTRICTED_FIELD', message: `Cannot modify restricted field: ${field}` } });
          }
      }

      const { data: lead, error: updateError } = await authClient
        .from('leads')
        .update(body)
        .eq('id', leadId)
        .eq('organization_id', orgId)
        .select()
        .single();

      if (updateError) {
          return finalizeRequest(400, { error: { code: 'DATABASE_ERROR', message: updateError.message } });
      }
      return finalizeRequest(200, { data: lead });
    }

    // ---------------------------------------------------------
    // POST /leads/:id/assign
    // ---------------------------------------------------------
    if (method === 'POST' && leadId && subAction === 'assign') {
      const denied = checkPermission('leads:assign');
      if (denied) return denied;

      const body = await req.json();
      if (!body.user_id) return finalizeRequest(422, { error: { code: 'VALIDATION_ERROR', message: 'user_id is required' } });

      const { data, error } = await authClient
        .from('leads')
        .update({ assigned_counselor: body.user_id })
        .eq('id', leadId)
        .eq('organization_id', orgId)
        .select()
        .single();

      if (error) return finalizeRequest(400, { error: { code: 'DATABASE_ERROR', message: error.message } });
      
      // Log Activity
      await authClient.from('lead_activities').insert([{
         lead_id: leadId,
         type: 'Assignment',
         content: `Lead assigned via API`,
         author: 'API',
         metadata: { assigned_to: body.user_id }
      }]);

      return finalizeRequest(200, { data });
    }

    // ---------------------------------------------------------
    // POST /leads/:id/status
    // ---------------------------------------------------------
    if (method === 'POST' && leadId && subAction === 'status') {
      const denied = checkPermission('leads:status_update');
      if (denied) return denied;

      const body = await req.json();
      if (!body.status) return finalizeRequest(422, { error: { code: 'VALIDATION_ERROR', message: 'status is required' } });

      const { data, error } = await authClient
        .from('leads')
        .update({ lead_status: body.status })
        .eq('id', leadId)
        .eq('organization_id', orgId)
        .select()
        .single();

      if (error) return finalizeRequest(400, { error: { code: 'DATABASE_ERROR', message: error.message } });

      return finalizeRequest(200, { data });
    }

    // ---------------------------------------------------------
    // POST /leads/:id/activities
    // ---------------------------------------------------------
    if (method === 'POST' && leadId && subAction === 'activities') {
      const denied = checkPermission('leads:activity_create');
      if (denied) return denied;

      const body = await req.json();
      if (!body.type || !body.content) return finalizeRequest(422, { error: { code: 'VALIDATION_ERROR', message: 'type and content are required' } });

      const { data, error } = await authClient
        .from('lead_activities')
        .insert([{
           lead_id: leadId,
           type: body.type,
           content: body.content,
           subject: body.subject || null,
           author: 'API',
           metadata: body.metadata || { source: 'API' }
        }])
        .select()
        .single();

      if (error) return finalizeRequest(400, { error: { code: 'DATABASE_ERROR', message: error.message } });

      return finalizeRequest(201, { data });
    }

    return finalizeRequest(404, { error: { code: 'ROUTE_NOT_FOUND', message: 'API Endpoint Not Found' } });

  } catch (error: any) {
    console.error('Lead API Error:', error);
    return finalizeRequest(500, { error: { code: 'INTERNAL_ERROR', message: 'Internal server error processing Lead API request' } });
  }
}
