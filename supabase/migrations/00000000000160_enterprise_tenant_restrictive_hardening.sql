-- ====================================================================
-- MIGRATION 160: ENTERPRISE TENANT RESTRICTIVE POLICY HARDENING
-- Converts permissive tenant isolation policies to AS RESTRICTIVE
-- on sensitive lead child tables and private user records.
-- Ensures tenant checks act as an AND filter, preventing cross-counselor
-- leakage of notes, documents, activities, and notifications.
-- ====================================================================

-- 1. lead_activities
DROP POLICY IF EXISTS tenant_isolation_policy ON public.lead_activities;
CREATE POLICY tenant_isolation_policy ON public.lead_activities
    AS RESTRICTIVE
    FOR ALL
    USING (public.is_member_of(organization_id))
    WITH CHECK (public.is_member_of(organization_id));

-- 2. notes
DROP POLICY IF EXISTS tenant_isolation_policy ON public.notes;
CREATE POLICY tenant_isolation_policy ON public.notes
    AS RESTRICTIVE
    FOR ALL
    USING (public.is_member_of(organization_id))
    WITH CHECK (public.is_member_of(organization_id));

-- 3. admissions
DROP POLICY IF EXISTS tenant_isolation_policy ON public.admissions;
CREATE POLICY tenant_isolation_policy ON public.admissions
    AS RESTRICTIVE
    FOR ALL
    USING (public.is_member_of(organization_id))
    WITH CHECK (public.is_member_of(organization_id));

-- 4. documents
DROP POLICY IF EXISTS tenant_isolation_policy ON public.documents;
CREATE POLICY tenant_isolation_policy ON public.documents
    AS RESTRICTIVE
    FOR ALL
    USING (public.is_member_of(organization_id))
    WITH CHECK (public.is_member_of(organization_id));

-- 5. notifications
DROP POLICY IF EXISTS tenant_isolation_policy ON public.notifications;
CREATE POLICY tenant_isolation_policy ON public.notifications
    AS RESTRICTIVE
    FOR ALL
    USING (public.is_member_of(organization_id))
    WITH CHECK (public.is_member_of(organization_id));

-- 6. ai_conversations
DROP POLICY IF EXISTS tenant_isolation_policy ON public.ai_conversations;
CREATE POLICY tenant_isolation_policy ON public.ai_conversations
    AS RESTRICTIVE
    FOR ALL
    USING (public.is_member_of(organization_id))
    WITH CHECK (public.is_member_of(organization_id));

-- 7. ai_messages
DROP POLICY IF EXISTS tenant_isolation_policy ON public.ai_messages;
CREATE POLICY tenant_isolation_policy ON public.ai_messages
    AS RESTRICTIVE
    FOR ALL
    USING (public.is_member_of(organization_id))
    WITH CHECK (public.is_member_of(organization_id));

NOTIFY pgrst, 'reload schema';
