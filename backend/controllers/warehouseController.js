import Warehouse from "../models/Warehouse.js";
import Location from "../models/Location.js";

// ➕ Create warehouse (AUTO replicate existing rack names into this new warehouse)
export const createWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.create(req.body);

    // ✅ Get all unique rack names (from all warehouses)
    const allLocations = await Location.find({}, "name").lean();

    const norm = (s) => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();
    const unique = new Map();

    for (const l of allLocations) {
      const key = norm(l.name);
      if (!unique.has(key)) unique.set(key, String(l.name).trim());
    }

    const uniqueRackNames = [...unique.values()];

    if (uniqueRackNames.length) {
      const ops = uniqueRackNames.map((rackName) => ({
        updateOne: {
          filter: { warehouse: warehouse._id, name: rackName },
          update: {
            $setOnInsert: { warehouse: warehouse._id, name: rackName, description: "" },
          },
          upsert: true,
          collation: { locale: "en", strength: 2 },
        },
      }));

      await Location.bulkWrite(ops, { ordered: false });
    }

    res.status(201).json(warehouse);
  } catch (error) {
    console.error("❌ Error creating warehouse:", error);
    res.status(500).json({ message: error.message });
  }
};

// 📄 Get all warehouses
export const getAllWarehouses = async (req, res) => {
  try {
    const warehouses = await Warehouse.find();
    res.json(warehouses);
  } catch (error) {
    console.error("❌ Error fetching warehouses:", error);
    res.status(500).json({ message: error.message });
  }
};

// 🔄 Update warehouse
export const updateWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Warehouse.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Warehouse not found" });
    res.json(updated);
  } catch (error) {
    console.error("❌ Error updating warehouse:", error);
    res.status(500).json({ message: error.message });
  }
};

// 🗑️ Delete warehouse
export const deleteWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Warehouse.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Warehouse not found" });
    res.json({ message: "Warehouse deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting warehouse:", error);
    res.status(500).json({ message: error.message });
  }
};
