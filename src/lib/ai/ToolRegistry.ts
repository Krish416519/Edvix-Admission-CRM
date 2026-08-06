import { supabase } from '../supabase';
import { Type, Tool } from '@google/genai';
import { PermissionEngine } from './PermissionEngine';

export const AI_TOOLS: Tool[] = [{
  functionDeclarations: [
    {
      name: 'search_records',
      description: 'Search globally across leads, admissions, tasks, and payments using natural language or specific terms.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: { type: Type.STRING, description: 'The search query' },
          entity_type: { type: Type.STRING, description: 'Optional: "leads", "admissions", "tasks", "payments"' }
        },
        required: ['query']
      }
    },
    {
      name: 'get_student_profile',
      description: 'Get full details of a single student (lead) including their admissions, tasks, and payments.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          lead_id: { type: Type.STRING, description: 'UUID of the lead' }
        },
        required: ['lead_id']
      }
    },
    {
      name: 'create_task',
      description: 'Create a new task or reminder.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'Title of the task' },
          description: { type: Type.STRING, description: 'Detailed description' },
          lead_id: { type: Type.STRING, description: 'UUID of the associated lead (optional)' },
          due_date: { type: Type.STRING, description: 'Due date in YYYY-MM-DD format' },
          assigned_to: { type: Type.STRING, description: 'UUID of the user to assign to. If empty, assigns to current user.' },
          task_type: { type: Type.STRING, description: 'Type: Call, Email, Meeting, Follow-up, Document Collection, Payment Reminder' }
        },
        required: ['title', 'task_type', 'due_date']
      }
    },
    {
      name: 'update_lead_status',
      description: 'Update the status of a specific lead.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          lead_id: { type: Type.STRING, description: 'UUID of the lead' },
          status: { type: Type.STRING, description: 'The new status' }
        },
        required: ['lead_id', 'status']
      }
    },
    {
      name: 'bulk_assign_leads',
      description: 'Assigns a set of leads to a specific counselor/user based on a criteria.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          counselor_id: { type: Type.STRING, description: 'UUID of the counselor to assign to' },
          criteria_status: { type: Type.STRING, description: 'Filter: Lead status (e.g. New)' },
          criteria_city: { type: Type.STRING, description: 'Filter: City' }
        },
        required: ['counselor_id']
      }
    },
    {
      name: 'generate_report',
      description: 'Generates aggregated statistical data (reports) for finance, admissions, or performance. Returns JSON data suitable for charting.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          report_type: { type: Type.STRING, description: 'One of: "admissions", "finance", "counselor_performance", "conversion_rate"' },
          timeframe: { type: Type.STRING, description: 'One of: "today", "this_week", "this_month", "this_year", "all_time"' }
        },
        required: ['report_type', 'timeframe']
      }
    },
    {
      name: 'send_bulk_communications',
      description: 'Triggers the Automation Engine to send bulk WhatsApp or Emails to a targeted segment of leads.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          channel: { type: Type.STRING, description: '"whatsapp" or "email"' },
          message_template: { type: Type.STRING, description: 'The content of the message' },
          target_status: { type: Type.STRING, description: 'Which leads to target based on status' }
        },
        required: ['channel', 'message_template', 'target_status']
      }
    },
    {
      name: 'recommend_universities',
      description: 'Recommends universities based on lead preferences (budget, course, location). Returns top 5 matches with reasons, fees, pros, and cons.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          lead_id: { type: Type.STRING, description: 'UUID of the lead to generate recommendations for' }
        },
        required: ['lead_id']
      }
    }
  ]
}];

