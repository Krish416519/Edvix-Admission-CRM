import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export interface AssignableUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  department: string | null;
  avatar_url: string | null;
  is_active: boolean;
  role_name: string;
  role_id: string;
  active_lead_count: number;
}

export interface LeadAssignment {
  id: string;
  lead_id: string;
  assignee_id: string;
  assigned_by: string | null;
  previous_assignee_id: string | null;
  assignment_type: string;
  notes: string | null;
  assigned_at: string;
  is_active: boolean;
  // Hydrated
  assignee_name?: string;
  assignee_role?: string;
  assigned_by_name?: string;
  previous_assignee_name?: string;
}

const ASSIGNABLE_ROLES = ['Admin', 'Manager', 'Team Leader', 'Counselor'];

export function useLeadAssignment(leadId?: string) {
  const { user } = useAuth();
  const [allUsers, setAllUsers] = useState<AssignableUser[]>([]);
  const [assignmentHistory, setAssignmentHistory] = useState<LeadAssignment[]>([]);
  const [currentAssignee, setCurrentAssignee] = useState<AssignableUser | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // ─── Fetch All Assignable Users ─────────────────────────────────────────────
  const fetchAssignableUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      // Use the view if available, otherwise fall back to manual join
      const { data, error } = await supabase
        .from('users')
        .select(`
          id, name, email, phone, department, avatar_url, is_active,
          role:roles!role_id(id, name)
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Map and filter to only assignable roles
      const mapped: AssignableUser[] = (data || [])
        .map((u: any) => ({
          id: u.id,
          name: u.name || u.email,
          email: u.email,
          phone: u.phone,
          department: u.department,
          avatar_url: u.avatar_url,
          is_active: u.is_active,
          role_name: u.role?.name || 'Unknown',
          role_id: u.role?.id || '',
          active_lead_count: 0, // will be enriched below
        }))
        .filter(u => ASSIGNABLE_ROLES.includes(u.role_name));

      // Enrich with lead counts from lead_assignments table
      if (mapped.length > 0) {
        const { data: counts, error: countErr } = await supabase
          .from('lead_assignments')
          .select('assignee_id')
          .eq('is_active', true);

        if (!countErr && counts) {
          const countMap: Record<string, number> = {};
          counts.forEach((c: any) => {
            countMap[c.assignee_id] = (countMap[c.assignee_id] || 0) + 1;
          });
          mapped.forEach(u => {
            u.active_lead_count = countMap[u.id] || 0;
          });
        }
      }

      setAllUsers(mapped);
    } catch (err: any) {
      // Fallback: try without the view
      console.warn('useLeadAssignment: falling back to basic user query', err.message);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, email, phone, department, avatar_url, is_active, role_id')
          .eq('is_active', true)
          .order('name');
        if (!error && data) {
          const { data: roles } = await supabase.from('roles').select('id, name');
          const roleMap: Record<string, string> = {};
          (roles || []).forEach((r: any) => { roleMap[r.id] = r.name; });
          const mapped: AssignableUser[] = data
            .map((u: any) => ({
              id: u.id,
              name: u.name || u.email,
              email: u.email,
              phone: u.phone,
              department: u.department,
              avatar_url: u.avatar_url,
              is_active: u.is_active,
              role_name: roleMap[u.role_id] || 'Unknown',
              role_id: u.role_id,
              active_lead_count: 0,
            }))
            .filter(u => ASSIGNABLE_ROLES.includes(u.role_name));
          setAllUsers(mapped);
        }
      } catch (e2) {
        console.error('Failed to fetch users for assignment:', e2);
      }
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  // ─── Fetch Assignment History For a Lead ────────────────────────────────────
  const fetchAssignmentHistory = useCallback(async (lid: string) => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('lead_assignments')
        .select(`
          *,
          assignee:users!assignee_id(name),
          assigner:users!assigned_by(name),
          previous:users!previous_assignee_id(name)
        `)
        .eq('lead_id', lid)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      const mapped: LeadAssignment[] = (data || []).map((r: any) => ({
        id: r.id,
        lead_id: r.lead_id,
        assignee_id: r.assignee_id,
        assigned_by: r.assigned_by,
        previous_assignee_id: r.previous_assignee_id,
        assignment_type: r.assignment_type,
        notes: r.notes,
        assigned_at: r.assigned_at,
        is_active: r.is_active,
        assignee_name: r.assignee?.name,
        assigned_by_name: r.assigner?.name,
        previous_assignee_name: r.previous?.name,
      }));

      setAssignmentHistory(mapped);

      // Set current assignee from history
      const active = mapped.find(m => m.is_active);
      if (active) {
        const assignee = allUsers.find(u => u.id === active.assignee_id);
        if (assignee) setCurrentAssignee(assignee);
      }
    } catch (err: any) {
      console.error('Failed to fetch assignment history:', err.message);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [allUsers]);

  // ─── Initial Load ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAssignableUsers();
  }, [fetchAssignableUsers]);

  useEffect(() => {
    if (leadId && allUsers.length > 0) {
      fetchAssignmentHistory(leadId);
    }
  }, [leadId, allUsers.length, fetchAssignmentHistory]);

  // ─── Realtime Subscription ───────────────────────────────────────────────────
  useEffect(() => {
    if (!leadId) return;
    const channel = supabase
      .channel(`lead_assignments_${leadId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lead_assignments',
        filter: `lead_id=eq.${leadId}`,
      }, () => {
        fetchAssignmentHistory(leadId);
        fetchAssignableUsers(); // refresh lead counts
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [leadId, fetchAssignmentHistory, fetchAssignableUsers]);

  // ─── Assign Lead ─────────────────────────────────────────────────────────────
  const assignLead = async (
    targetLeadId: string,
    assigneeId: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    setIsAssigning(true);
    try {
      // Try the atomic stored procedure first
      const { data, error } = await supabase.rpc('assign_lead', {
        p_lead_id: targetLeadId,
        p_assignee_id: assigneeId,
        p_assigned_by: user.id,
        p_notes: notes || null,
        p_assignment_type: 'Manual',
      });

      if (error) {
        // Fallback: manual steps if the function doesn't exist yet
        console.warn('assign_lead RPC not available, using fallback:', error.message);
        return await assignLeadFallback(targetLeadId, assigneeId, notes);
      }

      const result = data as any;
      if (!result?.success) {
        throw new Error(result?.error || 'Assignment failed');
      }

      // Update local state
      const assignee = allUsers.find(u => u.id === assigneeId);
      if (assignee) setCurrentAssignee(assignee);

      toast.success(`Lead assigned to ${assignee?.name || 'user'} successfully!`);
      await fetchAssignmentHistory(targetLeadId);
      await fetchAssignableUsers();

      return { success: true };
    } catch (err: any) {
      toast.error('Assignment failed: ' + err.message);
      return { success: false, error: err.message };
    } finally {
      setIsAssigning(false);
    }
  };

  // Fallback when the stored procedure isn't deployed yet
  const assignLeadFallback = async (
    targetLeadId: string,
    assigneeId: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) throw new Error('Not authenticated');

      // 1. Get current assignee
      const { data: lead } = await supabase
        .from('leads')
        .select('assigned_counselor, first_name, last_name')
        .eq('id', targetLeadId)
        .single();

      const prevAssigneeId = lead?.assigned_counselor;

      // 2. Deactivate old assignments
      await supabase
        .from('lead_assignments')
        .update({ is_active: false })
        .eq('lead_id', targetLeadId)
        .eq('is_active', true);

      // 3. Insert new assignment
      const { error: insertErr } = await supabase
        .from('lead_assignments')
        .insert({
          lead_id: targetLeadId,
          assignee_id: assigneeId,
          assigned_by: user.id,
          previous_assignee_id: prevAssigneeId || null,
          assignment_type: 'Manual',
          notes: notes || null,
          is_active: true,
        });

      if (insertErr) throw insertErr;

      // 4. Update lead record
      const { error: leadErr } = await supabase
        .from('leads')
        .update({ assigned_counselor: assigneeId })
        .eq('id', targetLeadId);

      if (leadErr) throw leadErr;

      // 5. Log activity
      const assigneeName = allUsers.find(u => u.id === assigneeId)?.name || 'Unknown';
      await supabase.from('lead_activities').insert({
        lead_id: targetLeadId,
        type: 'assignment',
        content: `Lead assigned to ${assigneeName}${notes ? '. Note: ' + notes : ''}`,
        author: user.name || user.email || 'System',
      });

      // 6. Create notification
      const orgId = user.activeOrganizationId || user.organizations?.[0]?.id;
      await supabase.from('notifications').insert({
        recipient_id: assigneeId,
        organization_id: orgId,
        module: 'leads',
        module_record_id: targetLeadId,
        title: 'New Lead Assigned',
        message: `You have been assigned a lead by ${user.name || 'Admin'}`,
        channel: 'In-App',
        priority: 'High',
        category: 'Assignment',
        status: 'Unread',
      });

      const assignee = allUsers.find(u => u.id === assigneeId);
      if (assignee) setCurrentAssignee(assignee);

      toast.success(`Lead assigned to ${assigneeName} successfully!`);
      await fetchAssignmentHistory(targetLeadId);
      await fetchAssignableUsers();

      return { success: true };
    } catch (err: any) {
      toast.error('Assignment failed: ' + err.message);
      return { success: false, error: err.message };
    }
  };

  // ─── Bulk Assign ─────────────────────────────────────────────────────────────
  const bulkAssignLeads = async (
    leadIds: string[],
    assigneeId: string,
    notes?: string
  ): Promise<{ success: boolean; count?: number; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };
    if (leadIds.length === 0) return { success: false, error: 'No leads selected' };

    setIsAssigning(true);
    try {
      const { data, error } = await supabase.rpc('bulk_assign_leads', {
        p_lead_ids: leadIds,
        p_assignee_id: assigneeId,
        p_assigned_by: user.id,
        p_notes: notes || null,
      });

      if (error) {
        // Fallback: sequential assignment
        let successCount = 0;
        for (const lid of leadIds) {
          const res = await assignLeadFallback(lid, assigneeId, notes);
          if (res.success) successCount++;
        }
        const assigneeName = allUsers.find(u => u.id === assigneeId)?.name || 'user';
        toast.success(`${successCount} of ${leadIds.length} leads assigned to ${assigneeName}`);
        return { success: true, count: successCount };
      }

      const result = data as any;
      const assigneeName = allUsers.find(u => u.id === assigneeId)?.name || 'user';
      toast.success(`${result.total} leads assigned to ${assigneeName}`);
      await fetchAssignableUsers();
      return { success: true, count: result.total };
    } catch (err: any) {
      toast.error('Bulk assignment failed: ' + err.message);
      return { success: false, error: err.message };
    } finally {
      setIsAssigning(false);
    }
  };

  // ─── Remove Assignment ───────────────────────────────────────────────────────
  const removeAssignment = async (targetLeadId: string): Promise<{ success: boolean }> => {
    if (!user) return { success: false };
    try {
      await supabase
        .from('lead_assignments')
        .update({ is_active: false })
        .eq('lead_id', targetLeadId)
        .eq('is_active', true);

      await supabase
        .from('leads')
        .update({ assigned_counselor: null })
        .eq('id', targetLeadId);

      await supabase.from('lead_activities').insert({
        lead_id: targetLeadId,
        type: 'assignment',
        content: 'Lead assignment removed',
        author: user.name || user.email || 'System',
      });

      setCurrentAssignee(null);
      toast.success('Assignment removed');
      if (leadId) await fetchAssignmentHistory(leadId);
      return { success: true };
    } catch (err: any) {
      toast.error('Failed to remove assignment: ' + err.message);
      return { success: false };
    }
  };

  // ─── Round Robin Assign ──────────────────────────────────────────────────────
  const roundRobinAssignLeads = async (
    leadIds: string[],
    assigneeIds: string[],
    notes?: string
  ): Promise<{ success: boolean; count?: number; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };
    if (leadIds.length === 0) return { success: false, error: 'No leads selected' };
    if (assigneeIds.length === 0) return { success: false, error: 'No assignees selected' };

    setIsAssigning(true);
    let successCount = 0;
    try {
      // Loop over leadIds and assigneeIds sequentially
      for (let i = 0; i < leadIds.length; i++) {
        const lid = leadIds[i];
        const assigneeId = assigneeIds[i % assigneeIds.length]; // Round Robin logic
        const res = await assignLeadFallback(lid, assigneeId, notes);
        if (res.success) successCount++;
      }
      
      toast.success(`${successCount} of ${leadIds.length} leads assigned via Round Robin`);
      await fetchAssignableUsers();
      return { success: true, count: successCount };
    } catch (err: any) {
      toast.error('Round robin assignment failed: ' + err.message);
      return { success: false, error: err.message };
    } finally {
      setIsAssigning(false);
    }
  };

  // ─── Helper: filter users by role ────────────────────────────────────────────
  const getUsersByRole = (roleName: string) =>
    allUsers.filter(u => u.role_name === roleName);

  return {
    allUsers,
    assignableRoles: ASSIGNABLE_ROLES,
    assignmentHistory,
    currentAssignee,
    isLoadingUsers,
    isLoadingHistory,
    isAssigning,
    assignLead,
    bulkAssignLeads,
    roundRobinAssignLeads,
    removeAssignment,
    getUsersByRole,
    refresh: fetchAssignableUsers,
    refreshHistory: () => leadId ? fetchAssignmentHistory(leadId) : Promise.resolve(),
  };
}
