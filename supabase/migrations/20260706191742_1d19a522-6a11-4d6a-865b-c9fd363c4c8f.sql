-- is_approved only reads the caller's own redemption row. RLS on
-- access_code_redemptions ("Users can view their own redemption") already
-- allows this, so SECURITY INVOKER works without leaking other users' data.
CREATE OR REPLACE FUNCTION public.is_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.access_code_redemptions WHERE user_id = _user_id
  );
$function$;