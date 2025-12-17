// backend/controllers/stockOutController.js
import StockOut from "../models/StockOut.js";
import StockLedger from "../models/StockLedger.js";
import mongoose from "mongoose";
import { PDFDocument, StandardFonts } from "pdf-lib";

const drawWrappedCell = (
  page,
  text,
  x,
  y,
  width,
  height,
  font,
  fontSize,
  align = "left"
) => {
  page.drawRectangle({ x, y: y - height, width, height, borderWidth: 1 });

  const padding = 4;
  const maxWidth = width - padding * 2;

  const words = String(text ?? "").split(" ");
  const lines = [];
  let current = "";

  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    const testWidth = font.widthOfTextAtSize(test, fontSize);
    if (testWidth <= maxWidth) current = test;
    else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);

  const lineHeight = fontSize + 2;
  const totalTextHeight = lines.length * lineHeight;
  let textY = y - (height - totalTextHeight) / 2 - fontSize;

  for (const line of lines) {
    const lineWidth = font.widthOfTextAtSize(line, fontSize);
    let textX = x + padding;

    if (align === "center") textX = x + (width - lineWidth) / 2;
    if (align === "right") textX = x + width - padding - lineWidth;

    page.drawText(line, { x: textX, y: textY, size: fontSize, font });
    textY -= lineHeight;
  }
};

// ✅ helper: get merged available qty by RACK NAME (handles duplicate Location docs)
const getMergedRackAvailability = async ({ itemId, warehouseId, locationId }) => {
  // Step 1: find rack name for selected locationId
  const locNameAgg = await StockLedger.aggregate([
    {
      $match: {
        item: itemId,
        warehouse: warehouseId,
        location: locationId,
      },
    },
    {
      $lookup: {
        from: "locations",
        localField: "location",
        foreignField: "_id",
        as: "loc",
      },
    },
    { $unwind: { path: "$loc", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        locName: {
          $cond: [
            { $ifNull: ["$loc.name", false] },
            { $toUpper: { $trim: { input: "$loc.name" } } },
            null,
          ],
        },
      },
    },
    { $limit: 1 },
  ]);

  const locName = locNameAgg?.[0]?.locName;

  // If we can't determine name (rare), fallback to id-only sum
  if (!locName) {
    const idOnlyAgg = await StockLedger.aggregate([
      { $match: { item: itemId, warehouse: warehouseId, location: locationId } },
      { $group: { _id: null, quantity: { $sum: "$quantity" } } },
    ]);
    return idOnlyAgg?.[0]?.quantity ?? 0;
  }

  // Step 2: sum across ALL locationIds having same normalized rack name
  const mergedAgg = await StockLedger.aggregate([
    { $match: { item: itemId, warehouse: warehouseId, location: { $ne: null } } },
    {
      $lookup: {
        from: "locations",
        localField: "location",
        foreignField: "_id",
        as: "loc",
      },
    },
    { $unwind: { path: "$loc", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        locationName: {
          $cond: [
            { $ifNull: ["$loc.name", false] },
            { $toUpper: { $trim: { input: "$loc.name" } } },
            "—",
          ],
        },
      },
    },
    { $match: { locationName: locName } },
    { $group: { _id: "$locationName", quantity: { $sum: "$quantity" } } },
  ]);

  return mergedAgg?.[0]?.quantity ?? 0;
};

