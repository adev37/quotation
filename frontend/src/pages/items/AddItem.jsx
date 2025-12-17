import React, { useState } from "react";
import { toast } from "react-toastify";
import { useAddItemMutation } from "../../services/inventoryApi";

const AddItem = () => {
  const [form, setForm] = useState({
    name: "",
    modelNo: "",
    companyName: "",
    minStockAlert: "",
  });

  const [addItem, { isLoading }] = useAddItemMutation();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addItem(form).unwrap();
      toast.success("✅ Item added successfully.");
      setForm({ name: "", modelNo: "", companyName: "", minStockAlert: "" });
    } catch (err) {
      const message =
        err?.data?.message || "❌ Something went wrong. Please try again.";
      toast.error(message);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">🧾 Add New Item</h2>
      <div className="bg-white shadow-md p-6 rounded-lg max-w-3xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* inputs identical to your version */}
          <div>
            <label className="block mb-1 text-sm font-medium">Item Name</label>
            <input name="name" value={form.name} onChange={handleChange} required className="w-full border border-gray-300 rounded px-3 py-2" />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">Model No.</label>
            <input name="modelNo" value={form.modelNo} onChange={handleChange} required className="w-full border border-gray-300 rounded px-3 py-2" />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">Company Name</label>
            <input name="companyName" value={form.companyName} onChange={handleChange} required className="w-full border border-gray-300 rounded px-3 py-2" />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">Min Stock Alert</label>
            <input name="minStockAlert" type="number" value={form.minStockAlert} onChange={handleChange} required className="w-full border border-gray-300 rounded px-3 py-2" />
          </div>

          <div className="col-span-1 md:col-span-2 mt-2">
            <button type="submit" disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-semibold">
              {isLoading ? "Saving..." : "➕ Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddItem;
