import React from "react";
import { cn } from "../../lib/cn";

export default function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
