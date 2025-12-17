import mongoose from "mongoose";

const stockTransferSchema = new mongoose.Schema(
  {
    transferNo: {
      type: String,
      required: true,
      unique: true, // Unique transfer identifier (e.g., TR-00001)
      trim: true,
    },
    fromWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    toWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    transferDate: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    purpose: {
      type: String,
      default: "Transferred",
      trim: true,
    },
    fromLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      default: null, // Source rack/location
    },
    toLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      default: null, // Target rack/location
    },
  },
  { timestamps: true }
);

export default mongoose.models.StockTransfer ||
  mongoose.model("StockTransfer", stockTransferSchema);
