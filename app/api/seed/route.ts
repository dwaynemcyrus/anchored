import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();

  // Get the authenticated user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in first." },
      { status: 401 }
    );
  }

  const results: string[] = [];

  try {
    // 1. Create a test project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        owner_id: user.id,
        title: "Anchored MVP",
        outcome: "Ship the first release",
        purpose: "Validate the core productivity flow",
        description: "Build the personal productivity OS",
        status: "backlog",
      })
      .select()
      .single();

    if (projectError) {
      throw new Error(`Failed to create project: ${projectError.message}`);
    }

    results.push(`Created project: ${project.title} (${project.id})`);

    // 2. Create two test tasks in that project
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .insert([
        {
          owner_id: user.id,
          project_id: project.id,
          title: "Set up Supabase project",
          notes: "Configure database, auth, and RLS policies",
          task_location: "project",
          status: "done",
        },
        {
          owner_id: user.id,
          project_id: project.id,
          title: "Build task management UI",
          notes: "Create task list, forms, and status changes",
          task_location: "project",
          status: "active",
        },
      ])
      .select();

    if (tasksError) {
      throw new Error(`Failed to create tasks: ${tasksError.message}`);
    }

    results.push(`Created ${tasks.length} tasks`);

    // 3. Verify RLS is working - count should only show user's own data
    const { count: projectCount } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true });

    const { count: taskCount } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true });

    results.push(`RLS check - Projects visible: ${projectCount}, Tasks visible: ${taskCount}`);

    return NextResponse.json({
      success: true,
      message: "Seed data created successfully",
      results,
      data: {
        project,
        tasks,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        results,
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in first." },
      { status: 401 }
    );
  }

  try {
    // Delete all user's tasks first (due to foreign key)
    const { error: tasksError } = await supabase
      .from("tasks")
      .delete()
      .eq("owner_id", user.id);

    if (tasksError) {
      throw new Error(`Failed to delete tasks: ${tasksError.message}`);
    }

    // Delete all user's projects
    const { error: projectsError } = await supabase
      .from("projects")
      .delete()
      .eq("owner_id", user.id);

    if (projectsError) {
      throw new Error(`Failed to delete projects: ${projectsError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: "All seed data deleted",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
