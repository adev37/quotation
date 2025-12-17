// src/pages/stock/AdjustStock.jsx
import { useEffect, useMemo, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  useGetItemsQuery,
  useGetWarehousesQuery,
  useGetLocationsQuery,
  useLazyGetCurrentStockQuery,
  useCreateAdjustmentMutation,
} from "../../services/inventoryApi";

const AdjustStock = () => {
  const { data: itemsResult = [] } = useGetItemsQuery();
  const { data: warehouses = [] } = useGetWarehousesQuery();
  const { data: locations = [] } = useGetLocationsQuery();
  const [triggerGetCurrentStock] = useLazyGetCurrentStockQuery();
  const [createAdjustment, { isLoading: saving }] = useCreateAdjustmentMutation();

  const items = useMemo(
    () =>
      Array.isArray(itemsResult)
        ? itemsResult
        : Array.isArray(itemsResult?.items)
        ? itemsResult.items
        : [],
    [itemsResult]
  );

  const [itemSearch, setItemSearch] = useState("");
  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [availableQty, setAvailableQty] = useState(null);

  const [form, setForm] = useState({
    item: "",
    warehouse: "",
    location: "",
    quantity: "",
    action: "IN",
    reason: "",
  });

  const selectedLocationName = useMemo(() => {
    if (!form.location) return "";
    const loc = (locations || []).find((l) => l._id === form.location);
    return loc?.name || "";
  }, [form.location, locations]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "item" || name === "warehouse" ? { location: "" } : {}),
    }));
  };

  const handleItemSearch = (value) => {
    setItemSearch(value);
    setForm((prev) => ({ ...prev, item: "" }));
    if (value.trim()) {
      const q = value.toLowerCase();
      setItemSuggestions(
        items.filter(
          (it) =>
            it.name.toLowerCase().includes(q) ||
            it.modelNo.toLowerCase().includes(q)
        )
      );
    } else {
      setItemSuggestions([]);
    }
  };

  const handleSelectSuggestion = (s) => {
    setForm((prev) => ({ ...prev, item: s._id, location: "" }));
    setItemSearch(`${s.name} (${s.modelNo})`);
    setItemSuggestions([]);
  };

  // -------- Availability (ID + name match, and clamp at 0) --------
  useEffect(() => {
    const calc = async () => {
      const { item, warehouse, location } = form;
      if (!item || !warehouse) {
        setAvailableQty(null);
        return;
      }
      try {
        const data = await triggerGetCurrentStock(
          `item=${encodeURIComponent(item)}&warehouse=${encodeURIComponent(
            warehouse
          )}`
        ).unwrap();

        const rows = Array.isArray(data) ? data : [];

        const filtered = location
          ? rows.filter((r) => {
              const sameId = r.locationId === location;
              const sameName =
                r.location &&
                selectedLocationName &&
                r.location.toLowerCase() === selectedLocationName.toLowerCase();
              return sameId || sameName;
            })
          : rows;

        const total = filtered.reduce(
          (sum, r) => sum + (Number(r.quantity) || 0),
          0
        );

        // never let a negative historical row block you
        setAvailableQty(Math.max(total, 0));
      } catch {
        setAvailableQty(null);
        toast.error("⚠️ Couldn't fetch available stock.");
      }
    };
    calc();
  }, [form.item, form.warehouse, form.location, triggerGetCurrentStock, selectedLocationName]);

  const uniqueLocations = useMemo(() => {
    const seen = new Set();
    return (locations || []).filter((loc) => {
      if (seen.has(loc.name)) return false;
      seen.add(loc.name);
      return true;
    });
  }, [locations]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.item || !form.warehouse || !form.quantity || !form.reason) {
      toast.error("❗ Please fill in all required fields.");
      return;
    }

    const qtyNum = Number(form.quantity);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      toast.error("❗ Quantity must be a positive number.");
      return;
    }

    if (form.action === "OUT" && availableQty != null && qtyNum > availableQty) {
      toast.error(`❌ Cannot adjust more than available stock (${availableQty}).`);
      return;
    }

    try {
      await createAdjustment({
        ...form,
        quantity: qtyNum,
        location: form.location || null,
        // send the name as well so the backend aggregates consistently
        locationName: selectedLocationName || null,
      }).unwrap();

      toast.success("✅ Stock adjusted successfully");
      setForm({
        item: "",
        warehouse: "",
        location: "",
        quantity: "",
        action: "IN",
        reason: "",
      });
      setItemSearch("");
      setAvailableQty(null);
    } catch (err) {
      toast.error(err?.data?.message || "❌ Failed to adjust stock.");
    }
  };

  return (
    <div className="p-6">
      <ToastContainer position="top-right" autoClose={3000} />
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">🛠️ Stock Adjustment</h2>

      <div className="bg-white shadow-md p-6 rounded-lg max-w-3xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search Item */}
          <div className="relative">
            <label className="block mb-1 text-sm font-medium">Search Item</label>
            <input
              type="text"
              value={itemSearch}
              onChange={(e) => handleItemSearch(e.target.value)}
              placeholder="Type to search item"
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
              autoComplete="off"
            />
            {itemSuggestions.length > 0 && (
              <ul className="absolute z-10 bg-white border rounded shadow w-full max-h-48 overflow-auto">
                {itemSuggestions.map((s) => (
                  <li
                    key={s._id}
                    className="px-3 py-2 cursor-pointer hover:bg-blue-100"
                    onClick={() => handleSelectSuggestion(s)}
                  >
                    {s.name} ({s.modelNo})
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Warehouse */}
          <div>
            <label className="block mb-1 text-sm font-medium">Select Warehouse</label>
            <select
              name="warehouse"
              value={form.warehouse}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            >
              <option value="">Select Warehouse</option>
              {(warehouses || []).map((w) => (
                <option key={w._id} value={w._id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Location (optional) */}
          <div>
            <label className="block mb-1 text-sm font-medium">Rack / Location (Optional)</label>
            <select
              name="location"
              value={form.location}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">— Select Location —</option>
              {uniqueLocations.map((loc) => (
                <option key={loc._id} value={loc._id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action */}
          <div>
            <label className="block mb-1 text-sm font-medium">Action</label>
            <select
              name="action"
              value={form.action}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="IN">Increase Stock (IN)</option>
              <option value="OUT">Decrease Stock (OUT)</option>
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block mb-1 text-sm font-medium">Quantity</label>
            <input
              type="number"
              name="quantity"
              value={form.quantity}
              onChange={handleChange}
              placeholder={`Qty (Available: ${availableQty ?? "-"})`}
              min="1"
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
          </div>

          {/* Reason */}
          <div className="md:col-span-2">
            <label className="block mb-1 text-sm font-medium">Reason / Remarks</label>
            <input
              type="text"
              name="reason"
              value={form.reason}
              onChange={handleChange}
              placeholder="Reason for adjustment"
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
          </div>

          <div className="col-span-1 md:col-span-2 mt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold transition duration-200 disabled:opacity-70"
            >
              {saving ? "Saving..." : "Adjust Stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdjustStock;
