import React from "react";
import { Menu } from "lucide-react";

export default function Topbar({ onOpenSidebar }) {
  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="mx-auto w-full max-w-[1200px] px-3 sm:px-5 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSidebar}
            className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5 text-slate-700" />
          </button>

          <div className="hidden sm:block">
            <div className="text-sm font-semibold text-slate-900">
              Inventory System
            </div>
            <div className="text-xs text-slate-500 -mt-0.5">
              Professional responsive UI
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500">
          {/* you can show user name here */}
        </div>
      </div>
    </header>
  );
}
