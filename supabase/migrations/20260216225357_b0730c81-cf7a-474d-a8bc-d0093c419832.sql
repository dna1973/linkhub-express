
-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Anyone can insert link clicks" ON public.link_clicks;

-- Create a stricter INSERT policy that validates the link exists and profile_id matches the link owner
CREATE POLICY "Validated link click inserts only"
ON public.link_clicks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.links
    WHERE links.id = link_id
      AND links.user_id = profile_id
      AND links.is_visible = true
  )
);

-- Do the same for profile_views
DROP POLICY IF EXISTS "Anyone can insert profile views" ON public.profile_views;

CREATE POLICY "Validated profile view inserts only"
ON public.profile_views
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = profile_id
  )
);
