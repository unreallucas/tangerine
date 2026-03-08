import { Routes, Route } from "react-router-dom"
import { Layout } from "./components/Layout"
import { Dashboard } from "./pages/Dashboard"
import { TaskDetail } from "./pages/TaskDetail"

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="tasks/:id" element={<TaskDetail />} />
      </Route>
    </Routes>
  )
}
