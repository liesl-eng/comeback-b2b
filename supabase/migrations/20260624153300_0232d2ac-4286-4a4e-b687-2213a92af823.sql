
-- 1. Tighten access_codes UPDATE policy to prevent enumeration of unused codes
DROP POLICY IF EXISTS "Users can redeem an unused code" ON public.access_codes;
CREATE POLICY "Users can update own assigned code"
  ON public.access_codes
  FOR UPDATE
  TO authenticated
  USING (
    used_by_user_id = auth.uid()
    OR (
      status = 'unused'
      AND assigned_to_email IS NOT NULL
      AND lower(assigned_to_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
    )
  )
  WITH CHECK (used_by_user_id = auth.uid());

-- 2. Explicit restrictive policy preventing non-admins from writing to user_roles
CREATE POLICY "Only admins may modify roles"
  ON public.user_roles
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. Revoke EXECUTE on SECURITY DEFINER helper functions from public/anon
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_approved(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.last_inventory_refreshed_at() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.redeem_access_code(text) FROM PUBLIC, anon;

-- Grant only what the client app actually needs (authenticated only)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.last_inventory_refreshed_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_access_code(text) TO authenticated;

-- 4. Remove broad public listing on product-images bucket.
-- Public URLs still serve individual files via the storage CDN.
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
