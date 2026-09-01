-- Computed Columns for Advanced Lead Filters

-- 1. Returns an array of all disposition IDs a lead has EVER had.
-- This allows PostgREST to filter using the `overlaps` or `contains` operators natively.
CREATE OR REPLACE FUNCTION public.lead_historical_disposition_ids(lead_row public.leads)
RETURNS UUID[] AS $$
  SELECT COALESCE(array_agg(DISTINCT disposition_id), '{}'::UUID[])
  FROM public.lead_disposition_history
  WHERE lead_id = lead_row.id AND disposition_id IS NOT NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER
   SET search_path = public, pg_temp;

-- 2. Returns an array of transition strings in the format 'dispX_dispY'
-- representing all chronological sequences where dispX happened before dispY.
CREATE OR REPLACE FUNCTION public.lead_disposition_transitions(lead_row public.leads)
RETURNS TEXT[] AS $$
  SELECT COALESCE(array_agg(DISTINCT hx.disposition_id::text || '_' || hy.disposition_id::text), '{}'::TEXT[])
  FROM public.lead_disposition_history hx
  JOIN public.lead_disposition_history hy ON hx.lead_id = hy.lead_id
  WHERE hx.lead_id = lead_row.id 
    AND hx.created_at < hy.created_at
    AND hx.disposition_id IS NOT NULL
    AND hy.disposition_id IS NOT NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER
   SET search_path = public, pg_temp;

-- Grant permissions to authenticated users to execute these functions
GRANT EXECUTE ON FUNCTION public.lead_historical_disposition_ids(public.leads) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lead_disposition_transitions(public.leads) TO authenticated;
