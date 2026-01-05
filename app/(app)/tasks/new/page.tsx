"use client";

import { useSearchParams } from "next/navigation";
import { TaskDetailScreen } from "@/components/tasks/task-detail-screen";

export default function NewTaskPage() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const projectId = searchParams.get("projectId");

  return (
    <TaskDetailScreen
      mode="create"
      projectId={projectId}
      returnTo={returnTo}
    />
  );
}
