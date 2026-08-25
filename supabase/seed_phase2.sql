-- Seed Data for Phase 2: Academic Counseling Intelligence Engine
-- This script creates test universities, programs, rules, fees, and 50 varied student leads.

-- Wait, creating 50 leads with all explicit fields in SQL is massive.
-- Let's insert a representative sample (10 diverse profiles) that cover the Edge Cases.

-- 1. Create a Test University
INSERT INTO universities (id, name, code, country, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'TEST University of Technology', 'TUT', 'India', 'Active')
ON CONFLICT DO NOTHING;

-- 2. Create Test Courses (Programs)
INSERT INTO courses (id, university_id, name, code, level, fee, status)
VALUES 
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'MBA Marketing (Test)', 'MBA-MKT-T', 'PG', 150000, 'Active'),
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'MCA Data Analytics (Test)', 'MCA-DA-T', 'PG', 120000, 'Active')
ON CONFLICT DO NOTHING;

-- 3. Insert Program Eligibility Rules
-- MBA Rule: Requires Graduation >= 50%, no backlogs allowed
INSERT INTO program_eligibility_rules (course_id, university_id, rule_group_name, conditions, status)
VALUES (
    '00000000-0000-0000-0000-000000000002', 
    '00000000-0000-0000-0000-000000000001', 
    'MBA Standard Rule',
    '{"requiresGraduation": true, "minimumPercentage": 50, "checkBacklogs": true, "allowedBacklogs": 0}',
    'Active'
);

-- MCA Rule: Requires Graduation >= 45%, backlogs manual review
INSERT INTO program_eligibility_rules (course_id, university_id, rule_group_name, conditions, status)
VALUES (
    '00000000-0000-0000-0000-000000000003', 
    '00000000-0000-0000-0000-000000000001', 
    'MCA Tech Rule',
    '{"requiresGraduation": true, "minimumPercentage": 45, "checkBacklogs": true, "allowBacklogsWithManualReview": true}',
    'Active'
);

-- 4. Insert Fees
INSERT INTO program_fees (course_id, university_id, fee_category, amount, is_mandatory)
VALUES 
-- MBA Fees
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Tuition', 140000, true),
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Examination', 10000, true),
-- MCA Fees
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Tuition', 115000, true),
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Examination', 5000, true);

-- 5. Insert Test Leads covering Edge Cases
INSERT INTO leads (
    first_name, last_name, email, phone, state, city, lead_source, lead_status, priority, lead_score,
    education, graduation_degree, graduation_percentage, graduation_backlogs, budget, career_goal, course, notes_count, tasks_count
) VALUES
-- Case 1: Grad 62%, requirement 50% -> Expected PASS
('Test', 'Case1', 'case1@example.com', '+919999999001', 'Delhi', 'Delhi', 'Website', 'New', 'High', 90,
 'Graduate', 'B.Com', 62, 0, '150000', 'Marketing Manager', 'MBA Marketing (Test)', 0, 0),

-- Case 2: Missing percentage -> Expected INSUFFICIENT_DATA
('Test', 'Case2', 'case2@example.com', '+919999999002', 'Delhi', 'Delhi', 'Website', 'New', 'Medium', 50,
 'Graduate', 'B.Sc', null, 0, '150000', 'Marketing', 'MBA Marketing (Test)', 0, 0),

-- Case 3: Backlogs manual review -> Expected MANUAL_REVIEW
('Test', 'Case3', 'case3@example.com', '+919999999003', 'Delhi', 'Delhi', 'Website', 'New', 'High', 80,
 'Graduate', 'BCA', 60, 2, '120000', 'Data Analyst', 'MCA Data Analytics (Test)', 0, 0),

-- Case 4: Grad 45%, min 50% -> Expected NOT_ELIGIBLE (for MBA, but might be eligible for MCA)
('Test', 'Case4', 'case4@example.com', '+919999999004', 'Delhi', 'Delhi', 'Website', 'New', 'High', 45,
 'Graduate', 'B.Com', 45, 0, '150000', 'Business', 'MBA Marketing (Test)', 0, 0),

-- Case 6: Budget test (₹150,000 budget vs ₹145,000 fee)
('Test', 'Case6', 'case6@example.com', '+919999999006', 'Delhi', 'Delhi', 'Website', 'New', 'High', 95,
 'Graduate', 'BBA', 70, 0, '150000', 'Marketing Manager', 'MBA Marketing (Test)', 0, 0);
