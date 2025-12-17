// backend/controllers/currentStockController.js
import mongoose from "mongoose";
import Item from "../models/Item.js";
import StockLedger from "../models/StockLedger.js";

// ✅ Current stock report: groups by normalized rack NAME (report-friendly)
export const getCurrentStock = async (req, res) => {
  try {
    const { item, warehouse } = req.query;

    const match = {};
    if (item && mongoose.Types.ObjectId.isValid(item)) {
      match.item = new mongoose.Types.ObjectId(item);
    }
    if (warehouse && mongoose.Types.ObjectId.isValid(warehouse)) {
      match.warehouse = new mongoose.Types.ObjectId(warehouse);
    }

    const results = await StockLedger.aggregate([
      { $match: match },

      // join item
      {
        $lookup: {
          from: "items",
          localField: "item",
          foreignField: "_id",
          as: "itemDoc",
        },
      },
      { $unwind: { path: "$itemDoc", preserveNullAndEmptyArrays: true } },

      // join warehouse
      {
        $lookup: {
          from: "warehouses",
          localField: "warehouse",
          foreignField: "_id",
          as: "warehouseDoc",
        },
      },
      { $unwind: { path: "$warehouseDoc", preserveNullAndEmptyArrays: true } },

      // join location
      {
        $lookup: {
          from: "locations",
          localField: "location",
          foreignField: "_id",
          as: "locationDoc",
        },
      },
      { $unwind: { path: "$locationDoc", preserveNullAndEmptyArrays: true } },

      // normalize name
      {
        $addFields: {
          locationName: {
            $cond: [
              { $ifNull: ["$locationDoc.name", false] },
              { $toUpper: { $trim: { input: "$locationDoc.name" } } },
              "—",
            ],
          },
        },
      },

      // group by normalized location NAME for reporting
      {
        $group: {
          _id: {
            item: "$item",
            warehouse: "$warehouse",
            locationName: "$locationName",
          },
          itemDoc: { $first: "$itemDoc" },
          warehouseDoc: { $first: "$warehouseDoc" },
          locationName: { $first: "$locationName" },
          quantity: { $sum: "$quantity" },
        },
      },

      { $match: { quantity: { $ne: 0 } } },

      {
        $project: {
          _id: 0,
          itemId: "$_id.item",
          warehouseId: "$_id.warehouse",
          locationId: null, // report uses name grouping; rack-options uses id grouping
          item: { $ifNull: ["$itemDoc.name", "Unknown"] },
          modelNo: { $ifNull: ["$itemDoc.modelNo", "-"] },
          companyName: { $ifNull: ["$itemDoc.companyName", "Unknown"] },
          warehouse: { $ifNull: ["$warehouseDoc.name", "Unknown"] },
          location: "$locationName",
          quantity: 1,
        },
      },

      { $sort: { item: 1, warehouse: 1, location: 1 } },
    ]);

    res.json(results);
  } catch (error) {
    console.error("❌ Error in getCurrentStock:", error);
    res.status(500).json({ message: "Failed to fetch current stock" });
  }
};

