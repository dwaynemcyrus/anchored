-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Also ensure service_role can access for debugging
GRANT ALL ON TABLE public.habit_build_events TO service_role;
GRANT ALL ON TABLE public.habit_build_periods TO service_role;
