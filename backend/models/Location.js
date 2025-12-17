// backend/models/Location.js
import mongoose from "mongoose";

const LocationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // optional: if you want rack unique per warehouse later, add:
    // warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", default: null },
  },
  { timestamps: true }
);

// ✅ normalize for uniqueness (prevents duplicates like RACK-A1, rack-a1, " RACK-A1 ")
LocationSchema.index(
  { name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

LocationSchema.pre("save", function (next) {
  if (this.name) this.name = this.name.trim();
  next();
});

const Location = mongoose.model("Location", LocationSchema);
export default Location;
