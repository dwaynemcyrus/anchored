"use client";

import { useParams, useSearchParams } from "next/navigation";
import { TaskDetailScreen } from "@/components/tasks/task-detail-screen";

export default function TaskDetailRoute() {
  const params = useParams();
  const searchParams = useSearchParams();
  const taskId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : null;
  const returnTo = searchParams.get("returnTo");
  const projectId = searchParams.get("projectId");

  if (!taskId) {
    return null;
  }

  return (
    <TaskDetailScreen
      mode="edit"
      taskId={taskId}
      projectId={projectId}
      returnTo={returnTo}
    />
  );
}
