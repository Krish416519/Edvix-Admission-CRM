-- 00000000000006_auth_profile_trigger.sql
-- Add phone, department, and last_login to users, and set up automatic profile creation trigger.

--------------------------------------------------
-- 1. MODIFY USERS TABLE
--------------------------------------------------
ALTER TABLE public.users ADD COLUMN phone VARCHAR(50);
ALTER TABLE public.users ADD COLUMN department VARCHAR(100);
ALTER TABLE public.users ADD COLUMN last_login TIMESTAMPTZ;

--------------------------------------------------
-- 2. CREATE PROFILE TRIGGER
--------------------------------------------------
-- This trigger automatically creates a profile entry when a new user signs up via Supabase Auth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url, role_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', 'https://i.pravatar.cc/150?u=' || new.id),
    -- Optionally map role if provided in metadata, otherwise NULL
    -- NOTE: In a real app we'd map string role to public.roles UUID, but since RLS uses JWT claim,
    -- this ensures the basic row is there.
    NULL 
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

--------------------------------------------------
-- 3. UPDATE RLS FOR PROFILE UPDATES
--------------------------------------------------
-- Allow users to update their own profiles
CREATE POLICY "Users can update own profile" ON public.users 
  FOR UPDATE USING (auth.uid() = id);

