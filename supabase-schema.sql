-- Run once in the Supabase SQL editor for a new, empty project.
BEGIN;

CREATE TABLE public.members (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false
);

-- Give every new Auth user a member profile. The first account can manage deletion.
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

CREATE TABLE public.list_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.wish_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.members(id),
  name text NOT NULL,
  is_christmas boolean NOT NULL DEFAULT false,
  folder_id uuid REFERENCES public.list_folders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.wish_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wish_list_id uuid NOT NULL REFERENCES public.wish_lists(id) ON DELETE CASCADE,
  name text NOT NULL,
  link text,
  details text,
  price numeric(10, 2) CHECK (price >= 0),
  starred boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Kept separate so the list owner cannot read purchase status through item queries.
CREATE TABLE public.wish_item_purchases (
  item_id uuid PRIMARY KEY REFERENCES public.wish_items(id) ON DELETE CASCADE,
  is_bought boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_wish_lists_owner ON public.wish_lists(owner_id);
CREATE INDEX idx_wish_items_list_priority ON public.wish_items(wish_list_id, priority);
CREATE INDEX idx_wish_items_list_price ON public.wish_items(wish_list_id, price);

CREATE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER update_list_folders_updated_at BEFORE UPDATE ON public.list_folders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wish_lists_updated_at BEFORE UPDATE ON public.wish_lists
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wish_items_updated_at BEFORE UPDATE ON public.wish_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE FUNCTION public.create_purchase_row()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.wish_item_purchases (item_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER create_purchase_row AFTER INSERT ON public.wish_items
FOR EACH ROW EXECUTE FUNCTION public.create_purchase_row();

-- Prevent moving a list or item to expose its purchase status.
CREATE FUNCTION public.keep_list_owner()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'List owner cannot be changed in the app';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER keep_list_owner BEFORE UPDATE ON public.wish_lists
FOR EACH ROW EXECUTE FUNCTION public.keep_list_owner();

CREATE FUNCTION public.keep_item_list()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.wish_list_id IS DISTINCT FROM OLD.wish_list_id THEN
    RAISE EXCEPTION 'Item list cannot be changed in the app';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER keep_item_list BEFORE UPDATE ON public.wish_items
FOR EACH ROW EXECUTE FUNCTION public.keep_item_list();

CREATE FUNCTION public.is_member()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public.members WHERE id = auth.uid()) $$;

CREATE FUNCTION public.is_member_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public.members WHERE id = auth.uid() AND is_admin) $$;

CREATE FUNCTION public.purchase_visible(p_item_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.wish_items i
    JOIN public.wish_lists l ON l.id = i.wish_list_id
    WHERE i.id = p_item_id AND l.owner_id <> auth.uid()
  )
$$;

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wish_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wish_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wish_item_purchases ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.members, public.list_folders, public.wish_lists,
  public.wish_items, public.wish_item_purchases FROM anon, authenticated, PUBLIC;
GRANT SELECT ON public.members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.list_folders, public.wish_lists,
  public.wish_items TO authenticated;
GRANT SELECT, UPDATE ON public.wish_item_purchases TO authenticated;

CREATE POLICY member_read_members ON public.members
  FOR SELECT TO authenticated USING (public.is_member());

CREATE POLICY member_read_folders ON public.list_folders
  FOR SELECT TO authenticated USING (public.is_member());
CREATE POLICY member_insert_folders ON public.list_folders
  FOR INSERT TO authenticated WITH CHECK (public.is_member());
CREATE POLICY member_update_folders ON public.list_folders
  FOR UPDATE TO authenticated USING (public.is_member())
  WITH CHECK (public.is_member());
CREATE POLICY admin_delete_folders ON public.list_folders
  FOR DELETE TO authenticated USING (public.is_member_admin());

CREATE POLICY member_read_lists ON public.wish_lists
  FOR SELECT TO authenticated USING (public.is_member());
CREATE POLICY member_insert_own_lists ON public.wish_lists
  FOR INSERT TO authenticated WITH CHECK (
    public.is_member() AND owner_id = auth.uid()
  );
CREATE POLICY member_update_lists ON public.wish_lists
  FOR UPDATE TO authenticated USING (public.is_member())
  WITH CHECK (public.is_member());
CREATE POLICY admin_delete_lists ON public.wish_lists
  FOR DELETE TO authenticated USING (public.is_member_admin());

CREATE POLICY member_read_items ON public.wish_items
  FOR SELECT TO authenticated USING (public.is_member());
CREATE POLICY member_insert_items ON public.wish_items
  FOR INSERT TO authenticated WITH CHECK (public.is_member());
CREATE POLICY member_update_items ON public.wish_items
  FOR UPDATE TO authenticated USING (public.is_member())
  WITH CHECK (public.is_member());
CREATE POLICY admin_delete_items ON public.wish_items
  FOR DELETE TO authenticated USING (public.is_member_admin());

CREATE POLICY other_members_read_purchases ON public.wish_item_purchases
  FOR SELECT TO authenticated USING (
    public.is_member() AND public.purchase_visible(item_id)
  );
CREATE POLICY other_members_update_purchases ON public.wish_item_purchases
  FOR UPDATE TO authenticated USING (
    public.is_member() AND public.purchase_visible(item_id)
  ) WITH CHECK (
    public.is_member() AND public.purchase_visible(item_id)
  );
COMMIT;
