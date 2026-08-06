import { supabase } from '../supabase';

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

export class PermissionEngine {
  /**
   * Verifies if a user has the necessary permissions to execute a specific AI tool/action.
   * This operates as a middleware before the tool is executed.
   */
  static async verifyPermission(
    userId: string,
    toolName: string,
    args: any
  ): Promise<PermissionCheckResult> {
    
    // First, fetch the user's role from the auth context / db
    const { data: user, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return { allowed: false, reason: 'User not found or database error.' };
    }

    const role = user.role;

    // Super Admins bypass all checks
    if (role === 'Super Admin') {
      return { allowed: true };
    }

    // Role-based tool restriction mapping
    switch (toolName) {
      // READ-ONLY TOOLS (Generally safe, relies on RLS at the DB layer to filter what they can see)
      case 'search_leads':
      case 'get_student_profile':
      case 'get_pending_payments':
      case 'analyze_performance':
        return { allowed: true }; // RLS handles the rest

      // WRITE TOOLS
      case 'create_task':
        // Anyone can create tasks for themselves, but creating for others requires Manager+
        if (args.assigned_to && args.assigned_to !== userId && role !== 'Admin' && role !== 'Manager') {
          return { allowed: false, reason: 'You do not have permission to assign tasks to other users.' };
        }
        return { allowed: true };

      case 'update_lead_status':
        if (role === 'Partner' || role === 'University') {
           return { allowed: false, reason: 'External partners cannot directly modify lead statuses.' };
        }
        return { allowed: true };

      case 'bulk_assign_leads':
        if (role !== 'Admin' && role !== 'Manager') {
          return { allowed: false, reason: 'Only Managers and Admins can perform bulk assignments.' };
        }
        return { allowed: true };

      case 'send_bulk_communications':
        if (role !== 'Admin' && role !== 'Marketing' && role !== 'Manager') {
           return { allowed: false, reason: 'You do not have permission to send bulk communications.' };
        }
        return { allowed: true };
        
      case 'delete_lead':
        if (role !== 'Admin') {
           return { allowed: false, reason: 'Only Admins can delete records.' };
        }
        return { allowed: true };

      default:
        // Default deny for unknown tools that might mutate state
        if (toolName.startsWith('update_') || toolName.startsWith('delete_') || toolName.startsWith('bulk_')) {
          return { allowed: false, reason: `Tool ${toolName} requires explicit permission configuration.` };
        }
        return { allowed: true };
    }
  }

  /**
   * Generates an audit log entry for the AI action.
   */
  static async logAction(params: {
    userId: string;
    role: string;
    prompt: string;
    actionTaken: string;
    toolsUsed: string[];
    affectedRecords?: any;
    status: 'success' | 'failure';
    errorMessage?: string;
    executionTimeMs: number;
  }) {
    try {
      await supabase.from('ai_audit_logs').insert({
        user_id: params.userId,
        role: params.role,
        prompt: params.prompt,
        action_taken: params.actionTaken,
        tools_used: params.toolsUsed,
        affected_records: params.affectedRecords || {},
        status: params.status,
        error_message: params.errorMessage,
        execution_time_ms: params.executionTimeMs
      });
    } catch (e) {
      console.error('Failed to write to AI Audit Log:', e);
    }
  }
}
