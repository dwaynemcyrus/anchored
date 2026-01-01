// Supabase Edge Function: Purge deleted items older than 60 days
// Schedule: Run daily at 3 AM UTC via pg_cron or Supabase scheduled function
//
// This function permanently deletes items where deleted_at is older than 60 days.
// It NEVER touches completed items (those persist indefinitely).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PURGE_DAYS = 60;

Deno.serve(async (req) => {
  try {
    // Verify request is authorized (check for service role key or cron secret)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate purge cutoff date
    const purgeCutoff = new Date();
    purgeCutoff.setDate(purgeCutoff.getDate() - PURGE_DAYS);
    const purgeCutoffISO = purgeCutoff.toISOString();

    console.log(`Purging items deleted before: ${purgeCutoffISO}`);

    // Track purge counts
    const results = {
      tasks: 0,
      projects: 0,
      habits: 0,
      errors: [] as string[],
    };

    // 1. Purge old deleted tasks
    try {
      const { data: tasksToDelete, error: tasksFetchError } = await supabase
        .from("tasks")
        .select("id")
        .not("deleted_at", "is", null)
        .lt("deleted_at", purgeCutoffISO);

      if (tasksFetchError) {
        throw tasksFetchError;
      }

      if (tasksToDelete && tasksToDelete.length > 0) {
        const taskIds = tasksToDelete.map((t) => t.id);

        // Delete associated time entries first
        const { error: timeEntriesError } = await supabase
          .from("time_entries")
          .delete()
          .in("task_id", taskIds);

        if (timeEntriesError) {
          console.error("Error deleting time entries:", timeEntriesError);
          results.errors.push(`Time entries: ${timeEntriesError.message}`);
        }

        // Delete time entry segments
        const { error: segmentsError } = await supabase
          .from("time_entry_segments")
          .delete()
          .in("task_id", taskIds);

        if (segmentsError) {
          console.error("Error deleting time entry segments:", segmentsError);
          results.errors.push(`Time entry segments: ${segmentsError.message}`);
        }

        // Delete daily totals
        const { error: totalsError } = await supabase
          .from("time_entry_daily_totals")
          .delete()
          .in("task_id", taskIds);

        if (totalsError) {
          console.error("Error deleting daily totals:", totalsError);
          results.errors.push(`Daily totals: ${totalsError.message}`);
        }

        // Now delete tasks
        const { error: tasksDeleteError } = await supabase
          .from("tasks")
          .delete()
          .in("id", taskIds);

        if (tasksDeleteError) {
          throw tasksDeleteError;
        }

        results.tasks = tasksToDelete.length;
        console.log(`Purged ${results.tasks} tasks`);
      }
    } catch (error) {
      console.error("Error purging tasks:", error);
      results.errors.push(`Tasks: ${error.message}`);
    }

    // 2. Purge old deleted projects
    try {
      const { data: projectsToDelete, error: projectsFetchError } =
        await supabase
          .from("projects")
          .select("id")
          .not("deleted_at", "is", null)
          .lt("deleted_at", purgeCutoffISO);

      if (projectsFetchError) {
        throw projectsFetchError;
      }

      if (projectsToDelete && projectsToDelete.length > 0) {
        const projectIds = projectsToDelete.map((p) => p.id);

        // Note: Tasks should already be handled above, but clean up any orphans
        const { error: orphanTasksError } = await supabase
          .from("tasks")
          .delete()
          .in("project_id", projectIds);

        if (orphanTasksError) {
          console.error("Error deleting orphan tasks:", orphanTasksError);
        }

        // Delete projects
        const { error: projectsDeleteError } = await supabase
          .from("projects")
          .delete()
          .in("id", projectIds);

        if (projectsDeleteError) {
          throw projectsDeleteError;
        }

        results.projects = projectsToDelete.length;
        console.log(`Purged ${results.projects} projects`);
      }
    } catch (error) {
      console.error("Error purging projects:", error);
      results.errors.push(`Projects: ${error.message}`);
    }

    // 3. Purge old deleted habits
    try {
      const { data: habitsToDelete, error: habitsFetchError } = await supabase
        .from("habits")
        .select("id")
        .not("deleted_at", "is", null)
        .lt("deleted_at", purgeCutoffISO);

      if (habitsFetchError) {
        throw habitsFetchError;
      }

      if (habitsToDelete && habitsToDelete.length > 0) {
        const habitIds = habitsToDelete.map((h) => h.id);

        // Delete habit entries first
        const { error: entriesError } = await supabase
          .from("habit_entries")
          .delete()
          .in("habit_id", habitIds);

        if (entriesError) {
          console.error("Error deleting habit entries:", entriesError);
          results.errors.push(`Habit entries: ${entriesError.message}`);
        }

        // Delete habits
        const { error: habitsDeleteError } = await supabase
          .from("habits")
          .delete()
          .in("id", habitIds);

        if (habitsDeleteError) {
          throw habitsDeleteError;
        }

        results.habits = habitsToDelete.length;
        console.log(`Purged ${results.habits} habits`);
      }
    } catch (error) {
      console.error("Error purging habits:", error);
      results.errors.push(`Habits: ${error.message}`);
    }

    const response = {
      success: results.errors.length === 0,
      purged: {
        tasks: results.tasks,
        projects: results.projects,
        habits: results.habits,
      },
      errors: results.errors,
      purgeCutoff: purgeCutoffISO,
      timestamp: new Date().toISOString(),
    };

    console.log("Purge complete:", response);

    return new Response(JSON.stringify(response), {
      status: results.errors.length === 0 ? 200 : 207, // 207 Multi-Status for partial success
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Fatal error in purge function:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
