// models/StockOut.js
import mongoose from "mongoose";

const stockOutSchema = new mongoose.Schema(
  {
    // ✅ Needed for Challan + grouping multiple items in one stock-out request
    stockOutNo: {
      type: String,
      required: true,
      index: true,
    },

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

    // ✅ Since your app is rack-aware, we keep location and require it
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
    },

    purpose: {
      type: String,
      enum: ["Sale", "Demo"],
      required: true,
    },

    date: {
      type: Date,
      default: Date.now,
    },

    returnDate: {
      type: Date,
      default: null,
    },

    reason: {
      type: String,
      trim: true,
    },

    tenderNo: {
      type: String,
      trim: true,
    },

    returnProcessed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.models.StockOut ||
  mongoose.model("StockOut", stockOutSchema);
