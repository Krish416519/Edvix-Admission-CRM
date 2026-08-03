-- 00000000000002_seed_data.sql
-- Optional script to inject seed data into the database for testing.
-- Run this if you want to test the CRM with populated data.

-- 1. Insert dummy Universities
INSERT INTO public.universities (id, name, code, country, status) VALUES
('11111111-1111-1111-1111-111111111111', 'Harvard University', 'HU', 'USA', 'Active'),
('22222222-2222-2222-2222-222222222222', 'Oxford University', 'OU', 'UK', 'Active')
ON CONFLICT (code) DO NOTHING;

-- 2. Insert dummy Courses
INSERT INTO public.courses (id, name, code, university_id, level, fee, status) VALUES
('33333333-3333-3333-3333-333333333333', 'Master of Business Administration', 'MBA-HU', '11111111-1111-1111-1111-111111111111', 'PG', 75000.00, 'Active'),
('44444444-4444-4444-4444-444444444444', 'Bachelor of Computer Science', 'BCS-OU', '22222222-2222-2222-2222-222222222222', 'UG', 45000.00, 'Active')
ON CONFLICT DO NOTHING;

-- 3. Insert dummy Leads
INSERT INTO public.leads (id, name, email, phone, state, city, budget, source, status, priority, score) VALUES
('55555555-5555-5555-5555-555555555555', 'John Doe', 'john.doe@example.com', '+1234567890', 'California', 'Los Angeles', 'High', 'Website', 'New', 'High', 85),
('66666666-6666-6666-6666-666666666666', 'Jane Smith', 'jane.smith@example.com', '+0987654321', 'London', 'London', 'Medium', 'Referral', 'Interested', 'Medium', 60),
('77777777-7777-7777-7777-777777777777', 'Alice Johnson', 'alice.j@example.com', '+1122334455', 'New York', 'New York', 'High', 'Facebook Ads', 'Admission Done', 'High', 95)
ON CONFLICT DO NOTHING;

-- 4. Insert dummy Admissions
INSERT INTO public.admissions (id, lead_id, student_name, email, phone, stage, progress) VALUES
('88888888-8888-8888-8888-888888888888', '77777777-7777-7777-7777-777777777777', 'Alice Johnson', 'alice.j@example.com', '+1122334455', 'Admission Completed', 100)
ON CONFLICT DO NOTHING;

-- 5. Insert dummy Payments
INSERT INTO public.payments (id, admission_id, lead_id, payment_type, amount, final_amount, status) VALUES
('99999999-9999-9999-9999-999999999999', '88888888-8888-8888-8888-888888888888', '77777777-7777-7777-7777-777777777777', 'Semester Fee', 25000.00, 25000.00, 'Paid')
ON CONFLICT DO NOTHING;
