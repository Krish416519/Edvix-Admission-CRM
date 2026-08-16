-- 00000000000087_lead_command_center.sql
-- Migration for the new Lead Command Center backend requirements

-- 1. Add tags to leads
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::TEXT[];

-- 2. Create Saved Views table
CREATE TABLE IF NOT EXISTS public.saved_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    columns JSONB DEFAULT '[]'::jsonb,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for saved_views
ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own saved views"
ON public.saved_views FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Add updated_at trigger for saved_views
CREATE TRIGGER set_saved_views_updated_at
BEFORE UPDATE ON public.saved_views
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at_generic();
