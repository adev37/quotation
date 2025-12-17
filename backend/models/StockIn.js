// models/StockIn.js
import mongoose from "mongoose";

const stockInSchema = new mongoose.Schema(
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
      min: [1, "Quantity must be at least 1"],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
    // ❌ Removed stockInNo
    // ✅ Rack/Location reference
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.StockIn ||
  mongoose.model("StockIn", stockInSchema);
