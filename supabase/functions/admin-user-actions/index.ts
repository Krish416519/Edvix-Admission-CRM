// Supabase Edge Function: admin-user-actions
// Handles privileged user operations that require the Service Role key.
// Deployed server-side so the secret key is never exposed in the browser.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verify the caller is an authenticated user with Super Admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Missing Authorization header' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Client with caller's auth token (to check their role)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Admin client with service role key (for privileged operations)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get the caller's identity
    const token = authHeader.replace('Bearer ', '').trim();
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Invalid token' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check caller's role in public.users
    const { data: callerData, error: callerError } = await supabaseAdmin
      .from('users')
      .select('role:roles(name)')
      .eq('id', user.id)
      .single();

    if (callerError || !callerData) {
      return new Response(JSON.stringify({ success: false, error: 'Could not verify your role' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerRole = (callerData.role as any)?.name;
    if (!['Super Admin', 'Admin'].includes(callerRole)) {
      return new Response(JSON.stringify({ success: false, error: `Insufficient permissions: You are a ${callerRole}` }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse the request body
    const body = await req.json();
    const { action, user_id, user_ids, data: payload } = body;

    // ── Action: delete_user ─────────────────────────────────────────────
    if (action === 'delete_user') {
      if (!user_id) {
        return new Response(JSON.stringify({ success: false, error: 'user_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Prevent deleting yourself
      if (user_id === user.id) {
        return new Response(JSON.stringify({ success: false, error: 'Cannot delete yourself' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Action: create_user ─────────────────────────────────────────────
    if (action === 'create_user') {
      if (!payload || !payload.email || !payload.password || !payload.name) {
        return new Response(JSON.stringify({ success: false, error: 'Email, password, and name are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let roleName = payload.role_name;
      if (!roleName && payload.role_id) {
        const { data: roleData } = await supabaseAdmin.from('roles').select('name').eq('id', payload.role_id).single();
        if (roleData) roleName = roleData.name;
      }

      // Create user securely via Admin API, bypassing public signup restrictions
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        email_confirm: true,
        user_metadata: {
          name: payload.name,
          role: roleName // resolved role name for JWT claims
        }
      });

      if (authError) throw authError;

      // Update the public.users table immediately (the trigger created it)
      if (payload.role_id || payload.name) {
        const publicUpdate: any = {};
        if (payload.name !== undefined) publicUpdate.name = payload.name;
        if (payload.role_id !== undefined) publicUpdate.role_id = payload.role_id;
        
        await supabaseAdmin
          .from('users')
          .update(publicUpdate)
          .eq('id', authData.user.id);
      }

      return new Response(JSON.stringify({ success: true, user: authData.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Action: bulk_delete_users ───────────────────────────────────────
    if (action === 'bulk_delete_users') {
      if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
        return new Response(JSON.stringify({ success: false, error: 'user_ids array is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Filter out the caller's own id for safety
      const safeIds = user_ids.filter((id: string) => id !== user.id);

      const results = await Promise.allSettled(
        safeIds.map((id: string) => supabaseAdmin.auth.admin.deleteUser(id))
      );

      const failed = results.filter(r => r.status === 'rejected').length;
      const succeeded = results.filter(r => r.status === 'fulfilled').length;

      return new Response(
        JSON.stringify({ success: true, deleted: succeeded, failed, total: safeIds.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Action: update_user ─────────────────────────────────────────────
    if (action === 'update_user') {
      if (!user_id || !payload) {
        return new Response(JSON.stringify({ success: false, error: 'user_id and data are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const updatePayload: any = {};
      if (payload.email) updatePayload.email = payload.email;
      if (payload.password) updatePayload.password = payload.password;
      if (payload.email_confirm !== undefined) updatePayload.email_confirm = payload.email_confirm;

      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user_id, updatePayload);
      if (authError) throw authError;

      // Also update public.users table if name/role provided
      const publicUpdate: any = {};
      if (payload.name !== undefined) publicUpdate.name = payload.name;
      if (payload.role_id !== undefined) publicUpdate.role_id = payload.role_id;
      if (payload.is_active !== undefined) publicUpdate.is_active = payload.is_active;

      if (Object.keys(publicUpdate).length > 0) {
        const { error: publicError } = await supabaseAdmin
          .from('users')
          .update(publicUpdate)
          .eq('id', user_id);
        if (publicError) throw publicError;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Action: confirm_email ───────────────────────────────────────────
    if (action === 'confirm_email') {
      if (!user_id) {
        return new Response(JSON.stringify({ success: false, error: 'user_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        email_confirm: true,
      });
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Action: bulk_confirm_emails ─────────────────────────────────────
    if (action === 'bulk_confirm_emails') {
      const { data: unconfirmed } = await supabaseAdmin
        .from('users')
        .select('id');

      const results = await Promise.allSettled(
        (unconfirmed || []).map((u: any) =>
          supabaseAdmin.auth.admin.updateUserById(u.id, { email_confirm: true })
        )
      );

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      return new Response(
        JSON.stringify({ success: true, confirmed: succeeded }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Internal server error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
