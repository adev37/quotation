import React, { useMemo } from "react";
import { Menu, UserCircle2 } from "lucide-react";

export default function Topbar({ onOpenSidebar }) {
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  // const name = user?.name || "User";
  const role = user?.role || "Viewer";

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto w-full max-w-[1200px] px-3 sm:px-5 md:px-7 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onOpenSidebar}
            className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 active:bg-slate-100"
            aria-label="Open navigation"
            type="button"
          >
            <Menu className="h-5 w-5 text-slate-700" />
          </button>

          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">
              Inventory System
            </div>
            <div className="text-xs text-slate-500 -mt-0.5 truncate">
              Business Console
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <div className="hidden sm:flex flex-col items-end min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">
              {name}
            </div>
            <div className="text-xs text-slate-500 truncate"> <b>{role}</b> </div>
          </div>

          <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
            <UserCircle2 className="h-5 w-5 text-slate-600" />
          </div>
        </div>
      </div>
    </header>
  );
}
