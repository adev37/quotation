import mongoose from "mongoose";

const stockLedgerSchema = new mongoose.Schema(
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
      enum: ["IN", "OUT"], // IN = added to stock, OUT = deducted
      required: true,
    },
    type: {
      type: String,
      default: "Manual", // Manual, In, Out, Transfer In, Transfer Out
    },
    purpose: {
      type: String,
      enum: ["Sale", "Demo", "Demo Return", "Adjusted", "Transferred"],
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    returnDate: {
      type: Date, // For demo returns
    },
    returned: {
      type: Boolean, // For tracking pending demo returns
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockLedger", // Used in return references
    },
    // ✅ Location reference (rack-aware support)
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      default: null,
    },
  },
  { timestamps: true }
);

// ✅ Prevent model overwrite error in dev
export default mongoose.models.StockLedger ||
  mongoose.model("StockLedger", stockLedgerSchema);
