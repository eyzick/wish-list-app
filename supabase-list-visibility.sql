-- Run once to add public/private lists to an existing wish-list database.
-- Existing lists stay public. Apply before deploying the updated app.
BEGIN;

ALTER TABLE public.wish_lists ADD COLUMN IF NOT EXISTS is_public boolean;
UPDATE public.wish_lists SET is_public = true WHERE is_public IS NULL;
ALTER TABLE public.wish_lists ALTER COLUMN is_public SET DEFAULT true;
ALTER TABLE public.wish_lists ALTER COLUMN is_public SET NOT NULL;

CREATE OR REPLACE FUNCTION public.can_view_list(p_list_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.wish_lists l
    WHERE l.id = p_list_id AND (l.is_public OR l.owner_id = auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION public.owns_list(p_list_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.wish_lists l
    WHERE l.id = p_list_id AND l.owner_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.purchase_visible(p_item_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.wish_items i
    JOIN public.wish_lists l ON l.id = i.wish_list_id
    WHERE i.id = p_item_id AND l.is_public AND l.owner_id <> auth.uid()
  )
$$;

REVOKE ALL ON FUNCTION public.can_view_list(uuid), public.owns_list(uuid), public.purchase_visible(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_list(uuid), public.owns_list(uuid), public.purchase_visible(uuid) TO authenticated;

-- The older project uses family_* policy names. Drop both versions so no
-- permissive policy can leave private rows visible through an OR condition.
DROP POLICY IF EXISTS family_read_lists ON public.wish_lists;
DROP POLICY IF EXISTS member_read_lists ON public.wish_lists;
DROP POLICY IF EXISTS family_insert_own_lists ON public.wish_lists;
DROP POLICY IF EXISTS member_insert_own_lists ON public.wish_lists;
DROP POLICY IF EXISTS family_update_lists ON public.wish_lists;
DROP POLICY IF EXISTS member_update_lists ON public.wish_lists;
DROP POLICY IF EXISTS admin_delete_lists ON public.wish_lists;

CREATE POLICY member_read_lists ON public.wish_lists
  FOR SELECT TO authenticated USING (
    public.is_member() AND (is_public OR owner_id = auth.uid())
  );
CREATE POLICY member_insert_own_lists ON public.wish_lists
  FOR INSERT TO authenticated WITH CHECK (
    public.is_member() AND owner_id = auth.uid()
  );
CREATE POLICY member_update_lists ON public.wish_lists
  FOR UPDATE TO authenticated USING (
    public.is_member() AND owner_id = auth.uid()
  ) WITH CHECK (
    public.is_member() AND owner_id = auth.uid()
  );
CREATE POLICY admin_delete_lists ON public.wish_lists
  FOR DELETE TO authenticated USING (
    public.is_member_admin() AND (is_public OR owner_id = auth.uid())
  );

DROP POLICY IF EXISTS family_read_items ON public.wish_items;
DROP POLICY IF EXISTS member_read_items ON public.wish_items;
DROP POLICY IF EXISTS family_insert_items ON public.wish_items;
DROP POLICY IF EXISTS member_insert_items ON public.wish_items;
DROP POLICY IF EXISTS family_update_items ON public.wish_items;
DROP POLICY IF EXISTS member_update_items ON public.wish_items;
DROP POLICY IF EXISTS admin_delete_items ON public.wish_items;

CREATE POLICY member_read_items ON public.wish_items
  FOR SELECT TO authenticated USING (
    public.is_member() AND public.can_view_list(wish_list_id)
  );
CREATE POLICY member_insert_items ON public.wish_items
  FOR INSERT TO authenticated WITH CHECK (
    public.is_member() AND public.owns_list(wish_list_id)
  );
CREATE POLICY member_update_items ON public.wish_items
  FOR UPDATE TO authenticated USING (
    public.is_member() AND public.owns_list(wish_list_id)
  ) WITH CHECK (
    public.is_member() AND public.owns_list(wish_list_id)
  );
CREATE POLICY admin_delete_items ON public.wish_items
  FOR DELETE TO authenticated USING (
    public.is_member_admin() AND public.can_view_list(wish_list_id)
  );

COMMIT;
