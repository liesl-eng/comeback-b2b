
CREATE OR REPLACE FUNCTION public.admin_list_code_redemptions()
RETURNS TABLE(code text, user_id uuid, email text, redeemed_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.code, r.user_id, u.email::text, r.redeemed_at
  FROM public.access_code_redemptions r
  LEFT JOIN auth.users u ON u.id = r.user_id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY r.redeemed_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_code_redemptions() TO authenticated;
