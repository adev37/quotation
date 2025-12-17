// backend/server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";

// routes
import itemRoutes from "./routes/itemRoutes.js";
import warehouseRoutes from "./routes/warehouseRoutes.js";
import stockInRoutes from "./routes/stockInRoutes.js";
import stockOutRoutes from "./routes/stockOutRoutes.js";
import stockLedgerRoutes from "./routes/stockLedgerRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import currentStockRoutes from "./routes/currentStockRoutes.js";
import demoReturnRoutes from "./routes/demoReturnRoutes.js";
import stockTransferRoutes from "./routes/stockTransferRoutes.js";
import stockAdjustmentRoutes from "./routes/stockAdjustmentRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";

dotenv.config();

const app = express();

// ✅ CORS (dev friendly)
app.use(
  cors({
    origin: [
      "http://localhost:5173", // Vite dev
      "http://127.0.0.1:5173",
    ],
    credentials: true,
  })
);

app.use(express.json());

// ✅ DB connect
await connectDB();

// ✅ routes
app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/stock-in", stockInRoutes);
app.use("/api/stock-out", stockOutRoutes);
app.use("/api/stock-ledger", stockLedgerRoutes);
app.use("/api/current-stock", currentStockRoutes);
app.use("/api/demo-returns", demoReturnRoutes);
app.use("/api/stock-transfers", stockTransferRoutes);
app.use("/api/stock-adjustments", stockAdjustmentRoutes);
app.use("/api/locations", locationRoutes);

// ✅ health check
app.get("/", (req, res) => res.send("Inventory Backend is running ✅"));

// ✅ 404
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// ✅ error handler
app.use((err, req, res, next) => {
  console.error("❌ Uncaught error:", err);
  res.status(500).json({ message: err.message || "Server Error" });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
