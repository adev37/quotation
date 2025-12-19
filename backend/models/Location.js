import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
  },
  { timestamps: true }
);

// ✅ Prevent duplicates per warehouse (case-insensitive)
locationSchema.index(
  { warehouse: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

const Location = mongoose.model("Location", locationSchema);
export default Location;
