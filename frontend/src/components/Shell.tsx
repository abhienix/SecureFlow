import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  GitBranch,
  ShieldAlert,
  Database,
  Rocket,
  ScrollText,
  Sparkles,
  Settings,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useAppStore } from "../lib/store";

const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/pipelines", label: "Pipelines", icon: GitBranch },
  { to: "/security", label: "Security", icon: ShieldAlert },
  { to: "/repositories", label: "Repositories", icon: Database },
  { to: "/deployments", label: "Deployments", icon: Rocket },
  { to: "/policies", label: "Policy", icon: ScrollText },
  { to: "/copilot", label: "Copilot", icon: Sparkles },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const connected = useAppStore((s) => s.wsConnected);

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-950/60">
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
          <ShieldAlert size={18} />
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight text-slate-50">SecureFlow</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">DevSecOps Gateway</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-500/15 text-indigo-300"
                  : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              connected ? "bg-emerald-400" : "bg-rose-500"
            )}
          />
          <span className="text-xs text-slate-400">
            {connected ? "Live — connected" : "Realtime disconnected"}
          </span>
        </div>
      </div>
    </aside>
  );
}

export function Topbar({ children }: { children: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/70 px-6 backdrop-blur">
      {children}
    </header>
  );
}
