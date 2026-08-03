-- 00000000000010_tasks_module.sql

-- Drop existing table if we are replacing the entire module
DROP TABLE IF EXISTS public.tasks CASCADE;

-- 1. Create tasks table
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_number VARCHAR(100) UNIQUE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    admission_id UUID, -- If admissions table exists, this would be a FK.
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(100) NOT NULL,
    assigned_user UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'Medium',
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    due_date DATE NOT NULL,
    due_time TIME,
    completed_date TIMESTAMPTZ,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_type VARCHAR(100),
    tags TEXT[],
    attachments_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 2. Create task_comments table
CREATE TABLE public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 3. Create task_reminders table
CREATE TABLE public.task_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    reminder_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending'
);

-- 4. Create task_history table
CREATE TABLE public.task_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Auto-Generate Task Number Sequence & Trigger
CREATE SEQUENCE IF NOT EXISTS task_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_task_number()
RETURNS TRIGGER AS $$
DECLARE
  current_year TEXT;
  seq_val TEXT;
BEGIN
  current_year := to_char(CURRENT_DATE, 'YYYY');
  seq_val := lpad(nextval('task_number_seq')::text, 5, '0');
  NEW.task_number := 'TSK-' || current_year || '-' || seq_val;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_task_insert_generate_number
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  WHEN (NEW.task_number IS NULL)
  EXECUTE PROCEDURE generate_task_number();

-- 6. Trigger to log Task History
CREATE OR REPLACE FUNCTION log_task_history()
RETURNS TRIGGER AS $$
DECLARE
  action_type VARCHAR(100);
  current_user_id UUID;
  details JSONB;
BEGIN
  -- Get current user id from auth context if available
  current_user_id := auth.uid();
  
  IF TG_OP = 'INSERT' THEN
    action_type := 'Task Created';
    details := jsonb_build_object('title', NEW.title, 'status', NEW.status);
    INSERT INTO public.task_history (task_id, type, user_id, details)
    VALUES (NEW.id, action_type, current_user_id, details);
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      action_type := 'Task Deleted';
      details := '{}'::jsonb;
    ELSIF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
      action_type := 'Task Restored';
      details := '{}'::jsonb;
    ELSIF NEW.status = 'Completed' AND OLD.status != 'Completed' THEN
      action_type := 'Task Completed';
      details := '{}'::jsonb;
    ELSIF NEW.assigned_user IS DISTINCT FROM OLD.assigned_user THEN
      action_type := 'Task Assigned';
      details := jsonb_build_object('old_user', OLD.assigned_user, 'new_user', NEW.assigned_user);
    ELSE
      action_type := 'Task Updated';
      details := jsonb_build_object(
        'old_status', OLD.status, 'new_status', NEW.status,
        'old_priority', OLD.priority, 'new_priority', NEW.priority
      );
    END IF;
    
    INSERT INTO public.task_history (task_id, type, user_id, details)
    VALUES (NEW.id, action_type, current_user_id, details);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_task_change_log_history
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE PROCEDURE log_task_history();

-- 7. Trigger to increment/decrement tasks_count on leads
CREATE OR REPLACE FUNCTION update_lead_tasks_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.lead_id IS NOT NULL THEN
    UPDATE public.leads SET tasks_count = tasks_count + 1 WHERE id = NEW.lead_id;
  ELSIF TG_OP = 'DELETE' AND OLD.lead_id IS NOT NULL THEN
    UPDATE public.leads SET tasks_count = GREATEST(0, tasks_count - 1) WHERE id = OLD.lead_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If soft deleted
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL AND NEW.lead_id IS NOT NULL THEN
      UPDATE public.leads SET tasks_count = GREATEST(0, tasks_count - 1) WHERE id = NEW.lead_id;
    END IF;
    -- If restored
    IF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL AND NEW.lead_id IS NOT NULL THEN
      UPDATE public.leads SET tasks_count = tasks_count + 1 WHERE id = NEW.lead_id;
    END IF;
    -- If lead_id changed
    IF NEW.lead_id IS DISTINCT FROM OLD.lead_id THEN
      IF OLD.lead_id IS NOT NULL THEN
        UPDATE public.leads SET tasks_count = GREATEST(0, tasks_count - 1) WHERE id = OLD.lead_id;
      END IF;
      IF NEW.lead_id IS NOT NULL AND NEW.deleted_at IS NULL THEN
        UPDATE public.leads SET tasks_count = tasks_count + 1 WHERE id = NEW.lead_id;
      END IF;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_task_change_update_lead_count
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW
  EXECUTE PROCEDURE update_lead_tasks_count();

-- 8. Row Level Security (RLS)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

-- Tasks Policies
CREATE POLICY "Super Admin and Admin have full access to tasks"
ON public.tasks
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.roles WHERE roles.id = users.role_id AND roles.name IN ('Super Admin', 'Admin')
    )
  )
);

CREATE POLICY "Users can view their assigned or created tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  assigned_user = auth.uid() OR created_by = auth.uid()
);

CREATE POLICY "Users can insert tasks they create"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid() OR assigned_user = auth.uid()
);

CREATE POLICY "Users can update their assigned or created tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  assigned_user = auth.uid() OR created_by = auth.uid()
);

-- Task Comments Policies
CREATE POLICY "Super Admin and Admin have full access to comments"
ON public.task_comments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.roles WHERE roles.id = users.role_id AND roles.name IN ('Super Admin', 'Admin')
    )
  )
);

CREATE POLICY "Users can view comments on tasks they have access to"
ON public.task_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_comments.task_id
    AND (tasks.assigned_user = auth.uid() OR tasks.created_by = auth.uid())
  )
);

CREATE POLICY "Users can insert comments on tasks they have access to"
ON public.task_comments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_comments.task_id
    AND (tasks.assigned_user = auth.uid() OR tasks.created_by = auth.uid())
  )
);

CREATE POLICY "Users can update their own comments"
ON public.task_comments
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
ON public.task_comments
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Reminders & History Policies
CREATE POLICY "Full access for Admins on reminders"
ON public.task_reminders FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users JOIN public.roles ON users.role_id = roles.id WHERE users.id = auth.uid() AND roles.name IN ('Super Admin', 'Admin')));

CREATE POLICY "Users can view reminders for their tasks"
ON public.task_reminders FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_reminders.task_id AND (tasks.assigned_user = auth.uid() OR tasks.created_by = auth.uid())));

CREATE POLICY "Users can insert reminders for their tasks"
ON public.task_reminders FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_reminders.task_id AND (tasks.assigned_user = auth.uid() OR tasks.created_by = auth.uid())));

CREATE POLICY "Full access for Admins on history"
ON public.task_history FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users JOIN public.roles ON users.role_id = roles.id WHERE users.id = auth.uid() AND roles.name IN ('Super Admin', 'Admin')));

CREATE POLICY "Users can view history for their tasks"
ON public.task_history FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_history.task_id AND (tasks.assigned_user = auth.uid() OR tasks.created_by = auth.uid())));

-- 9. Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_reminders;
