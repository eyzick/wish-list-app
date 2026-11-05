-- Run once when upgrading the existing empty wish-list database.
-- Renaming preserves the existing RLS policies, grants, and foreign keys.
BEGIN;

ALTER TABLE public.family_members RENAME TO members;
ALTER FUNCTION public.is_family_member() RENAME TO is_member;
ALTER FUNCTION public.is_family_admin() RENAME TO is_member_admin;

-- SQL function bodies are stored as text, so update their table references too.
CREATE OR REPLACE FUNCTION public.is_member()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public.members WHERE id = auth.uid()) $$;

CREATE OR REPLACE FUNCTION public.is_member_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public.members WHERE id = auth.uid() AND is_admin) $$;

CREATE FUNCTION public.create_member_for_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.members (id, name, is_admin)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(LEFT(BTRIM(NEW.raw_user_meta_data ->> 'name'), 80), ''),
      NULLIF(split_part(NEW.email, '@', 1), ''),
      'Member'
    ),
    NOT EXISTS (SELECT 1 FROM public.members)
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER create_member_on_signup AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.create_member_for_new_user();

COMMIT;
