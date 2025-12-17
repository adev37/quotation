import React, { useState } from "react";
import { toast } from "react-toastify";
import { useAddWarehouseMutation } from "../../services/inventoryApi";

const AddWarehouse = () => {
  const [form, setForm] = useState({ name: "", location: "" });
  const [addWarehouse, { isLoading }] = useAddWarehouseMutation();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addWarehouse(form).unwrap();
      toast.success("✅ Warehouse added successfully!");
      setForm({ name: "", location: "" });
    } catch (err) {
      console.error("❌ Failed to add warehouse:", err);
      toast.error(err?.data?.message || "❌ Something went wrong. Please try again.");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">🏢 Add Warehouse</h2>

      <div className="bg-white shadow-md p-6 rounded-lg max-w-2xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-sm font-medium">Warehouse Name</label>
            <input
              name="name"
              placeholder="e.g. Central Depot"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-green-300"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Location</label>
            <input
              name="location"
              placeholder="e.g. Mumbai, India"
              value={form.location}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-green-300"
            />
          </div>

          <div className="col-span-1 md:col-span-2 mt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded transition duration-200 disabled:opacity-70"
            >
              {isLoading ? "Saving..." : "➕ Add Warehouse"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddWarehouse;
