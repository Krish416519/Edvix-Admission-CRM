-- Add snapshot columns to lead_disposition_history
ALTER TABLE public.lead_disposition_history
ADD COLUMN IF NOT EXISTS disposition_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS sub_disposition_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS next_action_name VARCHAR(255);

-- Disable trigger before bulk update
ALTER TABLE public.lead_disposition_history DISABLE TRIGGER trg_check_history_disposition_context;

-- Populate existing rows with the current names in the joined tables
UPDATE public.lead_disposition_history h
SET disposition_name = d.name
FROM public.dispositions d
WHERE h.disposition_id = d.id AND h.disposition_name IS NULL;

UPDATE public.lead_disposition_history h
SET sub_disposition_name = s.name
FROM public.sub_dispositions s
WHERE h.sub_disposition_id = s.id AND h.sub_disposition_name IS NULL;

UPDATE public.lead_disposition_history h
SET next_action_name = n.name
FROM public.next_actions n
WHERE h.next_action_id = n.id AND h.next_action_name IS NULL;

-- Enable trigger after bulk update
ALTER TABLE public.lead_disposition_history ENABLE TRIGGER trg_check_history_disposition_context;
