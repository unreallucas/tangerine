import type { Task } from "@tangerine/shared"
import { TaskCard } from "./TaskCard"

interface TaskListProps {
  tasks: Task[]
}

export function TaskList({ tasks }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="py-12 text-center text-neutral-500">
        No tasks found.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  )
}
