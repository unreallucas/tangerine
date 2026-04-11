import { useState } from "react"
import { useProject } from "../context/ProjectContext"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Check, ChevronDown, ChevronRight } from "lucide-react"

const projectColors = [
  "bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500",
  "bg-cyan-500", "bg-violet-500", "bg-orange-500", "bg-teal-500",
]

function getProjectColor(index: number) {
  return projectColors[index % projectColors.length]
}

interface ProjectSwitcherProps {
  /** "desktop" renders inline chip style, "mobile" renders full-width row style */
  variant?: "desktop" | "mobile"
}

export function ProjectSwitcher({ variant = "desktop" }: ProjectSwitcherProps) {
  const { projects, current, switchProject } = useProject()
  const [open, setOpen] = useState(false)
  const [archivedOpen, setArchivedOpen] = useState(false)
  const currentIndex = current ? projects.indexOf(current) : 0

  const isMobile = variant === "mobile"

  const activeProjects = projects.filter((p) => !p.archived)
  const archivedProjects = projects.filter((p) => p.archived)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* Trigger */}
      <PopoverTrigger
        className={
          isMobile
            ? "flex h-11 w-full items-center justify-between border-b border-border px-4"
            : "flex items-center gap-2 rounded-md bg-muted px-2.5 py-1.5 transition hover:bg-background"
        }
      >
        <div className="flex items-center gap-2">
          {current ? (
            <>
              <div className={`flex items-center justify-center rounded ${getProjectColor(currentIndex)} ${isMobile ? "h-5 w-5" : "h-[18px] w-[18px]"}`}>
                <span className="font-bold text-white text-2xs">
                  {current.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className={`truncate font-medium text-foreground ${isMobile ? "text-sm" : "max-w-[180px] text-md"}`}>
                {current.name}
              </span>
              {current.archived && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-xxs font-medium text-muted-foreground">
                  Archived
                </span>
              )}
            </>
          ) : (
            <span className="text-md text-muted-foreground">No projects</span>
          )}
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </PopoverTrigger>

      {/* Dropdown */}
      {projects.length > 0 && (
        <PopoverContent
          side="bottom"
          align="start"
          className={`gap-0 p-0 ${isMobile ? "w-[calc(100vw-2rem)]" : "w-[220px]"}`}
        >
          {!isMobile && (
            <div className="px-3 py-2">
              <span className="text-xxs font-medium tracking-wider text-muted-foreground">PROJECTS</span>
            </div>
          )}
          <div className="max-h-[300px] overflow-y-auto">
            {activeProjects.map((project) => {
              const i = projects.indexOf(project)
              const isActive = project.name === current?.name
              return (
                <button
                  key={project.name}
                  onClick={() => {
                    switchProject(project.name)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition ${
                    isActive ? "bg-muted" : isMobile ? "active:bg-background" : "hover:bg-background"
                  }`}
                >
                  <div className={`flex shrink-0 items-center justify-center rounded ${getProjectColor(i)} ${isMobile ? "h-5 w-5" : "h-[22px] w-[22px]"}`}>
                    <span className="font-bold text-white text-2xs">
                      {project.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-md font-medium text-foreground">{project.name}</span>
                    <span className="truncate text-xxs text-muted-foreground">{project.repo}</span>
                  </div>
                  {isActive && (
                    <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-foreground" />
                  )}
                </button>
              )
            })}

            {/* Archived section */}
            {archivedProjects.length > 0 && (
              <>
                <button
                  onClick={() => setArchivedOpen((o) => !o)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-background"
                >
                  <ChevronRight
                    className={`h-3 w-3 text-muted-foreground transition-transform ${archivedOpen ? "rotate-90" : ""}`}
                  />
                  <span className="text-xxs font-medium tracking-wider text-muted-foreground">
                    ARCHIVED ({archivedProjects.length})
                  </span>
                </button>
                {archivedOpen && archivedProjects.map((project) => {
                  const i = projects.indexOf(project)
                  const isActive = project.name === current?.name
                  return (
                    <button
                      key={project.name}
                      onClick={() => {
                        switchProject(project.name)
                        setOpen(false)
                      }}
                      className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left opacity-60 transition ${
                        isActive ? "bg-muted" : isMobile ? "active:bg-background" : "hover:bg-background"
                      }`}
                    >
                      <div className={`flex shrink-0 items-center justify-center rounded ${getProjectColor(i)} ${isMobile ? "h-5 w-5" : "h-[22px] w-[22px]"}`}>
                        <span className="font-bold text-white text-2xs">
                          {project.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-md font-medium text-foreground">{project.name}</span>
                        <span className="truncate text-xxs text-muted-foreground">{project.repo}</span>
                      </div>
                      {isActive && (
                        <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-foreground" />
                      )}
                    </button>
                  )
                })}
              </>
            )}
          </div>
        </PopoverContent>
      )}
    </Popover>
  )
}
