import mongoose from "mongoose";

const stockAdjustmentSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    action: {
      type: String,
      enum: ["IN", "OUT"],
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    purpose: {
      type: String,
      default: "Adjusted",
    },
    date: {
      type: Date,
      default: Date.now,
    },
    // ✅ Optional rack-level location
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.models.StockAdjustment ||
  mongoose.model("StockAdjustment", stockAdjustmentSchema);
