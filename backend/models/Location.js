import mongoose from "mongoose";

const LocationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    // ✅ Each rack belongs to a warehouse
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },

    description: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

// ✅ normalize
LocationSchema.pre("save", function (next) {
  if (this.name) this.name = this.name.trim();
  next();
});

// ✅ prevent duplicate rack names inside SAME warehouse (case-insensitive)
LocationSchema.index(
  { warehouse: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

export default mongoose.models.Location ||
  mongoose.model("Location", LocationSchema);
