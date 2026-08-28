-- ============================================================
-- 00000000000111_fix_tasks_rls_column.sql
-- P0 FIX: tasks RLS policy used wrong column name.
-- Old policy referenced "assigned_to_id" which does not exist.
-- Actual column is "assigned_user" (see 00000000000010_tasks_module.sql).
-- This caused task isolation for Counselors to be non-functional.
-- ============================================================

-- Drop the broken policy
DROP POLICY IF EXISTS "Users view/edit own assigned tasks" ON public.tasks;

-- Re-create with correct column name: assigned_user
CREATE POLICY "Users view/edit own assigned tasks" ON public.tasks
  FOR ALL
  USING (assigned_user = auth.uid());
