import { useNavigate } from "react-router-dom"
import { useProject } from "../context/ProjectContext"
import { useTasks } from "../hooks/useTasks"
import { TasksSidebar } from "../components/TasksSidebar"
import { NewAgentForm } from "../components/NewAgentForm"
import { createTask } from "../lib/api"

export function Dashboard() {
  const navigate = useNavigate()
  const { current } = useProject()
  const { tasks, refetch } = useTasks(current ? { project: current.name } : undefined)

  const handleNewAgent = async (data: { projectId: string; title: string; description?: string }) => {
    try {
      const task = await createTask(data)
      refetch()
      navigate(`/tasks/${task.id}`)
    } catch {
      // TODO: show error toast
    }
  }

  return (
    <div className="flex h-full">
      <TasksSidebar
        tasks={tasks}
        onNewAgent={() => {/* already on new agent screen */}}
      />
      <NewAgentForm onSubmit={handleNewAgent} />
    </div>
  )
}
