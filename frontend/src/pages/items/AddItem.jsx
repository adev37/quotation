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

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addItem(form).unwrap();
      toast.success("✅ Item added successfully.");
      setForm({ name: "", modelNo: "", companyName: "", minStockAlert: "" });
    } catch (err) {
      toast.error(err?.data?.message || "❌ Something went wrong.");
    }
  };

  return (
    <div className="w-full">
      <div className="p-3 sm:p-4 md:p-6">
        <div className="mx-auto w-full max-w-[900px]">
          <div className="bg-white rounded-2xl border shadow-sm p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
                🧾 Add New Item
              </h2>
              <p className="text-sm text-slate-500">
                Fill item details and save to Item Master.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4"
            >
              <Field label="Item Name">
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </Field>

              <Field label="Model No.">
                <input
                  name="modelNo"
                  value={form.modelNo}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </Field>

              <Field label="Company Name">
                <input
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </Field>

              <Field label="Min Stock Alert">
                <input
                  name="minStockAlert"
                  type="number"
                  value={form.minStockAlert}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </Field>

              <div className="md:col-span-2 pt-1">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white transition ${
                    isLoading
                      ? "bg-slate-400 cursor-wait"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isLoading ? "Saving..." : "➕ Add Item"}
                </button>
              </div>
            </form>

            <p className="mt-3 text-xs text-slate-500">
              Fully responsive: 1-column on mobile, 2-columns on desktop.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddItem;

const Field = ({ label, children }) => (
  <div className="min-w-0">
    <label className="block mb-1 text-xs sm:text-sm font-medium text-slate-700">
      {label}
    </label>
    {children}
  </div>
);
