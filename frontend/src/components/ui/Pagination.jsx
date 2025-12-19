import React from "react";
import Button from "./Button";

export default function Pagination({
  page,
  totalPages,
  onPrev,
  onNext,
  metaLeft,
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-slate-200 px-4 py-3">
      <div className="text-xs text-slate-600">{metaLeft}</div>

      <div className="flex items-center justify-end gap-2">
        <Button size="sm" onClick={onPrev} disabled={page <= 1}>
          Prev
        </Button>
        <div className="text-xs text-slate-600">
          Page <span className="font-semibold">{page}</span> /{" "}
          <span className="font-semibold">{totalPages}</span>
        </div>
        <Button size="sm" onClick={onNext} disabled={page >= totalPages}>
          Next
        </Button>
      </div>
    </div>
  );
}
