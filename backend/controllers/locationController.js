import mongoose from "mongoose";
import XLSX from "xlsx";
import Location from "../models/Location.js";
import Warehouse from "../models/Warehouse.js";

// ✅ GET: /api/locations?warehouse=<warehouseId>  (raw)
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
      .populate("warehouse", "name")
      .sort({ name: 1 })
      .lean();

    res.json(locations);
  } catch (error) {
    console.error("❌ Error in getLocations:", error);
    res.status(500).json({ message: "Failed to fetch locations" });
  }
};

// ✅ NEW: GET paginated grouped racks
// GET /api/locations/grouped?page=1&limit=10&search=
export const getGroupedLocationsPaged = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 100);
    const search = String(req.query.search || "").trim();

    const match = {};
    if (search) {
      match.name = { $regex: search, $options: "i" };
    }

    // Group by rack name (case-insensitive)
    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "warehouses",
          localField: "warehouse",
          foreignField: "_id",
          as: "warehouseDoc",
        },
      },
      { $unwind: { path: "$warehouseDoc", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $toLower: "$name" },
          name: { $first: "$name" },
          description: { $first: "$description" },
          warehouses: { $addToSet: "$warehouseDoc.name" },
          createdAt: { $min: "$createdAt" },
        },
      },
      { $sort: { name: 1 } },
      {
        $facet: {
          meta: [{ $count: "total" }],
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        },
      },
    ];

    const [result] = await Location.aggregate(pipeline);
    const total = result?.meta?.[0]?.total || 0;

    res.json({
      data: result?.data || [],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    console.error("❌ Error in getGroupedLocationsPaged:", error);
    res.status(500).json({ message: "Failed to fetch grouped locations" });
  }
};

// ✅ POST: /api/locations
// body: { name, description }
// ✅ Always create in ALL warehouses
export const createLocation = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Location name is required" });
    }

    const cleanName = String(name).trim();
    const cleanDesc = String(description || "").trim();

    const warehouses = await Warehouse.find().select("_id").lean();
    if (!warehouses.length) {
      return res.status(400).json({ message: "No warehouses found" });
    }

    const ops = warehouses.map((w) => ({
      updateOne: {
        filter: { warehouse: w._id, name: cleanName },
        update: {
          $setOnInsert: { warehouse: w._id, name: cleanName, description: cleanDesc },
        },
        upsert: true,
        collation: { locale: "en", strength: 2 },
      },
    }));

    await Location.bulkWrite(ops, { ordered: false });

    return res.status(201).json({
      message: "✅ Location created in all warehouses",
      rackName: cleanName,
      warehousesCount: warehouses.length,
    });
  } catch (error) {
    console.error("❌ Error in createLocation:", error);
    if (error?.code === 11000) {
      return res.status(400).json({ message: "Rack already exists" });
    }
    res.status(500).json({ message: "Failed to create location" });
  }
};

// ✅ NEW: POST /api/locations/import
// Excel columns supported: name (required), description (optional)
export const importLocationsExcel = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ message: "Excel file is required" });
    }

    const warehouses = await Warehouse.find().select("_id").lean();
    if (!warehouses.length) {
      return res.status(400).json({ message: "No warehouses found" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (!rows.length) {
      return res.status(400).json({ message: "Excel sheet is empty" });
    }

    // normalize headers (accept Name/NAME/name)
    const getField = (row, key) => {
      const k = Object.keys(row).find((x) => x.trim().toLowerCase() === key);
      return k ? row[k] : "";
    };

    const normName = (s) => String(s || "").trim().replace(/\s+/g, " ");

    // build unique rack list from excel
    const unique = new Map(); // lowerName -> {name, description}
    for (const row of rows) {
      const name = normName(getField(row, "name"));
      const description = String(getField(row, "description") || "").trim();
      if (!name) continue;

      const key = name.toLowerCase();
      if (!unique.has(key)) unique.set(key, { name, description });
    }

    const racks = [...unique.values()];
    if (!racks.length) {
      return res.status(400).json({ message: "No valid 'name' rows found in excel" });
    }

    // bulk upserts for all warehouses
    const ops = [];
    for (const w of warehouses) {
      for (const r of racks) {
        ops.push({
          updateOne: {
            filter: { warehouse: w._id, name: r.name },
            update: {
              $setOnInsert: {
                warehouse: w._id,
                name: r.name,
                description: r.description || "",
              },
            },
            upsert: true,
            collation: { locale: "en", strength: 2 },
          },
        });
      }
    }

    const result = await Location.bulkWrite(ops, { ordered: false });

    res.status(201).json({
      message: "✅ Excel imported successfully (created in ALL warehouses)",
      uniqueRacksInExcel: racks.length,
      warehousesCount: warehouses.length,
      mongo: {
        inserted: result?.upsertedCount || 0,
        matched: result?.matchedCount || 0,
        modified: result?.modifiedCount || 0,
      },
    });
  } catch (error) {
    console.error("❌ Error in importLocationsExcel:", error);
    res.status(500).json({ message: "Failed to import excel" });
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

// ✅ PUT: /api/locations/by-name/:name  (Edit All Warehouses)
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

// ✅ DELETE: /api/locations/by-name/:name  (Delete All Warehouses)
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
