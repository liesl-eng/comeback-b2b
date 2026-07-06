-- 1) Restrict products SELECT to admins only.
--    The public catalog is sourced from Google Sheets, not this table.
--    Sensitive columns (cost, pricing_rule, floorfound_price) must not be
--    exposed to the public role.
DROP POLICY IF EXISTS "Public can view products" ON public.products;

CREATE POLICY "Admins can view products"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Drop broad grant to anon (public role includes anon); keep authenticated for
-- admin operations, RLS still enforces admin-only access.
REVOKE SELECT ON public.products FROM anon;

-- 2) Change public.has_role from SECURITY DEFINER to SECURITY INVOKER so it
--    is no longer flagged as a definer function executable through the API.
--    RLS on public.user_roles ("Users can view their own roles") still allows
--    the caller to look up their own role, which is the only usage pattern
--    (all callers pass auth.uid() as _user_id).
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;