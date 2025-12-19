import React, { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAddWarehouseMutation } from "../../services/inventoryApi";

const AddWarehouse = () => {
  const [form, setForm] = useState({ name: "", location: "" });
  const [addWarehouse, { isLoading }] = useAddWarehouseMutation();

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

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
    <div className="w-full">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="p-3 sm:p-4 md:p-6">
        <div className="mx-auto w-full max-w-[900px]">
          <div className="bg-white rounded-2xl border shadow-sm p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
                🏢 Add Warehouse
              </h2>
              <p className="text-sm text-slate-500">
                Add a new warehouse and its location. Fully responsive layout.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <Field label="Warehouse Name" hint="e.g. Central Depot">
                <input
                  name="name"
                  placeholder="e.g. Central Depot"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </Field>

              <Field label="Location" hint="e.g. Mumbai, India">
                <input
                  name="location"
                  placeholder="e.g. Mumbai, India"
                  value={form.location}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </Field>

              <div className="md:col-span-2 pt-1">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white transition ${
                    isLoading
                      ? "bg-slate-400 cursor-wait"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {isLoading ? "Saving..." : "➕ Add Warehouse"}
                </button>
              </div>
            </form>

            <p className="mt-3 text-xs text-slate-500">
              Tip: On mobile this becomes a 1-column form automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddWarehouse;

const Field = ({ label, hint, children }) => (
  <div className="min-w-0">
    <label className="block mb-1 text-xs sm:text-sm font-medium text-slate-700">
      {label}
    </label>
    {children}
    {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
  </div>
);
