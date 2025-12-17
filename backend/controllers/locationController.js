// backend/controllers/locationController.js
import Location from "../models/Location.js";

// ✅ GET all locations (for dropdowns)
export const getLocations = async (req, res) => {
  try {
    const locations = await Location.find().sort({ name: 1 }).lean();
    res.json(locations);
  } catch (error) {
    console.error("❌ Error in getLocations:", error);
    res.status(500).json({ message: "Failed to fetch locations" });
  }
};

// ✅ CREATE location (optional if you have Add Rack page)
export const createLocation = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Location name is required" });
    }

    const clean = String(name).trim();

    // avoid duplicates (case-insensitive due to index collation)
    const created = await Location.create({ name: clean });

    res.status(201).json(created);
  } catch (error) {
    console.error("❌ Error in createLocation:", error);

    // duplicate key error
    if (error?.code === 11000) {
      return res.status(400).json({ message: "Location already exists" });
    }

    res.status(500).json({ message: "Failed to create location" });
  }
};

// ✅ DELETE location (optional)
export const deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Location.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Location not found" });

    res.json({ message: "✅ Location deleted" });
  } catch (error) {
    console.error("❌ Error in deleteLocation:", error);
    res.status(500).json({ message: "Failed to delete location" });
  }
};
