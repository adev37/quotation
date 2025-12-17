import mongoose from "mongoose";
import dotenv from "dotenv";
import Location from "../models/Location.js";
import StockLedger from "../models/StockLedger.js";
import StockOut from "../models/StockOut.js";
import StockTransfer from "../models/StockTransfer.js";

dotenv.config();

const norm = (s) => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ DB connected");

  const locations = await Location.find().lean();

  const groups = new Map();
  for (const loc of locations) {
    const key = norm(loc.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(loc);
  }

  const duplicates = [...groups.entries()].filter(([, arr]) => arr.length > 1);
  console.log(`Found ${duplicates.length} duplicate name groups`);

  for (const [key, arr] of duplicates) {
    // choose canonical = oldest (smallest _id string)
    const sorted = [...arr].sort((a, b) => String(a._id).localeCompare(String(b._id)));
    const canonical = sorted[0];
    const others = sorted.slice(1);

    const otherIds = others.map((x) => x._id);

    console.log(`Merging "${key}" -> canonical ${canonical._id}, removing ${otherIds.length} ids`);

    // Update references
    await StockLedger.updateMany(
      { location: { $in: otherIds } },
      { $set: { location: canonical._id } }
    );

    await StockOut.updateMany(
      { location: { $in: otherIds } },
      { $set: { location: canonical._id } }
    );

    await StockTransfer.updateMany(
      { fromLocation: { $in: otherIds } },
      { $set: { fromLocation: canonical._id } }
    );

    await StockTransfer.updateMany(
      { toLocation: { $in: otherIds } },
      { $set: { toLocation: canonical._id } }
    );

    // Delete duplicates
    await Location.deleteMany({ _id: { $in: otherIds } });
  }

  console.log("✅ Migration done");
  await mongoose.disconnect();
};

run().catch((e) => {
  console.error("❌ Migration failed:", e);
  process.exit(1);
});
