-- 00000000000025_sync_user_roles.sql
-- Trigger to keep auth.users.raw_user_meta_data role in sync with public.users.role_id

CREATE OR REPLACE FUNCTION public.sync_user_role_to_auth()
RETURNS trigger AS $$
DECLARE
  role_name TEXT;
BEGIN
  -- Get the role name
  SELECT name INTO role_name FROM public.roles WHERE id = NEW.role_id;
  
  -- Update auth.users metadata
  IF role_name IS NOT NULL THEN
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb(role_name)
    )
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_role_changed ON public.users;
CREATE TRIGGER on_user_role_changed
  AFTER UPDATE OF role_id ON public.users
  FOR EACH ROW
  WHEN (OLD.role_id IS DISTINCT FROM NEW.role_id)
  EXECUTE PROCEDURE public.sync_user_role_to_auth();
