-- Apply to an existing project to let list owners delete their own items.
BEGIN;

DROP POLICY IF EXISTS owner_delete_items ON public.wish_items;
CREATE POLICY owner_delete_items ON public.wish_items
  FOR DELETE TO authenticated USING (
    public.is_member() AND public.owns_list(wish_list_id)
  );

COMMIT;
