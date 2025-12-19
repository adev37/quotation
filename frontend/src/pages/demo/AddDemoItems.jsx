import React, { useState } from "react";
import { toast } from "react-toastify";
import {
  useGetPendingDemoReturnsQuery,
  useMarkDemoReturnMutation,
} from "../../services/inventoryApi";

const AddDemoItems = () => {
  const { data: items = [], isLoading, isError, error } =
    useGetPendingDemoReturnsQuery();

  const [markDemoReturn, { isLoading: isMarking }] =
    useMarkDemoReturnMutation();

  const [returningId, setReturningId] = useState("");

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

  return (
    <div className="w-full">
      <div className="p-3 sm:p-4 md:p-6">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="bg-white rounded-2xl border shadow-sm p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                  📦 Pending Demo Returns
                </h2>
                <p className="text-sm text-slate-500">
                  Mark demo items as returned to update stock.
                </p>
              </div>

              <div className="text-sm text-slate-600">
                Total:{" "}
                <span className="font-semibold text-slate-900">
                  {Array.isArray(items) ? items.length : 0}
                </span>
              </div>
            </div>

            <div className="mt-4">
              {isLoading ? (
                <div className="text-blue-600 text-sm">⏳ Loading…</div>
              ) : isError ? (
                <div className="text-red-600 text-sm">
                  Failed to load. {error?.data?.message || ""}
                </div>
              ) : items.length === 0 ? (
                <div className="text-slate-500 text-sm">
                  No pending demo returns.
                </div>
              ) : (
                <div className="w-full overflow-x-auto rounded-xl border">
                  <table className="min-w-[900px] w-full text-sm">
                    <thead className="bg-slate-50 text-slate-700 font-semibold">
                      <tr>
                        <th className="p-3 text-left whitespace-nowrap">Sl#</th>
                        <th className="p-3 text-left whitespace-nowrap">Item</th>
                        <th className="p-3 text-left whitespace-nowrap">Model No.</th>
                        <th className="p-3 text-left whitespace-nowrap">Warehouse</th>
                        <th className="p-3 text-left whitespace-nowrap">Rack</th>
                        <th className="p-3 text-right whitespace-nowrap">Qty</th>
                        <th className="p-3 text-left whitespace-nowrap">Out Date</th>
                        <th className="p-3 text-center whitespace-nowrap">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {items.map((item, idx) => {
                        const busy = returningId === item._id || isMarking;
                        return (
                          <tr key={item._id} className="border-t hover:bg-slate-50">
                            <td className="p-3">{idx + 1}</td>
                            <td className="p-3">{item.itemName || "-"}</td>
                            <td className="p-3">{item.modelNo || "-"}</td>
                            <td className="p-3">{item.warehouse || "-"}</td>
                            <td className="p-3">{item.location || "-"}</td>
                            <td className="p-3 text-right">{item.quantity ?? 0}</td>
                            <td className="p-3">
                              {item.date ? new Date(item.date).toLocaleDateString() : "-"}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => markAsReturned(item._id)}
                                disabled={busy}
                                className={`px-3 py-1.5 rounded-lg text-white text-sm font-medium transition ${
                                  busy
                                    ? "bg-slate-400 cursor-wait"
                                    : "bg-emerald-600 hover:bg-emerald-700"
                                }`}
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

            <p className="mt-3 text-xs text-slate-500">
              Tip: On mobile, swipe the table left/right if columns don’t fit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddDemoItems;
