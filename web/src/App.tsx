import { Routes, Route, Outlet, useLocation, useNavigate } from "react-router-dom"
import { ProjectProvider } from "./context/ProjectContext"
import { Topbar } from "./components/Topbar"
import { Dashboard } from "./pages/Dashboard"
import { TaskDetail } from "./pages/TaskDetail"
import { MobileRuns } from "./components/mobile/MobileRuns"
import { MobileNewAgent } from "./components/mobile/MobileNewAgent"
import { MobileTaskDetail } from "./components/mobile/MobileTaskDetail"

/* ── Responsive page wrappers ── */

function ResponsiveHome() {
  return (
    <>
      <div className="h-full md:hidden">
        <MobileRuns />
      </div>
      <div className="hidden h-full md:flex">
        <Dashboard />
      </div>
    </>
  )
}

function ResponsiveTask() {
  return (
    <>
      <div className="h-full md:hidden">
        <MobileTaskDetail />
      </div>
      <div className="hidden h-full md:flex">
        <TaskDetail />
      </div>
    </>
  )
}

/* ── Single unified layout with CSS-responsive chrome ── */

const mobileTabItems = [
  {
    id: "runs",
    label: "Runs",
    path: "/",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
      </svg>
    ),
  },
  {
    id: "new",
    label: "New",
    path: "/new",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
] as const

function UnifiedLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const isTaskDetail = location.pathname.startsWith("/tasks/")

  return (
    <div className="flex h-[100dvh] flex-col bg-[#fafafa] md:h-screen">
      {/* Desktop topbar — hidden on mobile */}
      <div className="hidden shrink-0 md:block">
        <Topbar />
      </div>

      {/* Main content — single Outlet */}
      <main className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar — hidden on desktop & task detail pages */}
      {!isTaskDetail && (
        <div className="shrink-0 border-t border-[#e5e5e5] bg-white px-5 pb-5 pt-3 md:hidden">
          <div className="flex items-center justify-around rounded-[36px] border border-[#e5e5e5] bg-[#fafafa] p-1">
            {mobileTabItems.map((tab) => {
              const isActive =
                tab.path === "/"
                  ? location.pathname === "/" || location.pathname === ""
                  : location.pathname.startsWith(tab.path)

              return (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.path)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-[32px] py-2.5 text-[13px] font-medium transition ${
                    isActive ? "bg-[#171717] text-white" : "text-[#737373]"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function App() {
  return (
    <ProjectProvider>
      <Routes>
        <Route element={<UnifiedLayout />}>
          <Route index element={<ResponsiveHome />} />
          <Route path="new" element={<MobileNewAgent />} />
          <Route path="tasks/:id" element={<ResponsiveTask />} />
        </Route>
      </Routes>
    </ProjectProvider>
  )
}