export const createStockOut = async (req, res) => {
  try {
    const { items, purpose, reason, tenderNo, date, returnDate } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items provided." });
    }
    if (!purpose) {
      return res.status(400).json({ message: "Purpose is required." });
    }

    const stockOutNo = `SO-${Date.now()}`;
    const createdEntries = [];
    const ledgerEntries = [];

    for (const entry of items) {
      const { item, warehouse, quantity, location } = entry;

      if (!item || !warehouse || quantity == null) {
        return res
          .status(400)
          .json({ message: "Item, warehouse and quantity are required." });
      }

      if (!location || !mongoose.Types.ObjectId.isValid(location)) {
        return res.status(400).json({
          message:
            "Rack/Location is required for Stock Out. Please select a rack.",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(item) || !mongoose.Types.ObjectId.isValid(warehouse)) {
        return res.status(400).json({ message: "Invalid item or warehouse id" });
      }

      const itemId = new mongoose.Types.ObjectId(item);
      const warehouseId = new mongoose.Types.ObjectId(warehouse);
      const locationId = new mongoose.Types.ObjectId(location);

      const qty = Number(quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({ message: "Quantity must be > 0" });
      }

      // ✅ IMPORTANT: merged availability check (by rack name)
      const availableQty = await getMergedRackAvailability({
        itemId,
        warehouseId,
        locationId,
      });

      if (availableQty < qty) {
        return res.status(400).json({
          message: `Insufficient stock in selected rack. Available: ${availableQty}`,
        });
      }

      const stockOut = await StockOut.create({
        stockOutNo,
        item: itemId,
        warehouse: warehouseId,
        location: locationId,
        quantity: qty,
        date: date ? new Date(date) : new Date(),
        returnDate:
          purpose === "Demo"
            ? returnDate
              ? new Date(returnDate)
              : null
            : null,
        reason,
        tenderNo,
        purpose,
        returnProcessed: false,
      });

      createdEntries.push(stockOut);

      const ledger = await StockLedger.create({
        stockOutNo,
        item: itemId,
        warehouse: warehouseId,
        location: locationId,
        quantity: -Math.abs(qty),
        action: "OUT",
        type: "Out",
        purpose,
        returned: false,
        returnDate:
          purpose === "Demo"
            ? returnDate
              ? new Date(returnDate)
              : null
            : null,
        date: date ? new Date(date) : new Date(),
        remarks: reason,
      });

      ledgerEntries.push(ledger);
    }

    return res.status(201).json({
      message: "✅ Stock Out recorded!",
      stockOutNo,
      createdEntries,
      ledgerEntries,
    });
  } catch (error) {
    console.error("❌ Error in createStockOut:", error);
    return res.status(500).json({ message: "❌ Failed to create Stock Out." });
  }
};

export const getAllStockOuts = async (req, res) => {
  try {
    const entries = await StockOut.find()
      .populate("item", "name modelNo")
      .populate("warehouse", "name")
      .populate("location", "name")
      .sort({ date: -1 });

    res.status(200).json(entries);
  } catch (error) {
    console.error("❌ Error in getAllStockOuts:", error);
    res.status(500).json({ message: "Failed to fetch stock out records" });
  }
};

export const getPendingDemoReturns = async (req, res) => {
  try {
    const demoItems = await StockOut.find({
      purpose: "Demo",
      returnProcessed: false,
      returnDate: { $exists: true, $ne: null },
    })
      .populate("item", "name modelNo")
      .populate("warehouse", "name")
      .populate("location", "name")
      .sort({ returnDate: 1 })
      .select("stockOutNo item warehouse location quantity date returnDate");

    res.status(200).json(demoItems);
  } catch (error) {
    console.error("❌ Error in getPendingDemoReturns:", error);
    res.status(500).json({ message: "Failed to fetch demo returns" });
  }
};

export const getStockOutChallan = async (req, res) => {
  try {
    const { stockOutNo } = req.params;

    const outEntries = await StockOut.find({ stockOutNo })
      .populate("item", "name modelNo")
      .lean();

    if (!outEntries?.length) {
      return res.status(404).json({ message: "Challan not found." });
    }

    const { date } = outEntries[0];

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const cols = [
      { title: "Sr.", width: 50, align: "center" },
      { title: "Item Name", width: 420, align: "left" },
      { title: "Qty", width: 60, align: "center" },
    ];

    const tableX = 60;
    let y = 740;
    const fontSize = 11;
    const lineHeight = fontSize + 2;

    page.drawText("CHALLAN", {
      x: (595 - boldFont.widthOfTextAtSize("CHALLAN", 22)) / 2,
      y: 800,
      size: 22,
      font: boldFont,
    });

    page.drawText(`Challan No: ${stockOutNo}`, {
      x: tableX,
      y: 775,
      size: 12,
      font: regularFont,
    });

    const dateStr = `Date: ${
      date ? new Date(date).toISOString().split("T")[0] : "-"
    }`;
    const totalTableWidth = cols.reduce((a, c) => a + c.width, 0);
    const dateWidth = regularFont.widthOfTextAtSize(dateStr, 12);

    page.drawText(dateStr, {
      x: tableX + totalTableWidth - dateWidth,
      y: 775,
      size: 12,
      font: regularFont,
    });

    let cx = tableX;
    const headerHeight = 24;
    for (const col of cols) {
      drawWrappedCell(
        page,
        col.title,
        cx,
        y,
        col.width,
        headerHeight,
        boldFont,
        12,
        col.align
      );
      cx += col.width;
    }
    y -= headerHeight;

    let totalQty = 0;
    const rows = outEntries.map((entry, idx) => {
      const itemName = `${entry.item?.name || ""} (${
        entry.item?.modelNo || ""
      })`;
      return [String(idx + 1), itemName, `${entry.quantity}`];
    });

    for (const row of rows) {
      const rowHeight = row.reduce((h, text, i) => {
        const lines = Math.ceil(
          String(text).length / (cols[i].width / (fontSize * 0.55))
        );
        return Math.max(h, lines * lineHeight + 8);
      }, 0);

      let colX = tableX;
      row.forEach((text, i) => {
        drawWrappedCell(
          page,
          text,
          colX,
          y,
          cols[i].width,
          rowHeight,
          regularFont,
          fontSize,
          cols[i].align
        );
        colX += cols[i].width;
      });

      totalQty += Number(row[2]) || 0;
      y -= rowHeight;
    }

    drawWrappedCell(page, "", tableX, y, cols[0].width, 24, regularFont, fontSize);
    drawWrappedCell(
      page,
      "Total",
      tableX + cols[0].width,
      y,
      cols[1].width,
      24,
      boldFont,
      fontSize,
      "center"
    );
    drawWrappedCell(
      page,
      `${totalQty}`,
      tableX + cols[0].width + cols[1].width,
      y,
      cols[2].width,
      24,
      boldFont,
      fontSize,
      "center"
    );

    y -= 60;
    page.drawText("Signature:", { x: tableX, y, size: 13, font: regularFont });
    page.drawLine({
      start: { x: tableX + 75, y: y + 3 },
      end: { x: tableX + 210, y: y + 3 },
      thickness: 1,
    });
    page.drawLine({
      start: { x: tableX + totalTableWidth - 145, y: y + 3 },
      end: { x: tableX + totalTableWidth, y: y + 3 },
      thickness: 1,
    });

    const pdfBytes = await pdfDoc.save();
    res.json({ challan: Buffer.from(pdfBytes).toString("base64"), stockOutNo });
  } catch (error) {
    console.error("❌ Error in getStockOutChallan:", error);
    res.status(500).json({ message: "Failed to generate challan" });
  }
};
