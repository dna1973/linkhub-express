
-- Create a trigger that automatically increments link clicks count when a new link_click is inserted
CREATE OR REPLACE FUNCTION public.increment_link_clicks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.links
  SET clicks = clicks + 1
  WHERE id = NEW.link_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_link_click_inserted
AFTER INSERT ON public.link_clicks
FOR EACH ROW
EXECUTE FUNCTION public.increment_link_clicks();
