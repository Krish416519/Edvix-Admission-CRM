-- Migration: Recreate payments compatibility view
-- The payments table was removed/renamed to payment_installments, payment_receipts,
-- invoice_items, and ledger_entries. This view provides backward compatibility for
-- analytics RPCs that reference public.payments.

-- The view is built from invoice_items (the primary payment tracking table)
-- and payment_installments (secondary source).

CREATE OR REPLACE VIEW public.payments AS
SELECT
  ii.id,
  ii.invoice_id AS payment_id,
  NULL::uuid AS admission_id,
  ii.fee_category AS payment_method,
  'Paid' AS status,
  ii.net_amount,
  ii.net_amount AS amount,
  ii.created_at AS payment_date,
  ii.created_at AS created_at,
  ii.created_at AS updated_at,
  ii.organization_id
FROM public.invoice_items ii

UNION ALL

SELECT
  pi.id,
  pi.id AS payment_id,
  NULL::uuid AS admission_id,
  'Bank Transfer' AS payment_method,
  pi.status,
  COALESCE(pi.amount_paid, pi.amount_due) AS net_amount,
  COALESCE(pi.amount_paid, pi.amount_due) AS amount,
  pi.due_date AS payment_date,
  pi.created_at AS created_at,
  pi.created_at AS updated_at,
  pi.organization_id
FROM public.payment_installments pi
WHERE pi.status = 'Paid'
