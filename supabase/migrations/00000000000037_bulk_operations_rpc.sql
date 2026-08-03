-- 1. Bulk Delete (Soft Delete)
CREATE OR REPLACE FUNCTION public.bulk_delete_leads(p_lead_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.leads
  SET deleted_at = now(), updated_at = now()
  WHERE id = ANY(p_lead_ids);

  RETURN jsonb_build_object('success', true, 'total', array_length(p_lead_ids, 1));
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 2. Bulk Update Status/Priority/Source
CREATE OR REPLACE FUNCTION public.bulk_update_leads(
  p_lead_ids UUID[],
  p_status TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL,
  p_source TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.leads
  SET 
    lead_status = COALESCE(p_status, lead_status),
    priority = COALESCE(p_priority, priority),
    lead_source = COALESCE(p_source, lead_source),
    updated_at = now()
  WHERE id = ANY(p_lead_ids);

  RETURN jsonb_build_object('success', true, 'total', array_length(p_lead_ids, 1));
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
