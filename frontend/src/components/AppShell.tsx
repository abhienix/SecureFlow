import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Activity } from "lucide-react";
import { Sidebar, Topbar } from "./Shell";
import { useGlobalSearch } from "../lib/queries";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const search = useGlobalSearch(q);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-200">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar>
          <div className="relative w-full max-w-md">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search scans, commits, branches, actions…"
              className="h-9 w-full rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
            />
            {q.trim().length >= 2 && (
              <div className="absolute left-0 right-0 top-11 z-20 max-h-80 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 shadow-xl">
                {search.isLoading && <p className="px-4 py-3 text-xs text-slate-500">Searching…</p>}
                {search.data && search.data.results.length === 0 && (
                  <p className="px-4 py-3 text-xs text-slate-500">No results for “{q}”.</p>
                )}
                {search.data?.results.map((r, i) => (
                  <button
                    key={`${r.type}-${r.id ?? i}`}
                    onClick={() => {
                      if (r.path) navigate(r.path === "/security-center" ? "/security" : r.path);
                      setQ("");
                    }}
                    className="block w-full border-b border-slate-800/60 px-4 py-3 text-left last:border-0 hover:bg-slate-800/60"
                  >
                    <p className="flex items-center gap-2 text-xs font-medium text-slate-200">
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 uppercase text-[10px] text-slate-400">{r.type}</span>
                      {r.title}
                    </p>
                    {r.subtitle && <p className="mt-1 text-xs text-slate-500">{r.subtitle}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Activity size={16} className="text-slate-500" />
            <span className="hidden text-xs text-slate-500 md:inline">abhienix/SecureFlow</span>
          </div>
        </Topbar>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
