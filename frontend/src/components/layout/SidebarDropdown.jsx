import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function SidebarDropdown({ icon, title, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
      >
        {icon}
        <span className="truncate">{title}</span>
        <ChevronDown
          className={`ml-auto h-4 w-4 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && <div className="pl-2 space-y-1">{children}</div>}
    </div>
  );
}
