
-- 1. Redemptions table (many users per code)
CREATE TABLE public.access_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

GRANT SELECT, INSERT ON public.access_code_redemptions TO authenticated;
GRANT ALL ON public.access_code_redemptions TO service_role;

ALTER TABLE public.access_code_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own redemption"
  ON public.access_code_redemptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all redemptions"
  ON public.access_code_redemptions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Inserts only happen via the SECURITY DEFINER redeem function; no direct insert policy needed.

-- 2. Backfill existing redemptions from access_codes.used_by_user_id
INSERT INTO public.access_code_redemptions (code, user_id, redeemed_at)
SELECT upper(code), used_by_user_id, COALESCE(used_at, now())
FROM public.access_codes
WHERE used_by_user_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- 3. is_approved now checks redemptions table
CREATE OR REPLACE FUNCTION public.is_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.access_code_redemptions WHERE user_id = _user_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_approved(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_approved(uuid) TO authenticated, service_role;

-- 4. redeem_access_code: code is reusable, just records a redemption
CREATE OR REPLACE FUNCTION public.redeem_access_code(_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_exists boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.access_codes WHERE upper(code) = upper(_code)
  ) INTO v_exists;

  IF NOT v_exists THEN
    RETURN false;
  END IF;

  INSERT INTO public.access_code_redemptions (code, user_id)
  VALUES (upper(_code), v_uid)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_access_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_access_code(text) TO authenticated, service_role;

-- 5. New public verifier so visitors can unlock pricing before signing up
CREATE OR REPLACE FUNCTION public.verify_access_code(_code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.access_codes WHERE upper(code) = upper(_code)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.verify_access_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_access_code(text) TO anon, authenticated, service_role;
