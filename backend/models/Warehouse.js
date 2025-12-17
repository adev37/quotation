import mongoose from "mongoose";

const warehouseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

// ✅ Optional: Prevent duplicate warehouses in same city/location
// warehouseSchema.index({ name: 1, location: 1 }, { unique: true });

export default mongoose.models.Warehouse ||
  mongoose.model("Warehouse", warehouseSchema);
