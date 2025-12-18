import React, { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  useGetWarehousesQuery,
  useAddLocationMutation,
} from "../../services/inventoryApi";

const AddLocation = () => {
  const { data: warehouses = [] } = useGetWarehousesQuery();
  const [addLocation, { isLoading }] = useAddLocationMutation();

  const [form, setForm] = useState({
    name: "",
    warehouse: "ALL", // ✅ default All
    description: "",
  });

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) return toast.error("Location name is required");

    try {
      await addLocation({
        name: form.name.trim(),
        warehouse: form.warehouse, // ✅ "ALL" or warehouseId
        description: form.description,
      }).unwrap();

      toast.success("✅ Location added!");
      setForm({ name: "", warehouse: "ALL", description: "" });
    } catch (err) {
      toast.error(err?.data?.message || "❌ Failed to add location");
    }
  };

  return (
    <div className="p-6">
      <ToastContainer position="top-right" autoClose={3000} />
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">🗂️ Add Rack Location</h2>

      <form onSubmit={handleSubmit} className="bg-white shadow-md p-6 rounded-lg max-w-3xl">
        <div className="mb-4">
          <label className="block mb-1 font-medium">Location Name</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            placeholder="e.g., Rack No-5"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium">Warehouse</label>
          <select
            name="warehouse"
            value={form.warehouse}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          >
            <option value="ALL">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w._id} value={w._id}>
                {w.name}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-500 mt-1">
            If you choose “All Warehouses”, same rack will be created for every warehouse.
          </p>
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium">Description</label>
          <input
            name="description"
            value={form.description}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            placeholder="Optional details"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded font-semibold disabled:opacity-70"
        >
          {isLoading ? "Saving..." : "➕ Add Location"}
        </button>
      </form>
    </div>
  );
};

export default AddLocation;
