// src/pages/stock/AddStockOut.jsx
import React, { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  useGetItemsQuery,
  useGetWarehousesQuery,
  useLazyGetRackOptionsQuery,
  useCreateStockOutMutation,
} from "../../services/inventoryApi";

const emptyRow = { item: "", warehouse: "", location: "", quantity: "" };

const AddStockOut = () => {
  const { data: itemsResult = [] } = useGetItemsQuery();
  const { data: allWarehouses = [] } = useGetWarehousesQuery();
  const [createStockOut, { isLoading }] = useCreateStockOutMutation();
  const [triggerRackOptions] = useLazyGetRackOptionsQuery();

  const allItems = Array.isArray(itemsResult)
    ? itemsResult
    : Array.isArray(itemsResult?.items)
    ? itemsResult.items
    : [];

  const [rows, setRows] = useState([emptyRow]);

  // per-row search UI
  const [itemSearch, setItemSearch] = useState([""]);
  const [itemSuggestions, setItemSuggestions] = useState([[]]); // ✅ per row
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(null);

  // rack options per row
  const [rackOptions, setRackOptions] = useState({}); // { [idx]: [{locationId, location, quantity}] }

  const [purpose, setPurpose] = useState("");
  const [reason, setReason] = useState("");
  const [tenderNo, setTenderNo] = useState("");
  const [date, setDate] = useState("");
  const [returnDate, setReturnDate] = useState("");

  const fetchRackOptions = async (index, item, warehouse) => {
    try {
      const data = await triggerRackOptions({ item, warehouse }).unwrap();
      const valid = (data || []).filter((x) => Number(x.quantity) > 0);
      setRackOptions((prev) => ({ ...prev, [index]: valid }));
    } catch (err) {
      console.error("Rack fetch error:", err);
      toast.error(err?.data?.message || "Failed to fetch rack options");
      setRackOptions((prev) => ({ ...prev, [index]: [] }));
    }
  };

  const updateRow = (idx, patch) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const handleWarehouseChange = (idx, warehouseId) => {
    updateRow(idx, { warehouse: warehouseId, location: "" });
    setRackOptions((prev) => ({ ...prev, [idx]: [] }));

    const itemId = rows[idx].item;
    if (itemId && warehouseId) fetchRackOptions(idx, itemId, warehouseId);
  };

  const handleRackChange = (idx, locationId) => {
    updateRow(idx, { location: locationId });
  };

  const handleQtyChange = (idx, qty) => {
    updateRow(idx, { quantity: qty });
  };

  const handleItemSearch = (idx, value) => {
    setActiveSuggestionIdx(idx);

    setItemSearch((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });

    // clear selected item id until chosen
    updateRow(idx, { item: "", location: "" });
    setRackOptions((prev) => ({ ...prev, [idx]: [] }));

    if (!value.trim()) {
      setItemSuggestions((prev) => {
        const next = [...prev];
        next[idx] = [];
        return next;
      });
      return;
    }

    const q = value.toLowerCase();
    const filtered = allItems.filter(
      (i) =>
        i.name?.toLowerCase().includes(q) ||
        i.modelNo?.toLowerCase().includes(q)
    );

    setItemSuggestions((prev) => {
      const next = [...prev];
      next[idx] = filtered;
      return next;
    });
  };

  const handleSelectSuggestion = (idx, suggestion) => {
    // set itemId
    updateRow(idx, { item: suggestion._id, location: "" });

    // set search display
    setItemSearch((prev) => {
      const next = [...prev];
      next[idx] = `${suggestion.name} (${suggestion.modelNo || "—"})`;
      return next;
    });

    // clear suggestions
    setItemSuggestions((prev) => {
      const next = [...prev];
      next[idx] = [];
      return next;
    });
    setActiveSuggestionIdx(null);

    // fetch racks if warehouse already chosen
    const wh = rows[idx].warehouse;
    if (wh) fetchRackOptions(idx, suggestion._id, wh);
  };

  const addRow = () => {
    setRows((prev) => [...prev, emptyRow]);
    setItemSearch((prev) => [...prev, ""]);
    setItemSuggestions((prev) => [...prev, []]);
  };

  const removeRow = (idx) => {
    if (rows.length <= 1) return;

    setRows((prev) => prev.filter((_, i) => i !== idx));
    setItemSearch((prev) => prev.filter((_, i) => i !== idx));
    setItemSuggestions((prev) => prev.filter((_, i) => i !== idx));
    setRackOptions((prev) => {
      const copy = { ...prev };
      delete copy[idx];
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.item) return toast.error(`Row ${i + 1}: Select item`);
      if (!r.warehouse) return toast.error(`Row ${i + 1}: Select warehouse`);
      if (!r.location) return toast.error(`Row ${i + 1}: Select rack/location`);
      if (!r.quantity || Number(r.quantity) <= 0)
        return toast.error(`Row ${i + 1}: Enter valid quantity`);
    }

    try {
      await createStockOut({
        items: rows.map((r) => ({
          item: r.item,
          warehouse: r.warehouse,
          location: r.location, // ✅ locationId
          quantity: Number(r.quantity),
        })),
        purpose,
        reason,
        tenderNo,
        date,
        returnDate: purpose === "Demo" ? returnDate : null,
      }).unwrap();

      toast.success("✅ Stock Out saved");

      setRows([emptyRow]);
      setItemSearch([""]);
      setItemSuggestions([[]]);
      setRackOptions({});
      setPurpose("");
      setReason("");
      setTenderNo("");
      setDate("");
      setReturnDate("");
    } catch (err) {
      toast.error(err?.data?.message || "❌ Stock Out failed");
    }
  };

  return (
    <div className="p-6">
      <ToastContainer position="top-right" autoClose={4000} theme="colored" />
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">📤 Stock Out</h2>

      <form onSubmit={handleSubmit} className="bg-white shadow-md p-6 rounded-lg">
        {rows.map((r, idx) => (
          <div
            key={idx}
            className="grid [grid-template-columns:2fr_1fr_1fr_0.5fr] gap-4 border-b pb-4 mb-4 relative"
          >
            {/* Search Item */}
            <div className="relative min-w-0">
              <label className="block mb-1">Search Item</label>
              <input
                type="text"
                value={itemSearch[idx] || ""}
                onChange={(e) => handleItemSearch(idx, e.target.value)}
                placeholder="Type to search item"
                className="w-full border px-3 py-2 rounded"
                autoComplete="off"
                required
              />

              {activeSuggestionIdx === idx &&
                itemSuggestions[idx]?.length > 0 && (
                  <ul className="absolute z-10 bg-white border rounded shadow w-full max-h-48 overflow-auto">
                    {itemSuggestions[idx].map((s) => (
                      <li
                        key={s._id}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleSelectSuggestion(idx, s)}
                      >
                        {s.name} ({s.modelNo || "—"})
                      </li>
                    ))}
                  </ul>
                )}
            </div>

            {/* Warehouse */}
            <div className="min-w-0">
              <label className="block mb-1">Warehouse</label>
              <select
                value={r.warehouse}
                onChange={(e) => handleWarehouseChange(idx, e.target.value)}
                className="w-full border px-3 py-2 rounded"
                required
              >
                <option value="">Select Warehouse</option>
                {(allWarehouses || []).map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Rack */}
            <div className="min-w-0">
              <label className="block mb-1">Rack Location</label>
              <select
                value={r.location}
                onChange={(e) => handleRackChange(idx, e.target.value)}
                className="w-full border px-3 py-2 rounded"
                required
                disabled={!r.item || !r.warehouse}
              >
                <option value="">
                  {!r.item || !r.warehouse
                    ? "Select Item + Warehouse first"
                    : "Select Rack"}
                </option>

                {(rackOptions[idx] || []).map((loc) => (
                  <option key={loc.locationId} value={loc.locationId}>
                    {loc.location} (Available: {loc.quantity})
                  </option>
                ))}
              </select>
            </div>

            {/* Qty */}
            <div className="min-w-0">
              <label className="block mb-1">Qty</label>
              <input
                type="number"
                min={1}
                value={r.quantity}
                onChange={(e) => handleQtyChange(idx, e.target.value)}
                className="w-full border px-3 py-2 rounded text-center"
                required
              />
            </div>

            {rows.length > 1 && (
              <div className="col-span-full text-right">
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="text-red-500 text-sm"
                >
                  Remove Item
                </button>
              </div>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addRow}
          className="bg-blue-500 text-white px-3 py-1 rounded mb-4"
        >
          + Add Another Item
        </button>

        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block mb-1">Purpose</label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              required
            >
              <option value="">Select Purpose</option>
              <option value="Sale">Sale</option>
              <option value="Demo">Demo</option>
            </select>
          </div>

          <div>
            <label className="block mb-1">Stock Out Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>

          {purpose === "Demo" && (
            <div>
              <label className="block mb-1">Expected Return Date</label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full border px-3 py-2 rounded"
                required
              />
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="block mb-1">Reason</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Tender No.</label>
          <input
            type="text"
            value={tenderNo}
            onChange={(e) => setTenderNo(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded mt-2 disabled:opacity-70"
        >
          {isLoading ? "Saving..." : "Save Stock Out"}
        </button>
      </form>
    </div>
  );
};

export default AddStockOut;
