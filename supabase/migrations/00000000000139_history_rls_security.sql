-- Fix globally readable lead_disposition_history
DROP POLICY IF EXISTS "Allow read access to lead_disposition_history" ON public.lead_disposition_history;

CREATE POLICY "Users can view disposition history for own leads"
ON public.lead_disposition_history
FOR SELECT
USING (
    public.is_admin() OR
    EXISTS (
        SELECT 1 FROM public.leads l
        JOIN public.organizations o ON l.organization_id = o.id
        JOIN public.organization_users ou ON o.id = ou.organization_id
        WHERE l.id = lead_disposition_history.lead_id
        AND ou.user_id = auth.uid()
        AND ou.status = 'Active'
    )
);
