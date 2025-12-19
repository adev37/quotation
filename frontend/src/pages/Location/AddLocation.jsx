import React, { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAddLocationMutation } from "../../services/inventoryApi";

const AddLocation = () => {
  const [addLocation, { isLoading }] = useAddLocationMutation();

  const [form, setForm] = useState({
    name: "",
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
        description: form.description,
      }).unwrap();

      toast.success("✅ Rack added in ALL warehouses!");
      setForm({ name: "", description: "" });
    } catch (err) {
      toast.error(err?.data?.message || "❌ Failed to add location");
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
                🗂️ Add Rack Location
              </h2>
              <p className="text-sm text-slate-500">
                This rack will be created automatically in{" "}
                <span className="font-semibold text-slate-900">all warehouses</span>.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
              <Field label="Location Name" hint="e.g., Rack No-5">
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="e.g., Rack No-5"
                  required
                />
              </Field>

              <Field label="Description (Optional)" hint="Any extra details">
                <input
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Optional details"
                />
              </Field>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white transition ${
                  isLoading
                    ? "bg-slate-400 cursor-wait"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {isLoading ? "Saving..." : "➕ Add Location"}
              </button>
            </form>

            <p className="mt-3 text-xs text-slate-500">
              Fully responsive: clean on mobile/tablet/desktop.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddLocation;

const Field = ({ label, hint, children }) => (
  <div className="min-w-0">
    <label className="block mb-1 text-xs sm:text-sm font-medium text-slate-700">
      {label}
    </label>
    {children}
    {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
  </div>
);
