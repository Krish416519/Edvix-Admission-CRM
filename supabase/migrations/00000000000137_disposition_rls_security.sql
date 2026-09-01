-- 00000000000137_disposition_rls_security.sql
-- Enforces strict database-level separation of dispositions between CRM contexts.

-------------------------------------------------------------------------------
-- 1. DROP EXISTING PERMISSIVE RLS POLICIES
-------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow read access to disposition_categories" ON public.disposition_categories;
DROP POLICY IF EXISTS "Allow read access to dispositions" ON public.dispositions;
DROP POLICY IF EXISTS "Allow insert access to lead_disposition_history" ON public.lead_disposition_history;

-------------------------------------------------------------------------------
-- 2. CREATE STRICT CONTEXT-AWARE RLS POLICIES FOR CONFIGURATION TABLES
-------------------------------------------------------------------------------
-- disposition_categories: Users can read if they belong to an organization with a matching crm_context, or if they are a super admin.
CREATE POLICY "Users can view context-aware disposition categories" 
ON public.disposition_categories 
FOR SELECT 
USING (
    public.is_admin() 
    OR crm_context IN (
        SELECT o.crm_context 
        FROM public.organizations o 
        JOIN public.organization_users ou ON o.id = ou.organization_id 
        WHERE ou.user_id = auth.uid()
        AND ou.status = 'Active'
    )
);

-- dispositions: Users can read if they belong to an organization with a matching crm_context, or if they are a super admin.
CREATE POLICY "Users can view context-aware dispositions" 
ON public.dispositions 
FOR SELECT 
USING (
    public.is_admin() 
    OR crm_context IN (
        SELECT o.crm_context 
        FROM public.organizations o 
        JOIN public.organization_users ou ON o.id = ou.organization_id 
        WHERE ou.user_id = auth.uid()
        AND ou.status = 'Active'
    )
);

-------------------------------------------------------------------------------
-- 3. CREATE DATA INTEGRITY TRIGGERS TO PREVENT CROSS-CONTEXT ASSIGNMENT
-------------------------------------------------------------------------------

-- Trigger Function for `leads` table to validate latest_disposition_id
CREATE OR REPLACE FUNCTION check_lead_disposition_context()
RETURNS TRIGGER AS $$
DECLARE
    lead_context VARCHAR(50);
    disp_context VARCHAR(50);
BEGIN
    -- Only check if latest_disposition_id is being set/changed and is not null
    IF NEW.latest_disposition_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.latest_disposition_id IS DISTINCT FROM OLD.latest_disposition_id) THEN
        
        -- Get the lead's context from its organization
        SELECT crm_context INTO lead_context
        FROM public.organizations
        WHERE id = NEW.organization_id;

        -- Get the disposition's context
        SELECT crm_context INTO disp_context
        FROM public.dispositions
        WHERE id = NEW.latest_disposition_id;

        -- Allow global/null contexts if any are missing for backward compatibility
        IF lead_context IS NOT NULL AND disp_context IS NOT NULL AND lead_context IS DISTINCT FROM disp_context THEN
            RAISE EXCEPTION 'Disposition context (%) does not match Lead context (%)', disp_context, lead_context;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_lead_disposition_context ON public.leads;
CREATE TRIGGER trg_check_lead_disposition_context
BEFORE INSERT OR UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION check_lead_disposition_context();


-- Trigger Function for `lead_disposition_history` table to validate disposition_id
CREATE OR REPLACE FUNCTION check_history_disposition_context()
RETURNS TRIGGER AS $$
DECLARE
    lead_context VARCHAR(50);
    disp_context VARCHAR(50);
BEGIN
    IF NEW.disposition_id IS NOT NULL THEN
        -- Get the lead's context via the leads table
        SELECT o.crm_context INTO lead_context
        FROM public.leads l
        JOIN public.organizations o ON l.organization_id = o.id
        WHERE l.id = NEW.lead_id;

        -- Get the disposition's context
        SELECT crm_context INTO disp_context
        FROM public.dispositions
        WHERE id = NEW.disposition_id;

        -- Allow global/null contexts if any are missing for backward compatibility
        IF lead_context IS NOT NULL AND disp_context IS NOT NULL AND lead_context IS DISTINCT FROM disp_context THEN
            RAISE EXCEPTION 'History Disposition context (%) does not match Lead context (%)', disp_context, lead_context;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_history_disposition_context ON public.lead_disposition_history;
CREATE TRIGGER trg_check_history_disposition_context
BEFORE INSERT OR UPDATE ON public.lead_disposition_history
FOR EACH ROW
EXECUTE FUNCTION check_history_disposition_context();

-------------------------------------------------------------------------------
-- 4. CREATE RLS POLICIES FOR HISTORY TABLE
-------------------------------------------------------------------------------
-- Re-establish the RLS policy for inserting into lead_disposition_history with context validation
-- (The trigger already catches invalid inserts securely, so the CHECK policy can just ensure the user is authenticated).
CREATE POLICY "Allow authenticated insert to lead_disposition_history" 
ON public.lead_disposition_history 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');
