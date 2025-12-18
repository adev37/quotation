import React, { useMemo, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  useGetItemsQuery,
  useGetWarehousesQuery,
  useGetLocationsQuery,
  useCreateStockInMutation,
} from "../../services/inventoryApi";

const AddStockIn = () => {
  const { data: itemsResult = [] } = useGetItemsQuery();
  const { data: allWarehouses = [] } = useGetWarehousesQuery();
  const { data: locationsResult = [] } = useGetLocationsQuery(); // ✅ gets all locations
  const [createStockIn, { isLoading }] = useCreateStockInMutation();

  const allItems = useMemo(() => {
    return Array.isArray(itemsResult)
      ? itemsResult
      : Array.isArray(itemsResult?.items)
      ? itemsResult.items
      : [];
  }, [itemsResult]);

  // ✅ main fix: normalize locations safely
  const allLocations = useMemo(() => {
    return Array.isArray(locationsResult)
      ? locationsResult
      : Array.isArray(locationsResult?.locations)
      ? locationsResult.locations
      : Array.isArray(locationsResult?.data)
      ? locationsResult.data
      : [];
  }, [locationsResult]);

  const [items, setItems] = useState([{ item: "", warehouse: "", quantity: "", location: "" }]);
  const [itemSearch, setItemSearch] = useState([""]);
  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(null);
  const [date, setDate] = useState("");
  const [remarks, setRemarks] = useState("");

  const handleItemChange = (idx, e) => {
    const updated = [...items];
    updated[idx][e.target.name] = e.target.value;

    // ✅ when warehouse changes -> reset rack
    if (e.target.name === "warehouse") updated[idx].location = "";

    setItems(updated);
  };

  const handleItemSearch = (idx, value) => {
    const updatedSearch = [...itemSearch];
    updatedSearch[idx] = value;
    setItemSearch(updatedSearch);
    setActiveSuggestionIdx(idx);

    if (!value.trim()) {
      setItemSuggestions([]);
      return;
    }

    const q = value.toLowerCase();
    setItemSuggestions(
      allItems.filter(
        (it) =>
          it.name?.toLowerCase().includes(q) ||
          it.modelNo?.toLowerCase().includes(q)
      )
    );

    // clear selected id while typing
    handleItemChange(idx, { target: { name: "item", value: "" } });
  };

  const handleSelectSuggestion = (idx, s) => {
    handleItemChange(idx, { target: { name: "item", value: s._id } });
    const updatedSearch = [...itemSearch];
    updatedSearch[idx] = `${s.name} (${s.modelNo || "-"})`;
    setItemSearch(updatedSearch);
    setItemSuggestions([]);
    setActiveSuggestionIdx(null);
  };

  const addItem = () => {
    setItems((prev) => [...prev, { item: "", warehouse: "", quantity: "", location: "" }]);
    setItemSearch((prev) => [...prev, ""]);
  };

  const removeItem = (i) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== i));
    setItemSearch((prev) => prev.filter((_, idx) => idx !== i));
  };

  // ✅ works for: location.warehouse = ObjectId OR populated object
  const getLocationsForWarehouse = (warehouseId) => {
    if (!warehouseId) return [];
    return allLocations.filter((l) => {
      const raw = l?.warehouse ?? l?.warehouseId;
      const locWh = typeof raw === "object" && raw !== null ? raw?._id : raw;
      return String(locWh) === String(warehouseId);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanedItems = items.filter((i) => i.item && i.warehouse && i.quantity);
    if (cleanedItems.length === 0) return toast.error("❌ No valid items to submit.");

    // prevent duplicates item+warehouse+location
    const seen = new Set();
    for (const i of cleanedItems) {
      const key = `${i.item}|${i.warehouse}|${i.location || "null"}`;
      if (seen.has(key)) return toast.error("❌ Duplicate item, warehouse & location entries found.");
      seen.add(key);
    }

    try {
      await createStockIn({
        items: cleanedItems.map((x) => ({
          item: x.item,
          warehouse: x.warehouse,
          location: x.location || null,
          quantity: Number(x.quantity),
        })),
        date,
        remarks,
      }).unwrap();

      toast.success("✅ Stock In recorded!");
      setItems([{ item: "", warehouse: "", quantity: "", location: "" }]);
      setItemSearch([""]);
      setDate("");
      setRemarks("");
    } catch (err) {
      toast.error(err?.data?.message || "❌ Failed to record stock in.");
    }
  };

  return (
    <div className="p-6">
      <ToastContainer position="top-right" autoClose={3000} />
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">📥 Stock In</h2>

      <form onSubmit={handleSubmit} className="bg-white shadow-md p-6 rounded-lg">
        {items.map((itm, idx) => {
          const racks = getLocationsForWarehouse(itm.warehouse);

          return (
            <div
              key={idx}
              className="grid [grid-template-columns:2fr_1fr_1fr_0.5fr] gap-4 border-b pb-4 mb-4 relative"
            >
              {/* Item Search */}
              <div className="relative">
                <label className="block mb-1">Search Item</label>
                <input
                  type="text"
                  value={itemSearch[idx] || ""}
                  onChange={(e) => handleItemSearch(idx, e.target.value)}
                  placeholder="Type to search item"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                  autoComplete="off"
                />
                {activeSuggestionIdx === idx && itemSuggestions.length > 0 && (
                  <ul className="absolute z-10 bg-white border rounded shadow w-full max-h-48 overflow-auto">
                    {itemSuggestions.map((s) => (
                      <li
                        key={s._id}
                        className="px-3 py-2 cursor-pointer hover:bg-blue-100"
                        onClick={() => handleSelectSuggestion(idx, s)}
                      >
                        {s.name} ({s.modelNo || "-"})
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Warehouse */}
              <div>
                <label className="block mb-1">Warehouse</label>
                <select
                  name="warehouse"
                  value={itm.warehouse}
                  onChange={(e) => handleItemChange(idx, e)}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="">Select Warehouse</option>
                  {allWarehouses.map((w) => (
                    <option key={w._id} value={w._id}>{w.name}</option>
                  ))}
                </select>
              </div>

              {/* Rack */}
              <div>
                <label className="block mb-1">Rack Location</label>
                <select
                  name="location"
                  value={itm.location}
                  onChange={(e) => handleItemChange(idx, e)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  disabled={!itm.warehouse}
                >
                  <option value="">
                    {!itm.warehouse ? "Select Warehouse first" : "Select Rack"}
                  </option>

                  {itm.warehouse && racks.length === 0 && (
                    <option value="" disabled>No racks found for this warehouse</option>
                  )}

                  {racks.map((l) => (
                    <option key={l._id} value={l._id}>{l.name}</option>
                  ))}
                </select>
              </div>

              {/* Qty */}
              <div>
                <label className="block mb-1">Qty</label>
                <input
                  name="quantity"
                  type="number"
                  min={1}
                  value={itm.quantity}
                  onChange={(e) => handleItemChange(idx, e)}
                  className="w-full border border-gray-300 rounded px-2 py-2 text-center"
                  required
                />
              </div>

              {items.length > 1 && (
                <div className="col-span-full text-right">
                  <button type="button" onClick={() => removeItem(idx)} className="text-red-500 text-sm">
                    Remove Item
                  </button>
                </div>
              )}
            </div>
          );
        })}

        <button type="button" onClick={addItem} className="bg-blue-500 text-white px-3 py-1 rounded mb-4">
          + Add Another Item
        </button>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block mb-1">Remarks</label>
            <input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Remarks"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold ${
            isLoading ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          {isLoading ? "Saving..." : "💾 Save Stock In"}
        </button>
      </form>
    </div>
  );
};

export default AddStockIn;
