-- Documents
DROP TABLE IF EXISTS document_requirements CASCADE;
DROP TABLE IF EXISTS document_rejection_reasons CASCADE;
DROP TABLE IF EXISTS lead_documents CASCADE;
DROP TABLE IF EXISTS university_documents CASCADE;
DROP TABLE IF EXISTS partner_documents CASCADE;

-- Admission
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS admission_decisions CASCADE;
DROP TABLE IF EXISTS admission_letters CASCADE;
DROP TABLE IF EXISTS university_submissions CASCADE;
DROP TABLE IF EXISTS university_status_history CASCADE;
DROP TABLE IF EXISTS enrollment_checklists CASCADE;
DROP TABLE IF EXISTS student_enrollments CASCADE;
DROP TABLE IF EXISTS enrollment_milestones CASCADE;
DROP TABLE IF EXISTS university_admissions CASCADE;
DROP TABLE IF EXISTS partner_admissions CASCADE;

-- Payments / Finance
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS billing_invoices CASCADE;
DROP TABLE IF EXISTS billing_payments CASCADE;
DROP TABLE IF EXISTS payout_batches CASCADE;
DROP TABLE IF EXISTS payout_approvals CASCADE;
DROP TABLE IF EXISTS financial_disputes CASCADE;
DROP TABLE IF EXISTS reconciliation_exceptions CASCADE;
DROP TABLE IF EXISTS partner_payments CASCADE;
DROP TABLE IF EXISTS university_finance CASCADE;

-- Email & Communication
DROP TABLE IF EXISTS email_messages CASCADE;
DROP TABLE IF EXISTS sms_messages CASCADE;
DROP TABLE IF EXISTS email_templates CASCADE;
DROP TABLE IF EXISTS communication_preferences CASCADE;
