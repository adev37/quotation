import mongoose from "mongoose";
import StockLedger from "../models/StockLedger.js";

// 📦 GET: Pending Demo Returns (unreturned OUT entries)
export const getPendingDemoReturns = async (req, res) => {
  try {
    const raw = await StockLedger.find({
      action: "OUT",
      purpose: "Demo",
      returned: { $ne: true }, // Only NOT returned
    })
      .populate("item", "name modelNo")
      .populate("warehouse", "name")
      .populate("location", "name")
      .sort({ date: -1 });

    const formatted = raw.map((entry) => ({
      _id: entry._id,
      itemName: entry.item?.name || "-",
      modelNo: entry.item?.modelNo || "-",
      warehouse: entry.warehouse?.name || "-",
      location: entry.location?.name || "-",
      quantity: entry.quantity,
      date: entry.date,
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error("❌ Error in getPendingDemoReturns:", error);
    res.status(500).json({ message: error.message });
  }
};

// 🔁 POST: Return one OUT entry (and create matching IN entry)
export const returnDemoBatch = async (req, res) => {
  try {
    const id = req.params.id; // OUT ledger entry ID
    const outEntry = await StockLedger.findById(id);

    if (!outEntry || outEntry.returned || outEntry.action !== "OUT") {
      return res.status(400).json({ message: "Invalid or already returned." });
    }

    outEntry.returned = true;
    await outEntry.save();

    const inEntry = await StockLedger.create({
      item: outEntry.item,
      warehouse: outEntry.warehouse,
      location: outEntry.location,
      quantity: Math.abs(outEntry.quantity),
      action: "IN",
      type: "Return In",
      purpose: "Demo Return",
      remarks: "Returned from demo",
      date: new Date(),
      referenceId: outEntry._id, // ✅ used in report merge
    });

    res.status(200).json({
      message: "✅ Returned successfully.",
      inEntry,
    });
  } catch (error) {
    console.error("❌ Error in returnDemoBatch:", error);
    res.status(500).json({ message: error.message });
  }
};

// 📄 GET: Only returned demo IN entries (history)
export const getAllDemoReturns = async (req, res) => {
  try {
    const demoReturns = await StockLedger.find({
      action: "IN",
      purpose: "Demo Return",
    })
      .populate("item", "name modelNo")
      .populate("warehouse", "name")
      .sort({ date: -1 });

    res.status(200).json(demoReturns);
  } catch (error) {
    console.error("❌ Error in getAllDemoReturns:", error);
    res.status(500).json({ message: error.message });
  }
};

// 📊 GET: Full Demo Return Report (Pending + Returned)
export const getDemoReturnReport = async (req, res) => {
  try {
    const outEntries = await StockLedger.find({
      action: "OUT",
      purpose: "Demo",
    })
      .populate("item", "name modelNo")
      .populate("warehouse", "name")
      .populate("location", "name");

    const inEntries = await StockLedger.find({
      action: "IN",
      purpose: "Demo Return",
    });

    // Match IN entries by referenceId → original OUT entry
    const inMap = {};
    for (const inEntry of inEntries) {
      if (inEntry.referenceId) {
        inMap[inEntry.referenceId.toString()] = inEntry;
      }
    }

    const result = outEntries.map((out) => {
      const returnedEntry = inMap[out._id.toString()];
      return {
        _id: out._id,
        itemName: out.item?.name || "-",
        modelNo: out.item?.modelNo || "-",
        quantity: Math.abs(out.quantity),
        returnedQty: returnedEntry ? Math.abs(returnedEntry.quantity) : 0,
        returnDate: out.returnDate || null,
        returnedOn: returnedEntry?.date || null,
        returned: !!returnedEntry,
      };
    });

    // Sort: latest return date or expected return date
    result.sort((a, b) => {
      return (
        new Date(b.returnedOn || b.returnDate) -
        new Date(a.returnedOn || a.returnDate)
      );
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Error in getDemoReturnReport:", error);
    res.status(500).json({ message: error.message });
  }
};
