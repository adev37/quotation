import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    modelNo: { type: String, required: true, trim: true },
    companyName: { type: String, required: true, trim: true },

    minStockAlert: { type: Number, default: 5, min: 0 },
    description: { type: String, trim: true },
    category: { type: String, trim: true },
    unit: { type: String, trim: true },
  },
  { timestamps: true }
);

// ✅ normalize always (save + update)
itemSchema.pre("save", function (next) {
  if (this.name) this.name = this.name.trim();
  if (this.modelNo) this.modelNo = this.modelNo.trim().toUpperCase();
  if (this.companyName) this.companyName = this.companyName.trim().toUpperCase();
  next();
});

// ✅ ONLY RULE: prevent exact same (company + model + name)
itemSchema.index(
  { companyName: 1, modelNo: 1, name: 1 },
  { unique: true }
);

// ✅ optional (NON-unique) for searching
itemSchema.index({ companyName: 1, modelNo: 1 });

const Item = mongoose.models.Item || mongoose.model("Item", itemSchema);
export default Item;
