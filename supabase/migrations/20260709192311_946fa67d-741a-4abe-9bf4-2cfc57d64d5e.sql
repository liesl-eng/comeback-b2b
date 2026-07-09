-- Restrict pallets & pallet_items SELECT to admins
DROP POLICY IF EXISTS "Authenticated users can view pallets" ON public.pallets;
DROP POLICY IF EXISTS "Authenticated users can view pallet items" ON public.pallet_items;

CREATE POLICY "Admins can view pallets"
  ON public.pallets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view pallet items"
  ON public.pallet_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Tighten EXECUTE on SECURITY DEFINER functions: revoke from public/anon where not needed.
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_approved(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.redeem_access_code(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.last_inventory_refreshed_at() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.verify_access_code(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_access_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.last_inventory_refreshed_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_access_code(text) TO anon, authenticated;
