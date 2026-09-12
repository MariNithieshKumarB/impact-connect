REVOKE ALL ON FUNCTION public.validate_application() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_application_created() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_application_status_changed() FROM PUBLIC, anon, authenticated;