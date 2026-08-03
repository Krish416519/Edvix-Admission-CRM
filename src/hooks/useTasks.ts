import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Task, TaskComment, TaskReminder, TaskHistory } from '../types/schema';
import { useAuth } from '../contexts/AuthContext';

export interface UseTasksOptions {
  leadId?: string;
  status?: string;
  priority?: string;
  type?: string;
  assignedUser?: string;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
  enableRealtime?: boolean;
}

export function useTasks(options: UseTasksOptions = {}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const {
    leadId,
    status,
    priority,
    type,
    assignedUser,
    searchTerm,
    page = 1,
    pageSize = 50,
    enableRealtime = true
  } = options;

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assignee:users!tasks_assigned_user_fkey(name),
          lead:leads!tasks_lead_id_fkey(first_name, last_name)
        `, { count: 'exact' })
        .is('deleted_at', null);

      if (leadId) query = query.eq('lead_id', leadId);
      if (status && status !== 'All') query = query.eq('status', status);
      if (priority) query = query.eq('priority', priority);
      if (type) query = query.eq('task_type', type);
      if (assignedUser) query = query.eq('assigned_user', assignedUser);
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,task_number.ilike.%${searchTerm}%`);
      }

      // Sorting & Pagination
      query = query.order('due_date', { ascending: true })
                   .order('due_time', { ascending: true });
                   
      if (page && pageSize) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      const mappedTasks: Task[] = (data || []).map((d: any) => ({
        id: d.id,
        taskNumber: d.task_number,
        title: d.title,
        description: d.description,
        type: d.task_type,
        priority: d.priority,
        status: d.status,
        dueDate: d.due_date,
        dueTime: d.due_time,
        completedDate: d.completed_date,
        isRecurring: d.is_recurring,
        recurrenceType: d.recurrence_type,
        tags: d.tags,
        attachmentsCount: d.attachments_count,
        commentsCount: d.comments_count,
        assignedUser: d.assigned_user,
        leadId: d.lead_id,
        admissionId: d.admission_id,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        deletedAt: d.deleted_at,
        
        // Hydrated relations for UI compatibility
        assignedTo: d.assignee?.name || 'Unassigned',
        leadName: d.lead ? `${d.lead.first_name} ${d.lead.last_name || ''}`.trim() : undefined,
        
        // Legacy fields for backward compatibility
        assignedToId: d.assigned_user,
      }));

      setTasks(mappedTasks);
      if (count !== null) setTotalCount(count);

    } catch (err: any) {
      console.error('Error fetching tasks:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, leadId, status, priority, type, assignedUser, searchTerm, page, pageSize]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (!enableRealtime || !user) return;
    
    const channelId = `tasks_realtime_${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, enableRealtime, fetchTasks]);

  const addTask = async (task: Partial<Task>) => {
    try {
      const payload = {
        title: task.title,
        description: task.description,
        task_type: task.type || 'Custom Task',
        priority: task.priority || 'Medium',
        status: task.status || 'Pending',
        due_date: task.dueDate || new Date().toISOString().split('T')[0],
        due_time: task.dueTime,
        assigned_user: task.assignedUser || user?.id,
        lead_id: task.leadId || null,
        created_by: user?.id
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert([payload])
        .select()
        .single();
        
      if (error) throw error;
      await fetchTasks();
      return { success: true, data };
    } catch (err: any) {
      console.error('Add task error:', err);
      return { success: false, error: err.message };
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const payload: any = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.priority !== undefined) payload.priority = updates.priority;
      if (updates.dueDate !== undefined) payload.due_date = updates.dueDate;
      if (updates.dueTime !== undefined) payload.due_time = updates.dueTime;
      if (updates.assignedUser !== undefined) {
        payload.assigned_user = updates.assignedUser;
      }
      
      if (updates.status === 'Completed') {
        payload.completed_date = new Date().toISOString();
      }

      const { error } = await supabase.from('tasks').update(payload).eq('id', id);
      if (error) throw error;
      
      await fetchTasks();
      return { success: true };
    } catch (err: any) {
      console.error('Update task error:', err);
      return { success: false, error: err.message };
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      await fetchTasks();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const fetchComments = async (taskId: string) => {
    const { data, error } = await supabase
      .from('task_comments')
      .select('*, user:users!user_id(name, avatar)')
      .eq('task_id', taskId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data.map((d: any) => ({
      ...d,
      taskId: d.task_id,
      userId: d.user_id,
      user: { name: d.user?.name, avatar: d.user?.avatar }
    }));
  };

  const addComment = async (taskId: string, content: string) => {
    const { error } = await supabase.from('task_comments').insert({
      task_id: taskId,
      user_id: user?.id,
      content
    });
    if (error) throw error;
    await fetchTasks(); // Update comments count
  };

  const fetchHistory = async (taskId: string) => {
    const { data, error } = await supabase
      .from('task_history')
      .select('*, user:users!user_id(name)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data.map((d: any) => ({
      ...d,
      taskId: d.task_id,
      userId: d.user_id,
      user: { name: d.user?.name }
    }));
  };

  return { 
    tasks, 
    totalCount, 
    isLoading, 
    error, 
    addTask, 
    updateTask, 
    deleteTask,
    fetchComments,
    addComment,
    fetchHistory,
    refresh: fetchTasks
  };
}
