-- =============================================================
-- 00000000000032_add_missing_fk_indexes.sql
-- Adds missing indexes for foreign keys to prevent statement 
-- timeouts during bulk delete operations of Universities/Courses.
-- =============================================================

-- 1. Courses referencing Universities
CREATE INDEX IF NOT EXISTS idx_courses_university_id ON public.courses(university_id);

-- 2. Leads referencing Courses
CREATE INDEX IF NOT EXISTS idx_leads_course_id ON public.leads(course_id);

-- 3. Admissions referencing Courses
CREATE INDEX IF NOT EXISTS idx_admissions_course_id ON public.admissions(course_id);

-- 4. Finance Tables
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'university_commissions') THEN
    CREATE INDEX IF NOT EXISTS idx_uni_commissions_university_id 
      ON public.university_commissions(university_id);
    CREATE INDEX IF NOT EXISTS idx_uni_commissions_course_id 
      ON public.university_commissions(course_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'university_invoices') THEN
    CREATE INDEX IF NOT EXISTS idx_uni_invoices_university_id 
      ON public.university_invoices(university_id);
  END IF;
END $$;
