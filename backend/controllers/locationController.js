import mongoose from "mongoose";
import Location from "../models/Location.js";
import Warehouse from "../models/Warehouse.js";

// ✅ GET: /api/locations?warehouse=<warehouseId>
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

    // ✅ populate warehouse name so Location List can show it
    const locations = await Location.find(filter)
      .populate("warehouse", "name")
      .sort({ name: 1 })
      .lean();

    res.json(locations);
  } catch (error) {
    console.error("❌ Error in getLocations:", error);
    res.status(500).json({ message: "Failed to fetch locations" });
  }
};

// ✅ POST: /api/locations
// body: { name, warehouse: "ALL" | warehouseId, description }
export const createLocation = async (req, res) => {
  try {
    const { name, warehouse, description } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Location name is required" });
    }

    const cleanName = String(name).trim();
    const cleanDesc = String(description || "").trim();

    // ✅ create for all warehouses
    if (warehouse === "ALL") {
      const warehouses = await Warehouse.find().select("_id").lean();
      if (!warehouses.length) {
        return res.status(400).json({ message: "No warehouses found" });
      }

      const ops = warehouses.map((w) => ({
        updateOne: {
          filter: { warehouse: w._id, name: cleanName },
          update: { $setOnInsert: { warehouse: w._id, name: cleanName, description: cleanDesc } },
          upsert: true,
        },
      }));

      await Location.bulkWrite(ops, { ordered: false });
      return res.status(201).json({ message: "✅ Location created for all warehouses" });
    }

    // ✅ create for single warehouse
    if (!warehouse || !mongoose.Types.ObjectId.isValid(warehouse)) {
      return res.status(400).json({ message: "Valid warehouse is required" });
    }

    const created = await Location.create({
      name: cleanName,
      warehouse,
      description: cleanDesc,
    });

    res.status(201).json(created);
  } catch (error) {
    console.error("❌ Error in createLocation:", error);
    if (error?.code === 11000) {
      return res.status(400).json({ message: "Rack already exists in this warehouse" });
    }
    res.status(500).json({ message: "Failed to create location" });
  }
};

// ✅ PUT: /api/locations/:id
export const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid location id" });
    }

    const updated = await Location.findByIdAndUpdate(
      id,
      {
        ...(name ? { name: String(name).trim() } : {}),
        ...(description !== undefined ? { description: String(description || "").trim() } : {}),
      },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: "Location not found" });
    res.json(updated);
  } catch (error) {
    console.error("❌ Error in updateLocation:", error);
    if (error?.code === 11000) {
      return res.status(400).json({ message: "Rack already exists in this warehouse" });
    }
    res.status(500).json({ message: "Failed to update location" });
  }
};

// ✅ PUT: /api/locations/by-name/:name  (Edit All)
export const updateLocationByName = async (req, res) => {
  try {
    const { name } = req.params;
    const { description, newName } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Invalid name" });
    }

    const filterName = String(name).trim();
    const update = {};

    if (newName && String(newName).trim()) update.name = String(newName).trim();
    if (description !== undefined) update.description = String(description || "").trim();

    if (!Object.keys(update).length) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const result = await Location.updateMany(
      { name: filterName },
      { $set: update },
      { collation: { locale: "en", strength: 2 } }
    );

    res.json({ message: "✅ Updated", modified: result.modifiedCount });
  } catch (error) {
    console.error("❌ Error in updateLocationByName:", error);
    res.status(500).json({ message: "Failed to update locations" });
  }
};

// ✅ DELETE: /api/locations/:id
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

// ✅ DELETE: /api/locations/by-name/:name  (Delete All)
export const deleteLocationByName = async (req, res) => {
  try {
    const { name } = req.params;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Invalid name" });
    }

    const result = await Location.deleteMany(
      { name: String(name).trim() },
      { collation: { locale: "en", strength: 2 } }
    );

    res.json({ message: "✅ Deleted", deleted: result.deletedCount });
  } catch (error) {
    console.error("❌ Error in deleteLocationByName:", error);
    res.status(500).json({ message: "Failed to delete locations" });
  }
};
