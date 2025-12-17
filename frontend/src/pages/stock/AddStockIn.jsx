import React, { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import {
  useGetItemsQuery,
  useGetWarehousesQuery,
  useGetLocationsQuery,
  useCreateStockInMutation,
} from "../../services/inventoryApi";

const AddStockIn = () => {
  // RTK Query data
  const { data: itemsResult = [] } = useGetItemsQuery();
  const { data: allWarehouses = [] } = useGetWarehousesQuery();
  const { data: allLocations = [] } = useGetLocationsQuery();
  const [createStockIn, { isLoading }] = useCreateStockInMutation();

  // Normalize items whether API returns {items: []} or []
  const allItems = Array.isArray(itemsResult)
    ? itemsResult
    : Array.isArray(itemsResult.items)
    ? itemsResult.items
    : [];

  const [items, setItems] = useState([
    { item: "", warehouse: "", quantity: "", location: "" },
  ]);
  const [itemSearch, setItemSearch] = useState([""]);
  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(null);
  const [date, setDate] = useState("");
  const [remarks, setRemarks] = useState("");

  const handleItemChange = (idx, e) => {
    const updated = [...items];
    updated[idx][e.target.name] = e.target.value;
    setItems(updated);
  };

  const handleItemSearch = (idx, value) => {
    const updatedSearch = [...itemSearch];
    updatedSearch[idx] = value;
    setItemSearch(updatedSearch);
    setActiveSuggestionIdx(idx);

    if (value.trim().length > 0) {
      const lower = value.toLowerCase();
      setItemSuggestions(
        allItems.filter(
          (it) =>
            it.name?.toLowerCase().includes(lower) ||
            it.modelNo?.toLowerCase().includes(lower)
        )
      );
      // Clear selected item id when user types
      handleItemChange(idx, { target: { name: "item", value: "" } });
    } else {
      setItemSuggestions([]);
    }
  };

  const handleSelectSuggestion = (idx, suggestion) => {
    handleItemChange(idx, { target: { name: "item", value: suggestion._id } });
    const updatedSearch = [...itemSearch];
    updatedSearch[idx] = `${suggestion.name} (${suggestion.modelNo})`;
    setItemSearch(updatedSearch);
    setItemSuggestions([]);
    setActiveSuggestionIdx(null);
  };

  const addItem = () => {
    setItems([
      ...items,
      { item: "", warehouse: "", quantity: "", location: "" },
    ]);
    setItemSearch([...itemSearch, ""]);
  };

  const removeItem = (i) => {
    if (items.length > 1) {
      setItems(items.filter((_, idx) => idx !== i));
      setItemSearch(itemSearch.filter((_, idx) => idx !== i));
    }
  };

  const getLocationsForWarehouse = (warehouseId) => {
    if (!warehouseId) return [];
    return (allLocations || []).filter((l) => {
      const locWh =
        typeof l.warehouse === "object" ? l.warehouse?._id : l.warehouse;
      return locWh === warehouseId;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanedItems = items.filter(
      (i) => i.item && i.warehouse && i.quantity
    );

    if (cleanedItems.length === 0) {
      toast.error("❌ No valid items to submit.");
      return;
    }

    // prevent duplicates of same item+warehouse+location
    const seen = new Set();
    for (const i of cleanedItems) {
      const key = `${i.item}|${i.warehouse}|${i.location || "null"}`;
      if (seen.has(key)) {
        toast.error("❌ Duplicate item, warehouse & location entries found.");
        return;
      }
      seen.add(key);
    }

    try {
      await createStockIn({ items: cleanedItems, date, remarks }).unwrap();
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
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        📥 Stock In
      </h2>

      <form onSubmit={handleSubmit} className="bg-white shadow-md p-6 rounded-lg">
        {items.map((itm, idx) => (
          <div
            key={idx}
            className="grid [grid-template-columns:2fr_1fr_1fr_0.5fr] gap-4 border-b pb-4 mb-4 relative"
          >
            {/* Item Autocomplete */}
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
              {itemSearch[idx] &&
                activeSuggestionIdx === idx &&
                itemSuggestions.length > 0 && (
                  <ul className="absolute z-10 bg-white border rounded shadow w-full max-h-48 overflow-auto">
                    {itemSuggestions.map((s) => (
                      <li
                        key={s._id}
                        className="px-3 py-2 cursor-pointer hover:bg-blue-100"
                        onClick={() => handleSelectSuggestion(idx, s)}
                      >
                        {s.name} ({s.modelNo})
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
                {(allWarehouses || []).map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block mb-1">Rack Location</label>
              <select
                name="location"
                value={itm.location}
                onChange={(e) => handleItemChange(idx, e)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Select Rack</option>
                {getLocationsForWarehouse(itm.warehouse).map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block mb-1">Qty</label>
              <input
                name="quantity"
                type="number"
                value={itm.quantity}
                onChange={(e) => handleItemChange(idx, e)}
                placeholder="Qty"
                required
                min={1}
                className="w-full border border-gray-300 rounded px-2 py-2 text-center"
              />
            </div>

            {/* Remove */}
            {items.length > 1 && (
              <div className="col-span-full text-right">
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
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
          onClick={addItem}
          className="bg-blue-500 text-white px-3 py-1 rounded mb-4"
        >
          + Add Another Item
        </button>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-1">Date</label>
            <input
              name="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block mb-1">Remarks</label>
            <input
              name="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Remarks"
              className="w-full border border-gray-300 rounded px-3 py-2"
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
