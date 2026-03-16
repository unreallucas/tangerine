import { Routes, Route } from "react-router-dom"
import { Layout } from "./components/Layout"
import { Dashboard } from "./pages/Dashboard"
import { TaskDetail } from "./pages/TaskDetail"
import { ProjectProvider } from "./context/ProjectContext"
import { useMobile } from "./hooks/useMobile"
import { MobileLayout } from "./components/mobile/MobileLayout"
import { MobileRuns } from "./components/mobile/MobileRuns"
import { MobileNewAgent } from "./components/mobile/MobileNewAgent"
import { MobileTaskDetail } from "./components/mobile/MobileTaskDetail"

export function App() {
  const isMobile = useMobile()

  return (
    <ProjectProvider>
      {isMobile ? (
        <Routes>
          <Route element={<MobileLayout />}>
            <Route index element={<MobileRuns />} />
            <Route path="new" element={<MobileNewAgent />} />
          </Route>
          <Route path="tasks/:id" element={<MobileTaskDetail />} />
        </Routes>
      ) : (
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="tasks/:id" element={<TaskDetail />} />
          </Route>
        </Routes>
      )}
    </ProjectProvider>
  )
}
