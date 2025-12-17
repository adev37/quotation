import mongoose from "mongoose";
import StockAdjustment from "../models/StockAdjustment.js";
import StockLedger from "../models/StockLedger.js";

// ➕ POST: Create a stock adjustment with rack/location
export const createStockAdjustment = async (req, res) => {
  try {
    const { item, warehouse, quantity, action, reason, date, location } =
      req.body;

    // ✅ Validate location (convert to ObjectId if valid, else null)
    const locationId = mongoose.Types.ObjectId.isValid(location)
      ? new mongoose.Types.ObjectId(location)
      : null;

    // ✅ 1. Create the stock adjustment entry
    const adjustment = await StockAdjustment.create({
      item,
      warehouse,
      quantity,
      action,
      reason,
      date,
      location: locationId,
    });

    // ✅ 2. Add to Stock Ledger
    await StockLedger.create({
      item,
      warehouse,
      location: locationId,
      quantity: action === "IN" ? Math.abs(quantity) : -Math.abs(quantity),
      action,
      type: "Adjustment",
      purpose: "Adjusted",
      remarks: reason,
      date,
    });

    res.status(201).json({
      message: "✅ Stock adjustment recorded successfully.",
      adjustment,
    });
  } catch (error) {
    console.error("❌ Error in createStockAdjustment:", error);
    res.status(500).json({ message: "Stock adjustment failed." });
  }
};

// 📄 GET: All stock adjustments (rack-aware)
export const getAllStockAdjustments = async (req, res) => {
  try {
    const adjustments = await StockAdjustment.find()
      .populate("item", "name modelNo")
      .populate("warehouse", "name")
      .populate("location", "name") // ✅ Show rack name in frontend
      .sort({ date: -1 });

    res.json(adjustments);
  } catch (error) {
    console.error("❌ Error in getAllStockAdjustments:", error);
    res.status(500).json({ message: "Failed to fetch adjustments." });
  }
};
