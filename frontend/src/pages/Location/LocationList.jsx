// src/pages/Location/LocationList.jsx
import React, { useEffect, useMemo, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  useGetLocationsQuery,
  useUpdateLocationByNameMutation,
  useDeleteLocationMutation,
} from "../../services/inventoryApi";

const ITEMS_PER_PAGE = 10;

const LocationList = () => {
  const { data: locations = [], isLoading, refetch } = useGetLocationsQuery();
  const [updateByName, { isLoading: isUpdating }] =
    useUpdateLocationByNameMutation();
  const [deleteLocation] = useDeleteLocationMutation();

  const [groupedLocations, setGroupedLocations] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingName, setEditingName] = useState(null);
  const [editData, setEditData] = useState({ newName: "", description: "" });

  // group locations by rack name whenever data changes
  useEffect(() => {
    const groupByRackName = (data) => {
      const map = new Map();
      (data || []).forEach((loc) => {
        const key = (loc.name || "").trim().toLowerCase();
        const whName =
          typeof loc.warehouse === "object"
            ? loc.warehouse?.name || "—"
            : "—";
        if (!map.has(key)) {
          map.set(key, {
            _id: loc._id, // just for keying
            name: loc.name,
            description: loc.description,
            warehouses: [whName],
          });
        } else {
          map.get(key).warehouses.push(whName);
        }
      });
      return Array.from(map.values());
    };

    setGroupedLocations(groupByRackName(locations));
    setCurrentPage(1);
  }, [locations]);

  const totalPages = useMemo(
    () => Math.ceil(groupedLocations.length / ITEMS_PER_PAGE) || 1,
    [groupedLocations.length]
  );

  const paginatedLocations = useMemo(
    () =>
      groupedLocations.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
      ),
    [groupedLocations, currentPage]
  );

  const handleDeleteAllByName = async (name) => {
    const confirm = window.confirm(
      `Delete ALL entries for "${name}" rack?`
    );
    if (!confirm) return;

    // delete all location documents that match this rack name
    try {
      const toDelete = (locations || []).filter(
        (loc) => loc.name.trim().toLowerCase() === name.trim().toLowerCase()
      );

      if (toDelete.length === 0) {
        toast.info("Nothing to delete.");
        return;
      }

      await Promise.all(
        toDelete.map((loc) => deleteLocation(loc._id).unwrap())
      );

      toast.success(`🗑️ Deleted ${toDelete.length} entries of "${name}" rack`);
      refetch();
    } catch (err) {
      toast.error("❌ Failed to delete rack group.");
      // eslint-disable-next-line no-console
      console.error("Delete error:", err);
    }
  };

  const handleEditClick = (loc) => {
    setEditingName(loc.name);
    setEditData({ newName: loc.name, description: loc.description || "" });
  };

  const handleUpdate = async () => {
    if (!editingName) return;
    try {
      await updateByName({
        name: editingName,
        newName: editData.newName,
        description: editData.description,
      }).unwrap();
      toast.success("✅ Rack group updated successfully.");
      setEditingName(null);
      refetch();
    } catch (err) {
      toast.error("❌ Failed to update rack group.");
      // eslint-disable-next-line no-console
      console.error("Update error:", err);
    }
  };

  return (
    <div className="p-6">
      <ToastContainer position="top-right" autoClose={3000} />
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        🗃️ Location (Rack) List
      </h2>

      {isLoading ? (
        <p className="text-blue-500">Loading locations...</p>
      ) : groupedLocations.length === 0 ? (
        <p className="text-gray-500">No locations found.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto bg-white shadow rounded">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-2 border">#</th>
                  <th className="p-2 border">Location Name</th>
                  <th className="p-2 border">Warehouses</th>
                  <th className="p-2 border">Description</th>
                  <th className="p-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLocations.map((loc, idx) => (
                  <tr key={loc.name} className="border-t hover:bg-gray-50">
                    <td className="p-2 border">
                      {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                    </td>

                    {editingName === loc.name ? (
                      <>
                        <td className="p-2 border">
                          <input
                            name="newName"
                            value={editData.newName}
                            onChange={(e) =>
                              setEditData((s) => ({
                                ...s,
                                newName: e.target.value,
                              }))
                            }
                            className="w-full border rounded px-2 py-1"
                          />
                        </td>
                        <td className="p-2 border text-sm text-gray-700">
                          {loc.warehouses.join(", ")}
                        </td>
                        <td className="p-2 border">
                          <input
                            name="description"
                            value={editData.description}
                            onChange={(e) =>
                              setEditData((s) => ({
                                ...s,
                                description: e.target.value,
                              }))
                            }
                            className="w-full border rounded px-2 py-1"
                          />
                        </td>
                        <td className="p-2 border flex gap-2">
                          <button
                            onClick={handleUpdate}
                            disabled={isUpdating}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded disabled:opacity-60"
                          >
                            💾 Save All
                          </button>
                          <button
                            onClick={() => setEditingName(null)}
                            className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded"
                          >
                            ❌ Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-2 border">{loc.name}</td>
                        <td className="p-2 border text-sm text-gray-700">
                          {loc.warehouses.join(", ")}
                        </td>
                        <td className="p-2 border">
                          {loc.description || "—"}
                        </td>
                        <td className="p-2 border flex gap-2">
                          <button
                            onClick={() => handleEditClick(loc)}
                            className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded"
                          >
                            ✏️ Edit All
                          </button>
                          <button
                            onClick={() => handleDeleteAllByName(loc.name)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                          >
                            🗑 Delete All
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex justify-between items-center mt-4">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              className="px-4 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
            >
              ⬅️ Previous
            </button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="px-4 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
            >
              Next ➡️
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default LocationList;
