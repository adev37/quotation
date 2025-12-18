import mongoose from "mongoose";
import Location from "../models/Location.js";

// ✅ GET locations (optional filter by warehouse)
export const getLocations = async (req, res) => {
  try {
    const { warehouse } = req.query;

    const filter = {};
    if (warehouse) {
      if (!mongoose.Types.ObjectId.isValid(warehouse)) {
        return res.status(400).json({ message: "Invalid warehouse id" });
      }
      filter.warehouse = warehouse;
    }

    const locations = await Location.find(filter)
      .sort({ name: 1 })
      .lean();

    res.json(locations);
  } catch (error) {
    console.error("❌ Error in getLocations:", error);
    res.status(500).json({ message: "Failed to fetch locations" });
  }
};

// ✅ CREATE location (warehouse required)
export const createLocation = async (req, res) => {
  try {
    const { name, warehouse, description } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Location name is required" });
    }
    if (!warehouse || !mongoose.Types.ObjectId.isValid(warehouse)) {
      return res.status(400).json({ message: "Valid warehouse is required" });
    }

    const created = await Location.create({
      name: String(name).trim(),
      warehouse,
      description: String(description || "").trim(),
    });

    res.status(201).json(created);
  } catch (error) {
    console.error("❌ Error in createLocation:", error);

    // duplicate key (same rack name in same warehouse)
    if (error?.code === 11000) {
      return res.status(400).json({ message: "Rack already exists in this warehouse" });
    }

    res.status(500).json({ message: "Failed to create location" });
  }
};

// ✅ DELETE location
export const deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid location id" });
    }

    const deleted = await Location.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Location not found" });

    res.json({ message: "✅ Location deleted" });
  } catch (error) {
    console.error("❌ Error in deleteLocation:", error);
    res.status(500).json({ message: "Failed to delete location" });
  }
};
