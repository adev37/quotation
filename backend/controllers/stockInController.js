import StockIn from "../models/StockIn.js";
import StockLedger from "../models/StockLedger.js";
import Item from "../models/Item.js";
import Warehouse from "../models/Warehouse.js";
import Location from "../models/Location.js";
import mongoose from "mongoose";

// ✅ helper: normalize
const norm = (v) => String(v || "").trim().replace(/\s+/g, " ").toLowerCase();

// ✅ helper: parse date safely
const parseDateSafe = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

// ✅ CREATE STOCK IN (supports normal form + excel import)
export const createStockIn = async (req, res) => {
  try {
    const { items, date, remarks } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items provided." });
    }

    // 🔍 preload master data
    const [allItems, allWarehouses, allLocations] = await Promise.all([
      Item.find({}, "_id name modelNo").lean(),
      Warehouse.find({}, "_id name").lean(),
      // ✅ IMPORTANT: include warehouse for correct rack resolve
      Location.find({}, "_id name warehouse").lean(),
    ]);

    // item lookups (name + model)
    const itemByName = new Map(allItems.map((i) => [norm(i.name), i._id.toString()]));
    const itemByModel = new Map(
      allItems
        .filter((i) => i.modelNo)
        .map((i) => [norm(i.modelNo), i._id.toString()])
    );

    // warehouse lookup by name
    const warehouseByName = new Map(allWarehouses.map((w) => [norm(w.name), w._id.toString()]));

    // ✅ rack lookup by (warehouseId + rackName)
    const locationByWarehouseAndName = new Map(
      allLocations
        .filter((l) => l.warehouse)
        .map((l) => [`${l.warehouse.toString()}|${norm(l.name)}`, l._id.toString()])
    );

    const resolveId = (input, map) => {
      if (!input) return null;
      if (mongoose.Types.ObjectId.isValid(input)) return String(input);
      return map.get(norm(input)) || null;
    };

    // ✅ report like items import
    const results = [];
    let importedCount = 0;
    let skippedDuplicatesCount = 0;
    let errorCount = 0;

    // ✅ prevent duplicate rows inside same upload
    const seen = new Set();

    for (let i = 0; i < items.length; i++) {
      const entry = items[i] || {};
      const rowNo = Number(entry._row || i + 2);

      const itemInput = entry.item;
      const modelInput = entry.model; // optional
      const warehouseInput = entry.warehouse;
      const locationInput = entry.location; // optional
      const qtyRaw = entry.quantity;
      const dateRaw = entry.date || date;
      const entryRemarks = entry.remarks ?? remarks ?? "";

      const rowErrors = [];

      // ---- resolve item ----
      let itemId = resolveId(itemInput, itemByName);
      if (!itemId && modelInput) itemId = resolveId(modelInput, itemByModel);
      if (!itemId) {
        rowErrors.push(
          `Item not found. Provide valid Item name/ObjectId (or Model No). Got item="${
            itemInput || ""
          }", model="${modelInput || ""}".`
        );
      }

      // ---- resolve warehouse ----
      const warehouseId = resolveId(warehouseInput, warehouseByName);
      if (!warehouseId) {
        rowErrors.push(
          `Warehouse not found. Provide valid Warehouse name/ObjectId. Got "${warehouseInput || ""}".`
        );
      }

      // ---- resolve location (optional) ✅ FIXED
      let locationId = null;
      if (locationInput) {
        if (mongoose.Types.ObjectId.isValid(locationInput)) {
          locationId = String(locationInput);
        } else if (warehouseId) {
          const key = `${warehouseId}|${norm(locationInput)}`;
          locationId = locationByWarehouseAndName.get(key) || null;
        }

        if (!locationId) {
          rowErrors.push(
            `Rack/Location not found in this warehouse. Got rack="${locationInput}" for warehouse="${
              warehouseInput || ""
            }".`
          );
        }
      }

      // ---- qty ----
      const qty = Number(qtyRaw);
      if (!Number.isFinite(qty) || qty <= 0) {
        rowErrors.push(`Quantity must be a number > 0. Got "${qtyRaw}".`);
      }

      // ---- date ----
      const effDate = parseDateSafe(dateRaw || Date.now());
      if (!effDate) {
        rowErrors.push(`Invalid Date. Use yyyy-mm-dd (recommended). Got "${dateRaw || ""}".`);
      }

      // ---- duplicate check inside same import ----
      const dupKey = `${itemId || "x"}|${warehouseId || "x"}|${locationId || "null"}|${
        effDate ? effDate.toISOString().split("T")[0] : "x"
      }|${norm(entryRemarks)}`;

      if (!rowErrors.length && seen.has(dupKey)) {
        skippedDuplicatesCount++;
        results.push({
          row: rowNo,
          status: "DUPLICATE",
          message:
            "Duplicate skipped inside this import file (same Item + Warehouse + Rack + Date + Remarks).",
          data: {
            item: itemInput || "",
            model: modelInput || "",
            warehouse: warehouseInput || "",
            rack: locationInput || "",
            quantity: qtyRaw ?? "",
            date: dateRaw || "",
            remarks: entryRemarks || "",
          },
        });
        continue;
      }
      if (!rowErrors.length) seen.add(dupKey);

      // ---- if validation failed ----
      if (rowErrors.length) {
        errorCount++;
        results.push({
          row: rowNo,
          status: "FAILED",
          message: rowErrors.join(" "),
          data: {
            item: itemInput || "",
            model: modelInput || "",
            warehouse: warehouseInput || "",
            rack: locationInput || "",
            quantity: qtyRaw ?? "",
            date: dateRaw || "",
            remarks: entryRemarks || "",
          },
        });
        continue;
      }

      // ✅ create StockIn + Ledger
      try {
        const stockInDoc = await StockIn.create({
          item: itemId,
          warehouse: warehouseId,
          location: locationId,
          quantity: qty,
          date: effDate,
          remarks: entryRemarks,
        });

        await StockLedger.create({
          item: itemId,
          warehouse: warehouseId,
          location: locationId,
          quantity: Math.abs(qty),
          action: "IN",
          type: "In",
          remarks: entryRemarks,
          date: effDate,
        });

        importedCount++;
        results.push({
          row: rowNo,
          status: "IMPORTED",
          message: "Inserted successfully.",
          data: {
            _id: stockInDoc._id,
            item: itemInput || "",
            model: modelInput || "",
            warehouse: warehouseInput || "",
            rack: locationInput || "",
            quantity: qty,
            date: effDate.toISOString().split("T")[0],
            remarks: entryRemarks || "",
          },
        });
      } catch (err) {
        errorCount++;
        results.push({
          row: rowNo,
          status: "FAILED",
          message: err?.message || "Insert failed due to unknown error.",
          data: {
            item: itemInput || "",
            model: modelInput || "",
            warehouse: warehouseInput || "",
            rack: locationInput || "",
            quantity: qtyRaw ?? "",
            date: dateRaw || "",
            remarks: entryRemarks || "",
          },
        });
      }
    }

    if (importedCount === 0) {
      return res.status(400).json({
        message: `❌ Import failed. Imported: 0, Duplicates skipped: ${skippedDuplicatesCount}, Errors: ${errorCount}`,
        importedCount,
        skippedDuplicatesCount,
        errorCount,
        results,
      });
    }

    return res.status(201).json({
      message: `✅ Import finished. Imported: ${importedCount}, Duplicates skipped: ${skippedDuplicatesCount}, Errors: ${errorCount}`,
      importedCount,
      skippedDuplicatesCount,
      errorCount,
      results,
    });
  } catch (error) {
    console.error("❌ Error in createStockIn:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

// 📃 GET: All Stock In Records
export const getAllStockIns = async (req, res) => {
  try {
    const entries = await StockIn.find()
      .populate("item", "name modelNo companyName")
      .populate("warehouse", "name")
      .populate("location", "name")
      .sort({ date: -1 });

    res.json(entries);
  } catch (error) {
    console.error("❌ Error in getAllStockIns:", error);
    res.status(500).json({ message: "Failed to fetch stock in records" });
  }
};
