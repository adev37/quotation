// utils/replicateRacksToAllWarehouses.js
import Warehouse from "../models/Warehouse.js";
import Location from "../models/Location.js";

/**
 * Ensure predefined rack templates (like Rack No-1, No-2) exist for every warehouse.
 */
export const replicateStandardRacks = async (req, res) => {
  try {
    const standardRacks = ["Rack No-1", "Rack No-2", "Rack No-3"];

    // Load all warehouses
    const warehouses = await Warehouse.find();

    // For each warehouse, check if each standard rack exists
    for (const warehouse of warehouses) {
      for (const rackName of standardRacks) {
        const existing = await Location.findOne({
          warehouse: warehouse._id,
          name: { $regex: new RegExp("^" + rackName + "$", "i") },
        });

        if (!existing) {
          await Location.create({
            name: rackName,
            warehouse: warehouse._id,
            description: `${rackName} for ${warehouse.name}`,
          });
        }
      }
    }

    res
      .status(200)
      .json({ message: "✅ All standard racks replicated to warehouses." });
  } catch (error) {
    console.error("❌ Error replicating racks:", error);
    res.status(500).json({ message: "Failed to replicate racks." });
  }
};
