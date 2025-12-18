import Warehouse from "../models/Warehouse.js";
import Location from "../models/Location.js";

export const replicateStandardRacks = async (req, res) => {
  try {
    const standardRacks = [
      "Rack No-1",
      "Rack No-2",
      "Rack No-3",
      "C ON FLOOR",
      "G On Floor",
    ];

    const warehouses = await Warehouse.find().lean();

    let createdCount = 0;

    for (const wh of warehouses) {
      for (const rackName of standardRacks) {
        const exists = await Location.findOne({
          warehouse: wh._id,
          name: rackName,
        }).collation({ locale: "en", strength: 2 });

        if (!exists) {
          await Location.create({
            name: rackName,
            warehouse: wh._id,
            description: `${rackName} for ${wh.name}`,
          });
          createdCount++;
        }
      }
    }

    res.status(200).json({
      message: "✅ Standard racks replicated to all warehouses.",
      createdCount,
    });
  } catch (error) {
    console.error("❌ Error replicating racks:", error);
    res.status(500).json({ message: "Failed to replicate racks." });
  }
};
