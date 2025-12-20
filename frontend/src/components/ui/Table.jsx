import React from "react";

export default function Table({ children, className = "" }) {
  return (
    <div
      className={[
        "overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm",
        className,
      ].join(" ")}
    >
      <table className="min-w-full text-sm">{children}</table>
    </div>
  );
}
