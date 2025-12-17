// src/pages/demo/AddDemoItems.jsx
import React, { useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  useGetPendingDemoReturnsQuery,
  useMarkDemoReturnMutation,
} from "../../services/inventoryApi";

const AddDemoItems = () => {
  const { data: items = [], isLoading } = useGetPendingDemoReturnsQuery();
  const [markDemoReturn, { isLoading: isMarking }] = useMarkDemoReturnMutation();
  const [returning, setReturning] = useState("");

  const markAsReturned = async (id) => {
    setReturning(id);
    try {
      await markDemoReturn(id).unwrap();
      toast.success("✅ Marked as returned.");
      // Cache will auto-refetch due to invalidatesTags in API
    } catch (error) {
      toast.error(error?.data?.message || "❌ Failed to mark as returned.");
      console.error("Return error:", error);
    } finally {
      setReturning("");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">📦 Pending Demo Returns</h2>

      <div className="overflow-x-auto shadow rounded bg-white">
        <table className="w-full table-auto border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Sl#</th>
              <th className="p-2 border">Item</th>
              <th className="p-2 border">Model No.</th>
              <th className="p-2 border">Warehouse</th>
              <th className="p-2 border">Rack</th>
              <th className="p-2 border">Qty</th>
              <th className="p-2 border">Out Date</th>
              <th className="p-2 border">Action</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="8" className="p-4 text-center">⏳ Loading...</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-4 text-center text-gray-500">
                  No pending demo returns.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="p-2 border text-center">{idx + 1}</td>
                  <td className="p-2 border text-center">{item.itemName}</td>
                  <td className="p-2 border text-center">{item.modelNo}</td>
                  <td className="p-2 border text-center">{item.warehouse}</td>
                  <td className="p-2 border text-center">{item.location}</td>
                  <td className="p-2 border text-center">{item.quantity}</td>
                  <td className="p-2 border text-center">
                    {new Date(item.date).toLocaleDateString()}
                  </td>
                  <td className="p-2 border text-center">
                    <button
                      onClick={() => markAsReturned(item._id)}
                      disabled={returning === item._id || isMarking}
                      className={`px-3 py-1 rounded text-white ${
                        returning === item._id || isMarking
                          ? "bg-gray-400 cursor-wait"
                          : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      {returning === item._id || isMarking ? "Returning..." : "Return"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AddDemoItems;
