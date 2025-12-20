// src/pages/demo/AddDemoItems.jsx
import React, { useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  useGetPendingDemoReturnsQuery,
  useMarkDemoReturnMutation,
} from "../../services/inventoryApi";

/** SAME pagination helper used in Item Master */
const getVisiblePages = (total, current, windowSize = 7) => {
  if (total <= windowSize) {
    return { pages: Array.from({ length: total }, (_, i) => i + 1) };
  }

  const blockStart = Math.floor((current - 1) / windowSize) * windowSize + 1;
  const blockEnd = Math.min(blockStart + windowSize - 1, total);

  const pages = Array.from(
    { length: blockEnd - blockStart + 1 },
    (_, i) => blockStart + i
  );

  return {
    pages,
    showLeftEllipsis: blockStart > 1,
    showRightEllipsis: blockEnd < total,
  };
};

const ITEMS_PER_PAGE = 10;

const AddDemoItems = () => {
  const { data: items = [], isLoading, isError, error } =
    useGetPendingDemoReturnsQuery();

  const [markDemoReturn, { isLoading: isMarking }] = useMarkDemoReturnMutation();

  const [returningId, setReturningId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredItems = useMemo(() => {
    const rows = Array.isArray(items) ? items : [];
    const q = (searchText || "").trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((x) => {
      const name = (x.itemName || "").toLowerCase();
      const model = (x.modelNo || "").toLowerCase();
      const wh = (x.warehouse || "").toLowerCase();
      return name.includes(q) || model.includes(q) || wh.includes(q);
    });
  }, [items, searchText]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE) || 1;
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const start = (safePage - 1) * ITEMS_PER_PAGE;
  const end = safePage * ITEMS_PER_PAGE;
  const pageRows = filteredItems.slice(start, end);

  const markAsReturned = async (id) => {
    setReturningId(id);
    try {
      await markDemoReturn(id).unwrap();
      toast.success("✅ Marked as returned.");
    } catch (err) {
      toast.error(err?.data?.message || "❌ Failed to mark as returned.");
      console.error("Return error:", err);
    } finally {
      setReturningId("");
    }
  };

  const reset = () => {
    setSearchText("");
    setCurrentPage(1);
  };

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Header (Item Master style) */}
        <div className="px-4 py-4 sm:px-6 sm:py-5 bg-gradient-to-r from-indigo-50 via-white to-white border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
                  📦
                </span>
                Pending Demo Returns
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Mark demo items as returned to update stock.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2"
                type="button"
              >
                ↻ Reset
              </button>
            </div>
          </div>

          {/* Filters + Total */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <TextInput
              type="text"
              placeholder="Search item / model / warehouse"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
            />

            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Total</span>
                <span className="font-semibold text-slate-900">
                  {filteredItems.length}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                Showing {pageRows.length} items
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-4 sm:px-6 sm:py-6">
          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-600 text-sm">
              ⏳ Loading…
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700 text-sm">
              Failed to load. {error?.data?.message || ""}
            </div>
          ) : pageRows.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-600 text-sm">
              No pending demo returns.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="bg-slate-50 text-slate-700 font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left whitespace-nowrap">#</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Item</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Model No.</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Warehouse</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Rack</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Qty</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Out Date</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {pageRows.map((item, idx) => {
                    const busy = returningId === item._id || isMarking;
                    return (
                      <tr
                        key={item._id}
                        className="border-t border-slate-200 hover:bg-slate-50"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">{start + idx + 1}</td>
                        <td className="px-4 py-3">{item.itemName || "-"}</td>
                        <td className="px-4 py-3">{item.modelNo || "-"}</td>
                        <td className="px-4 py-3">{item.warehouse || "-"}</td>
                        <td className="px-4 py-3">{item.location || "-"}</td>
                        <td className="px-4 py-3 text-right">{item.quantity ?? 0}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.date
                            ? new Date(item.date).toLocaleDateString("en-GB")
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => markAsReturned(item._id)}
                            disabled={busy}
                            className={[
                              "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-white",
                              busy
                                ? "bg-slate-400 cursor-wait"
                                : "bg-emerald-600 hover:bg-emerald-700",
                            ].join(" ")}
                            type="button"
                          >
                            {busy ? "Returning..." : "Return"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ✅ Pagination SAME as Item Master (sticky bottom) */}
        {filteredItems.length > 0 && totalPages > 1 ? (
          <div className="px-3 sm:px-6 pb-4">
            <div className="sticky bottom-3 z-10 rounded-2xl border border-slate-200 bg-white/90 backdrop-blur shadow-sm px-3 py-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-xs text-slate-600">
                  Page{" "}
                  <span className="font-semibold text-slate-900">{safePage}</span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-900">{totalPages}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 justify-end">
                  <PagerButton
                    disabled={safePage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    label="◀ Prev"
                  />

                  <div className="hidden sm:flex items-center gap-2">
                    {(() => {
                      const { pages, showLeftEllipsis, showRightEllipsis } =
                        getVisiblePages(totalPages, safePage, 7);

                      return (
                        <>
                          {showLeftEllipsis ? (
                            <>
                              <PageButton
                                active={safePage === 1}
                                onClick={() => setCurrentPage(1)}
                                label="1"
                              />
                              <span className="text-slate-400">…</span>
                            </>
                          ) : null}

                          {pages.map((p) => (
                            <PageButton
                              key={p}
                              active={safePage === p}
                              onClick={() => setCurrentPage(p)}
                              label={String(p)}
                            />
                          ))}

                          {showRightEllipsis ? (
                            <>
                              <span className="text-slate-400">…</span>
                              <PageButton
                                active={safePage === totalPages}
                                onClick={() => setCurrentPage(totalPages)}
                                label={String(totalPages)}
                              />
                            </>
                          ) : null}
                        </>
                      );
                    })()}
                  </div>

                  <PagerButton
                    disabled={safePage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    label="Next ▶"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AddDemoItems;

/* ---------- UI helpers (same as Item Master) ---------- */
function TextInput({ className = "", ...props }) {
  return (
    <input
      className={[
        "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm",
        "placeholder:text-slate-400",
        "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

function PagerButton({ disabled, onClick, label }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={[
        "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold",
        disabled
          ? "bg-slate-200 text-slate-500 cursor-not-allowed"
          : "bg-indigo-600 text-white hover:bg-indigo-700",
      ].join(" ")}
      type="button"
    >
      {label}
    </button>
  );
}

function PageButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold border",
        active
          ? "bg-indigo-600 text-white border-indigo-600"
          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
      ].join(" ")}
      type="button"
    >
      {label}
    </button>
  );
}
