-- Fix grants for all habit-related tables

-- habit_slips
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.habit_slips TO authenticated;

-- habit_days
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.habit_days TO authenticated;

-- habit_usage_events (quota habits)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.habit_usage_events TO authenticated;

-- habit_periods (quota habits)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.habit_periods TO authenticated;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
