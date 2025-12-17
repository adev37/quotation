// src/pages/Location/AddLocation.jsx
import React, { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAddLocationMutation } from "../../services/inventoryApi";

const AddLocation = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [addLocation, { isLoading }] = useAddLocationMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("❌ Location name is required.");
      return;
    }
    try {
      await addLocation({ name, description }).unwrap();
      toast.success("✅ Location added to all warehouses!");
      setName("");
      setDescription("");
    } catch (err) {
      const msg = err?.data?.message || "❌ Failed to add location.";
      toast.error(msg);
    }
  };

  return (
    <div className="p-6">
      <ToastContainer position="top-right" autoClose={3000} />
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">🗂️ Add Rack Location</h2>

      <div className="bg-white shadow-md p-6 rounded-lg max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Location Name */}
          <div>
            <label className="block mb-1 text-sm font-medium">Location Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Rack No-5"
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          {/* Warehouse Info Display */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Rack will be added to all warehouses
            </label>
            <select
              disabled
              className="w-full border border-gray-200 bg-gray-100 rounded px-3 py-2 cursor-not-allowed"
            >
              <option>All Warehouses</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block mb-1 text-sm font-medium">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded font-semibold transition duration-200 ${
              isLoading ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {isLoading ? "Saving..." : "➕ Add Location"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddLocation;
