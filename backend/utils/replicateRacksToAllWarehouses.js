import mongoose from "mongoose";
import dotenv from "dotenv";
import Warehouse from "../models/Warehouse.js";
import Location from "../models/Location.js";

dotenv.config();

const norm = (s) => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ DB connected");

  const warehouses = await Warehouse.find({}, "_id name").lean();
  if (!warehouses.length) {
    console.log("❌ No warehouses found");
    process.exit(0);
  }

  const allLocations = await Location.find({}, "name").lean();
  const unique = new Map();

  // keep one “original” name for each normalized rack
  for (const l of allLocations) {
    const key = norm(l.name);
    if (!unique.has(key)) unique.set(key, String(l.name).trim());
  }

  const uniqueRackNames = [...unique.values()];
  console.log("✅ Unique rack names:", uniqueRackNames.length);

  let created = 0;

  for (const wh of warehouses) {
    const ops = uniqueRackNames.map((rackName) => ({
      updateOne: {
        filter: { warehouse: wh._id, name: rackName },
        update: { $setOnInsert: { warehouse: wh._id, name: rackName, description: "" } },
        upsert: true,
        collation: { locale: "en", strength: 2 },
      },
    }));

    const r = await Location.bulkWrite(ops, { ordered: false });
    created += (r.upsertedCount || 0);
  }

  console.log(`✅ Done. Inserted missing racks: ${created}`);
  await mongoose.disconnect();
};

run().catch((e) => {
  console.error("❌ Failed:", e);
  process.exit(1);
});
