"use client";

import { useParams } from "next/navigation";
import { TaskList } from "@/components/tasks/task-list";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";

export default function TaskDetailRoute() {
  const params = useParams();
  const taskId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : null;

  return (
    <>
      <TaskList />
      {taskId ? <TaskDetailModal taskId={taskId} /> : null}
    </>
  );
}
