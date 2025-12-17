import Item from "../models/Item.js";

// ➕ Create item
export const createItem = async (req, res) => {
  try {
    let { name, modelNo, companyName, minStockAlert, description, category, unit } =
      req.body;

    if (!name || !modelNo || !companyName) {
      return res.status(400).json({
        message: "name, modelNo, companyName are required.",
      });
    }

    // Normalize
    name = name.trim();
    modelNo = modelNo.trim().toUpperCase();
    companyName = companyName.trim().toUpperCase();

    const newItem = await Item.create({
      name,
      modelNo,
      companyName,
      minStockAlert: Number(minStockAlert || 5),
      description,
      category,
      unit,
    });

    return res.status(201).json({
      message: "✅ Item created successfully",
      item: newItem,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message:
          "❌ Duplicate item not allowed. Same Company + Model No + Item Name already exists.",
      });
    }

    console.error("❌ Error creating item:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// 📥 Get all items
export const getAllItems = async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✏️ Update item
export const updateItem = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await Item.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) return res.status(404).json({ message: "Item not found" });

    res.json({ message: "✅ Item updated successfully", item: updated });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message:
          "❌ Duplicate item not allowed. Same Company + Model No + Item Name already exists.",
      });
    }

    res.status(500).json({ message: "Failed to update item" });
  }
};

// ❌ Delete item
export const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    await Item.findByIdAndDelete(id);
    res.json({ message: "✅ Item deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete item" });
  }
};

export const importItemsExcel = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items provided for import." });
    }

    const results = [];
    let importedCount = 0;
    let skippedDuplicatesCount = 0;
    let errorCount = 0;

    for (let i = 0; i < items.length; i++) {
      const it = items[i] || {};
      const rowNo = Number(it._row || i + 2); // Excel row (default assumes header row is 1)

      // Normalize
      const name = String(it.name || "").trim();
      const modelNo = String(it.modelNo || "").trim().toUpperCase();
      const companyName = String(it.companyName || "").trim().toUpperCase();

      const minStockAlertRaw = it.minStockAlert;
      const minStockAlert =
        minStockAlertRaw === "" || minStockAlertRaw === null || minStockAlertRaw === undefined
          ? 5
          : Number(minStockAlertRaw);

      const category = String(it.category || "").trim();
      const unit = String(it.unit || "").trim();
      const description = String(it.description || "").trim();

      // ✅ validations (detailed)
      const rowErrors = [];
      if (!name) rowErrors.push("Item Name is required.");
      if (!modelNo) rowErrors.push("Model No is required.");
      if (!companyName) rowErrors.push("Company is required.");
      if (Number.isNaN(minStockAlert) || minStockAlert < 0) {
        rowErrors.push("Min Stock Alert must be a number >= 0.");
      }

      if (rowErrors.length) {
        errorCount++;
        results.push({
          row: rowNo,
          status: "FAILED",
          message: rowErrors.join(" "),
          data: { name, modelNo, companyName },
        });
        continue;
      }

      // ✅ insert (catch duplicate)
      try {
        const created = await Item.create({
          name,
          modelNo,
          companyName,
          minStockAlert,
          category,
          unit,
          description,
        });

        importedCount++;
        results.push({
          row: rowNo,
          status: "IMPORTED",
          message: "Inserted successfully.",
          data: { _id: created._id, name, modelNo, companyName },
        });
      } catch (err) {
        // Duplicate key
        if (err?.code === 11000) {
          skippedDuplicatesCount++;
          results.push({
            row: rowNo,
            status: "DUPLICATE",
            message:
              "Duplicate skipped: Same (Company + Model No + Item Name) already exists.",
            data: { name, modelNo, companyName },
          });
        } else {
          errorCount++;
          results.push({
            row: rowNo,
            status: "FAILED",
            message: err?.message || "Insert failed due to unknown error.",
            data: { name, modelNo, companyName },
          });
        }
      }
    }

    return res.status(201).json({
      message: `✅ Import finished. Imported: ${importedCount}, Duplicates skipped: ${skippedDuplicatesCount}, Errors: ${errorCount}`,
      importedCount,
      skippedDuplicatesCount,
      errorCount,
      results, // ✅ per-row report
    });
  } catch (error) {
    console.error("❌ Import error:", error);
    return res.status(500).json({ message: "Failed to import items." });
  }
};