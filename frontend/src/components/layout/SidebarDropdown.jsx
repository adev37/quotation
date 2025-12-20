import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLocation } from "react-router-dom";

function isPathActive(pathname, paths) {
  if (!Array.isArray(paths) || paths.length === 0) return false;
  return paths.some((p) => {
    if (!p) return false;
    if (p === "/") return pathname === "/";
    return pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p);
  });
}

export default function SidebarDropdown({ icon, title, children, paths = [] }) {
  const location = useLocation();

  const active = useMemo(
    () => isPathActive(location.pathname, paths),
    [location.pathname, paths]
  );

  const [open, setOpen] = useState(active);

  useEffect(() => {
    // auto-open when navigating into a section
    if (active) setOpen(true);
  }, [active]);

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className={[
          "w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
          active ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100",
        ].join(" ")}
        aria-expanded={open}
      >
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{title}</span>
        <ChevronDown
          className={`ml-auto h-4 w-4 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? <div className="pl-2 space-y-1">{children}</div> : null}
    </div>
  );
}
