// src/pages/transfers/StockTransfer.jsx
import { useEffect, useMemo, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  useGetItemsQuery,
  useGetWarehousesQuery,
  useGetLocationsQuery,
  useLazyGetCurrentStockQuery,
  useCreateTransferMutation,
} from "../../services/inventoryApi";

const StockTransfer = () => {
  const { data: itemsResult = [] } = useGetItemsQuery();
  const { data: warehouses = [] } = useGetWarehousesQuery();
  const { data: locations = [] } = useGetLocationsQuery();
  const [triggerGetCurrentStock] = useLazyGetCurrentStockQuery();
  const [createTransfer, { isLoading: saving }] = useCreateTransferMutation();

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
  const [activeSuggestion, setActiveSuggestion] = useState(false);
  const [availableQty, setAvailableQty] = useState(null);

  const [form, setForm] = useState({
    item: "",
    fromWarehouse: "",
    toWarehouse: "",
    fromLocation: "",
    toLocation: "",
    quantity: "",
    reason: "",
  });

  const [prevRackMemory, setPrevRackMemory] = useState({});

  const uniqueLocations = useMemo(() => {
    const seen = new Set();
    return (locations || []).filter((loc) => {
      if (seen.has(loc.name)) return false;
      seen.add(loc.name);
      return true;
    });
  }, [locations]);

  const selectedFromLocName = useMemo(() => {
    if (!form.fromLocation) return "";
    const loc = (locations || []).find((l) => l._id === form.fromLocation);
    return loc?.name || "";
  }, [form.fromLocation, locations]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "fromWarehouse") {
      setPrevRackMemory((prev) => ({
        ...prev,
        [form.fromWarehouse]: form.fromLocation,
      }));
      const restored = prevRackMemory[value] || "";
      setForm((prev) => ({
        ...prev,
        fromWarehouse: value,
        fromLocation: restored,
      }));
      return;
    }

    // if user selects same warehouse on both ends, clear the other side
    if (name === "toWarehouse" && value === form.fromWarehouse) {
      toast.warn("⚠️ Source and destination cannot be the same.");
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemSearch = (value) => {
    setItemSearch(value);
    setActiveSuggestion(true);
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
    setForm((prev) => ({ ...prev, item: s._id }));
    setItemSearch(`${s.name} (${s.modelNo})`);
    setItemSuggestions([]);
    setActiveSuggestion(false);
  };

  // -------- Availability with ID+name match and clamp at 0 --------
  useEffect(() => {
    const fetchAvail = async () => {
      const { item, fromWarehouse, fromLocation } = form;
      if (!item || !fromWarehouse) {
        setAvailableQty(null);
        return;
      }

      try {
        const data = await triggerGetCurrentStock(
          `item=${encodeURIComponent(item)}&warehouse=${encodeURIComponent(
            fromWarehouse
          )}`
        ).unwrap();

        const rows = Array.isArray(data) ? data : [];

        const filtered = fromLocation
          ? rows.filter((r) => {
              const sameId = r.locationId === fromLocation;
              const sameName =
                r.location &&
                selectedFromLocName &&
                r.location.toLowerCase() === selectedFromLocName.toLowerCase();
              return sameId || sameName;
            })
          : rows;

        const total = filtered.reduce(
          (sum, r) => sum + (Number(r.quantity) || 0),
          0
        );

        setAvailableQty(Math.max(total, 0));
      } catch {
        setAvailableQty(null);
        toast.error("⚠️ Couldn't fetch available stock.");
      }
    };

    fetchAvail();
  }, [form.item, form.fromWarehouse, form.fromLocation, triggerGetCurrentStock, selectedFromLocName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { item, fromWarehouse, toWarehouse, quantity, reason } = form;

    if (!item || !fromWarehouse || !toWarehouse || !quantity || !reason) {
      toast.error("⚠️ Please fill all required fields.");
      return;
    }
    if (fromWarehouse === toWarehouse) {
      toast.error("⚠️ Source and destination warehouse cannot be the same.");
      return;
    }

    const qtyNum = Number(quantity);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      toast.error("⚠️ Quantity must be a positive number.");
      return;
    }
    if (availableQty != null && qtyNum > availableQty) {
      toast.error(`❌ Quantity exceeds available stock (${availableQty}).`);
      return;
    }

    try {
      await createTransfer({
        ...form,
        quantity: qtyNum,
        date: new Date(),
        fromLocation: form.fromLocation || null,
        toLocation: form.toLocation || null,
        // also include names to keep legacy rows in sync
        fromLocationName: selectedFromLocName || null,
        toLocationName:
          (form.toLocation &&
            (locations.find((l) => l._id === form.toLocation)?.name || null)) ||
          null,
      }).unwrap();

      toast.success("✅ Transfer completed.");
      setForm({
        item: "",
        fromWarehouse: "",
        toWarehouse: "",
        fromLocation: "",
        toLocation: "",
        quantity: "",
        reason: "",
      });
      setItemSearch("");
      setAvailableQty(null);
    } catch (err) {
      toast.error(err?.data?.message || "Transfer failed.");
    }
  };

  return (
    <div className="p-6">
      <ToastContainer position="top-right" />
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">🔁 Stock Transfer</h2>

      <div className="bg-white shadow-md p-6 rounded-lg max-w-3xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search Item */}
          <div className="relative">
            <label className="block mb-1 font-medium">Search Item</label>
            <input
              type="text"
              value={itemSearch}
              onChange={(e) => handleItemSearch(e.target.value)}
              placeholder="Type to search item"
              className="w-full border px-3 py-2 rounded"
              autoComplete="off"
              required
            />
            {itemSearch && activeSuggestion && itemSuggestions.length > 0 && (
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

          {/* Quantity */}
          <div>
            <label className="block mb-1 font-medium">Quantity</label>
            <input
              type="number"
              name="quantity"
              min="1"
              value={form.quantity}
              onChange={handleChange}
              placeholder={`Qty (Available: ${availableQty ?? "-"})`}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>

          {/* From WH / Rack */}
          <div>
            <label className="block mb-1 font-medium">From Warehouse</label>
            <select
              name="fromWarehouse"
              value={form.fromWarehouse}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
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

          <div>
            <label className="block mb-1 font-medium">From Rack / Location</label>
            <select
              name="fromLocation"
              value={form.fromLocation}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            >
              <option value="">— Optional —</option>
              {uniqueLocations.map((loc) => (
                <option key={loc._id} value={loc._id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* To WH / Rack */}
          <div>
            <label className="block mb-1 font-medium">To Warehouse</label>
            <select
              name="toWarehouse"
              value={form.toWarehouse}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
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

          <div>
            <label className="block mb-1 font-medium">To Rack / Location</label>
            <select
              name="toLocation"
              value={form.toLocation}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            >
              <option value="">— Optional —</option>
              {uniqueLocations.map((loc) => (
                <option key={loc._id} value={loc._id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div className="md:col-span-2">
            <label className="block mb-1 font-medium">Reason</label>
            <input
              type="text"
              name="reason"
              value={form.reason}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              placeholder="Reason for transfer"
              required
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded mt-2 disabled:opacity-70"
            >
              {saving ? "Transferring..." : "Transfer Stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockTransfer;