// ✅ FIXED rack dropdown options for Stock Out
// - merges duplicate Location docs that share same name
// - returns a canonical locationId to submit
export const getAvailableStockLocations = async (req, res) => {
  try {
    const { item, warehouse } = req.query;

    if (!item || !warehouse) {
      return res.status(400).json({ message: "item and warehouse are required" });
    }
    if (!mongoose.Types.ObjectId.isValid(item) || !mongoose.Types.ObjectId.isValid(warehouse)) {
      return res.status(400).json({ message: "Invalid item or warehouse id" });
    }

    const itemId = new mongoose.Types.ObjectId(item);
    const warehouseId = new mongoose.Types.ObjectId(warehouse);

    const results = await StockLedger.aggregate([
      {
        $match: {
          item: itemId,
          warehouse: warehouseId,
          location: { $ne: null },
        },
      },

      // join location so we can normalize by name
      {
        $lookup: {
          from: "locations",
          localField: "location",
          foreignField: "_id",
          as: "loc",
        },
      },
      { $unwind: { path: "$loc", preserveNullAndEmptyArrays: true } },

      // normalize rack name
      {
        $addFields: {
          locationName: {
            $cond: [
              { $ifNull: ["$loc.name", false] },
              { $toUpper: { $trim: { input: "$loc.name" } } },
              "—",
            ],
          },
        },
      },

      // group by rack NAME (merge duplicates)
      {
        $group: {
          _id: "$locationName",
          quantity: { $sum: "$quantity" },
          locationIds: { $addToSet: "$location" },
        },
      },

      { $match: { quantity: { $gt: 0 } } },

      // pick canonical id (smallest id) so frontend submits one id
      {
        $addFields: {
          canonicalLocationId: {
            $let: {
              vars: { ids: "$locationIds" },
              in: {
                $arrayElemAt: [
                  {
                    $sortArray: { input: "$$ids", sortBy: 1 },
                  },
                  0,
                ],
              },
            },
          },
        },
      },

      {
        $project: {
          _id: 0,
          locationId: "$canonicalLocationId",
          location: "$_id",
          quantity: 1,
          mergedLocationIds: "$locationIds",
        },
      },

      { $sort: { location: 1 } },
    ]);

    res.json(results);
  } catch (error) {
    console.error("❌ Error in getAvailableStockLocations:", error);
    res.status(500).json({ message: "Failed to fetch rack stock" });
  }
};

// ✅ Dashboard stats
export const getDashboardStats = async (req, res) => {
  try {
    const grouped = await StockLedger.aggregate([
      {
        $group: {
          _id: { item: "$item", warehouse: "$warehouse" },
          quantity: { $sum: "$quantity" },
        },
      },
    ]);

    const itemIds = grouped.map((g) => g._id.item);

    const items = await Item.find(
      { _id: { $in: itemIds } },
      "minStockAlert"
    ).lean();

    const alertMap = Object.fromEntries(
      items.map((i) => [String(i._id), i.minStockAlert ?? 5])
    );

    const totalItems = await Item.countDocuments();
    const totalStock = grouped.reduce((sum, g) => sum + (g.quantity || 0), 0);

    const lowStockItems = grouped.filter((g) => {
      const min = alertMap[String(g._id.item)] ?? 5;
      return (g.quantity || 0) < min;
    }).length;

    res.json({ totalItems, totalStock, lowStockItems });
  } catch (error) {
    console.error("❌ Error in getDashboardStats:", error);
    res.status(500).json({ message: "Dashboard summary error" });
  }
};

// ✅ qty for item + warehouse + location (id-based)
export const getStockByItemWarehouseRack = async (req, res) => {
  try {
    const { item, warehouse, location } = req.query;

    if (!mongoose.Types.ObjectId.isValid(item) || !mongoose.Types.ObjectId.isValid(warehouse)) {
      return res.status(400).json({ message: "Invalid item/warehouse id" });
    }

    const matchStage = {
      item: new mongoose.Types.ObjectId(item),
      warehouse: new mongoose.Types.ObjectId(warehouse),
    };

    if (location === "null" || !location) {
      matchStage.location = { $in: [null] };
    } else {
      if (!mongoose.Types.ObjectId.isValid(location)) {
        return res.status(400).json({ message: "Invalid location id" });
      }
      matchStage.location = new mongoose.Types.ObjectId(location);
    }

    const entries = await StockLedger.aggregate([
      { $match: matchStage },
      { $group: { _id: null, quantity: { $sum: "$quantity" } } },
    ]);

    res.json({ quantity: entries.length ? entries[0].quantity : 0 });
  } catch (error) {
    console.error("❌ Error in getStockByItemWarehouseRack:", error);
    res.status(500).json({ message: "Failed to fetch available stock" });
  }
};
