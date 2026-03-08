import { Link, Outlet } from "react-router-dom"

export function Layout() {
  return (
    <div className="flex h-screen flex-col bg-neutral-950">
      <header className="flex h-12 shrink-0 items-center border-b border-neutral-800 px-4">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
          <span className="text-tangerine">Tangerine</span>
        </Link>
      </header>

      <main className="min-h-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
