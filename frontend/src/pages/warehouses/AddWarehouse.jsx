import React, { useMemo, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAddWarehouseMutation } from "../../services/inventoryApi";

const initialForm = { name: "", location: "" };

export default function AddWarehouse() {
  const [form, setForm] = useState(initialForm);
  const [addWarehouse, { isLoading }] = useAddWarehouseMutation();

  const canSubmit = useMemo(() => {
    const n = String(form.name || "").trim();
    const l = String(form.location || "").trim();
    return n.length > 0 && l.length > 0;
  }, [form.name, form.location]);

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || isLoading) return;

    try {
      await addWarehouse({
        name: form.name.trim(),
        location: form.location.trim(),
      }).unwrap();

      toast.success("✅ Warehouse added successfully!");
      setForm(initialForm);
    } catch (err) {
      console.error("❌ Failed to add warehouse:", err);
      toast.error(err?.data?.message || "❌ Something went wrong. Please try again.");
    }
  };

  return (
    <div className="w-full">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="mx-auto w-full max-w-[900px]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-4 py-4 sm:px-6 sm:py-5 bg-gradient-to-r from-indigo-50 via-white to-white border-b border-slate-200">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
                    🏢
                  </span>
                  Add Warehouse
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Create a new warehouse and set its location.
                </p>
              </div>

              <span
                className={[
                  "shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border",
                  canSubmit
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : "bg-slate-50 text-slate-600 border-slate-200",
                ].join(" ")}
              >
                {canSubmit ? "Ready" : "Incomplete"}
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-4 py-4 sm:px-6 sm:py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <Field label="Warehouse Name" hint="Example: Central Depot" required>
                <TextInput
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter warehouse name"
                />
              </Field>

              <Field label="Location" hint="Example: Mumbai, India" required>
                <TextInput
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="Enter location"
                />
              </Field>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => setForm(initialForm)}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                disabled={isLoading}
              >
                Reset
              </button>

              <button
                type="submit"
                disabled={!canSubmit || isLoading}
                className={[
                  "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm",
                  !canSubmit || isLoading
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700",
                ].join(" ")}
              >
                {isLoading ? "Saving..." : "➕ Add Warehouse"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <div className="min-w-0">
      <label className="block text-xs sm:text-sm font-semibold text-slate-800">
        {label} {required ? <span className="text-rose-600">*</span> : null}
      </label>
      {hint ? <p className="text-xs text-slate-500 mt-1">{hint}</p> : null}
      <div className="mt-2">{children}</div>
    </div>
  );
}

function TextInput({ className = "", ...props }) {
  return (
    <input
      className={[
        "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm",
        "placeholder:text-slate-400",
        "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