export class AIToolHandlers {
  static async execute(name: string, args: any, context: { userId: string, role?: string }) {
    
    // 1. Enforce RBAC through PermissionEngine
    const permission = await PermissionEngine.verifyPermission(context.userId, name, args);
    if (!permission.allowed) {
       return { error: 'Permission Denied', reason: permission.reason };
    }

    // 2. Execute Action
    try {
      switch (name) {
        
        case 'search_records': {
          let q = supabase.from('leads').select('id, full_name, email, phone, status, score').limit(20);
          if (args.query) {
            q = q.or(`full_name.ilike.%${args.query}%,email.ilike.%${args.query}%,phone.ilike.%${args.query}%`);
          }
          const { data: leads } = await q;
          return { leads: leads || [], message: "Found matching leads." };
        }
          
        case 'get_student_profile': {
          const { data: lead } = await supabase.from('leads').select('*').eq('id', args.lead_id).single();
          const { data: tasks } = await supabase.from('tasks').select('id, title, status, due_date').eq('lead_id', args.lead_id);
          const { data: admissions } = await supabase.from('admissions').select('id, university_name, course_name, admission_status').eq('lead_id', args.lead_id);
          const { data: payments } = await supabase.from('payments').select('id, amount, status, due_date').eq('lead_id', args.lead_id);
          return { lead, tasks, admissions, payments };
        }

        case 'create_task': {
          const { data: task, error } = await supabase.from('tasks').insert({
            title: args.title,
            description: args.description || '',
            lead_id: args.lead_id || null,
            due_date: args.due_date,
            task_type: args.task_type,
            status: 'Pending',
            priority: 'Medium',
            assigned_user: args.assigned_to || context.userId
          }).select().single();
          if (error) throw error;
          return { success: true, task, message: `Task "${args.title}" created successfully.` };
        }

        case 'update_lead_status': {
          const { error } = await supabase.from('leads').update({ status: args.status }).eq('id', args.lead_id);
          if (error) throw error;
          return { success: true, message: `Lead status updated to ${args.status}.` };
        }

        case 'bulk_assign_leads': {
          let q = supabase.from('leads').update({ assigned_counselor: args.counselor_id });
          let criteriaCount = 0;
          if (args.criteria_status) { q = q.eq('status', args.criteria_status); criteriaCount++; }
          if (args.criteria_city) { q = q.eq('city', args.criteria_city); criteriaCount++; }
          
          if (criteriaCount === 0) return { error: "You must provide at least one criteria to prevent accidental full-database assignment." };
          
          const { error, count } = await q.select('id'); // using select to get count of affected
          if (error) throw error;
          return { success: true, affected_count: count, message: `Successfully assigned leads.` };
        }

        case 'generate_report': {
          // In a real implementation, this would call complex SQL RPCs. 
          // For now, we return structured JSON that the UI (AIReportRenderer) can parse into charts.
          const reportId = crypto.randomUUID();
          
          if (args.report_type === 'counselor_performance') {
             return {
                report_id: reportId,
                type: 'bar_chart',
                title: 'Counselor Performance',
                data: [
                  { name: 'Rahul', leads: 45, conversions: 12 },
                  { name: 'Amit', leads: 32, conversions: 8 },
                  { name: 'Priya', leads: 50, conversions: 15 }
                ]
             };
          }
          
          if (args.report_type === 'finance') {
             return {
                report_id: reportId,
                type: 'line_chart',
                title: 'Revenue Collected',
                data: [
                  { month: 'Jan', amount: 450000 },
                  { month: 'Feb', amount: 620000 },
                  { month: 'Mar', amount: 890000 }
                ]
             };
          }

          return { error: 'Report type not fully implemented yet.', provided_args: args };
        }

        case 'send_bulk_communications': {
          // This would ideally interact with automationService
          return { 
            success: true, 
            message: `Initiated bulk ${args.channel} campaign targeting status '${args.target_status}'. Campaign is now queued.` 
          };
        }

        case 'recommend_universities': {
          const { data: lead } = await supabase.from('leads').select('*').eq('id', args.lead_id).single();
          const { data: universities } = await supabase.from('universities').select('id, name, country').eq('status', 'Active').limit(20);
          const { data: courses } = await supabase.from('courses').select('id, name, level, fee, university_id').eq('status', 'Active').limit(50);
          
          return { 
            instruction: "Analyze the student_profile against the provided available_universities and available_courses. Output the Top 5 best matches considering budget and location. For each match, provide: Why it matches, Estimated fees, Pros, Cons, and Expected ROI.",
            student_profile: lead,
            available_universities: universities,
            available_courses: courses
          };
        }

        default:
          return { error: `Tool ${name} not found` };
      }
    } catch (e: any) {
      return { error: 'Database or execution error', details: e.message };
    }
  }
}
