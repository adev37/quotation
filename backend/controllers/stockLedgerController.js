import StockLedger from "../models/StockLedger.js";
import Location from "../models/Location.js";

// 📘 GET: Complete Stock Ledger with location names
export const getStockLedger = async (req, res) => {
  try {
    // 🔍 Preload all locations to avoid N+1 queries
    const locations = await Location.find({}, "_id name").lean();
    const locationMap = {};
    for (const loc of locations) {
      locationMap[loc._id.toString()] = loc.name;
    }

    // 📦 Fetch stock ledger entries
    const ledger = await StockLedger.find()
      .populate("item", "name modelNo")
      .populate("warehouse", "name")
      .sort({ date: -1 });

    // 🧩 Map location name
    const enriched = ledger.map((entry) => {
      const obj = entry.toObject();
      const locationName = obj.location
        ? locationMap[obj.location.toString()] || "—"
        : "—";

      return {
        ...obj,
        locationDisplay: locationName,
      };
    });

    res.status(200).json(enriched);
  } catch (error) {
    console.error("❌ Error in getStockLedger:", error);
    res.status(500).json({ message: "Failed to fetch stock ledger records" });
  }
};
