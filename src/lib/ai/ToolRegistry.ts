import { supabase } from '../supabase';
import { Type, Tool } from '@google/genai';

export const AI_TOOLS: Tool[] = [{
  functionDeclarations: [
    {
      name: 'search_leads',
      description: 'Search for CRM leads by name, email, phone, or status. Use this to find student records.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: { type: Type.STRING, description: 'Search term for name or email' },
          status: { type: Type.STRING, description: 'Optional status filter (e.g. New, Contacted, Qualified)' }
        }
      }
    },
    {
      name: 'create_task',
      description: 'Create a new task or reminder for a specific lead.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'Title of the task' },
          description: { type: Type.STRING, description: 'Detailed description of what needs to be done' },
          lead_id: { type: Type.STRING, description: 'UUID of the associated lead' },
          due_date: { type: Type.STRING, description: 'Due date in YYYY-MM-DD format' },
          task_type: { type: Type.STRING, description: 'Type of task: Call, Email, Meeting, Follow-up, Document Collection, Payment Reminder' }
        },
        required: ['title', 'task_type', 'due_date']
      }
    },
    {
      name: 'get_pending_payments',
      description: 'Find all students who have pending or overdue payments.',
      parameters: {
        type: Type.OBJECT,
        properties: {}
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
      name: 'update_lead_status',
      description: 'Update the status of a lead (e.g. to Qualified, Dropped, Enrolled).',
      parameters: {
        type: Type.OBJECT,
        properties: {
          lead_id: { type: Type.STRING, description: 'UUID of the lead' },
          status: { type: Type.STRING, description: 'The new status' }
        },
        required: ['lead_id', 'status']
      }
    }
  ]
}];

export class AIToolHandlers {
  static async execute(name: string, args: any, context: any) {
    switch (name) {
      case 'search_leads': {
        let q = supabase.from('leads').select('*').limit(10);
        if (args.query) {
          q = q.or(`full_name.ilike.%${args.query}%,email.ilike.%${args.query}%`);
        }
        if (args.status) {
          q = q.eq('status', args.status);
        }
        const { data: leads } = await q;
        return { leads: leads || [] };
      }
        
      case 'create_task': {
        const { data: task, error } = await supabase.from('tasks').insert({
          title: args.title,
          description: args.description,
          lead_id: args.lead_id,
          due_date: args.due_date,
          task_type: args.task_type,
          status: 'Pending',
          priority: 'Medium',
          assigned_user: context.userId // Extracted from current user session
        }).select().single();
        if (error) return { error: error.message };
        return { success: true, task };
      }
        
      case 'get_pending_payments': {
        const { data: payments } = await supabase.from('payments')
          .select('*, leads(full_name, email)')
          .in('status', ['Pending', 'Partially Paid', 'Overdue'])
          .limit(20);
        return { pending_payments: payments || [] };
      }

      case 'get_student_profile': {
        const { data: lead } = await supabase.from('leads').select('*').eq('id', args.lead_id).single();
        const { data: tasks } = await supabase.from('tasks').select('*').eq('lead_id', args.lead_id);
        const { data: admissions } = await supabase.from('admissions').select('*').eq('lead_id', args.lead_id);
        const { data: payments } = await supabase.from('payments').select('*').eq('lead_id', args.lead_id);
        return { lead, tasks, admissions, payments };
      }

      case 'update_lead_status': {
        const { error } = await supabase.from('leads').update({ status: args.status }).eq('id', args.lead_id);
        if (error) return { error: error.message };
        return { success: true };
      }
        
      default:
        return { error: `Tool ${name} not found` };
    }
  }
}
