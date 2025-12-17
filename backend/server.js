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

/**
 * ✅ CORS FIX (Production + Dev)
 * - Allows your deployed UI: https://inventoryappui.vercel.app
 * - Allows Vite dev: http://localhost:5173
 * - Handles preflight OPTIONS properly
 *
 * NOTE:
 * If you have a different UI domain, add it below.
 */
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://inventoryappui.vercel.app", // ✅ YOUR FRONTEND DEPLOYED URL
]);

const corsOptions = {
  origin: (origin, cb) => {
    // Allow server-to-server / Postman / curl (no Origin header)
    if (!origin) return cb(null, true);

    // Allow exact allowed origins
    if (allowedOrigins.has(origin)) return cb(null, true);

    // OPTIONAL: Allow Vercel preview deployments of your UI
    // Example: https://inventoryappui-git-branchname-yourname.vercel.app
    // If you want this, keep it. If not, remove it.
    if (/^https:\/\/inventoryappui-.*\.vercel\.app$/i.test(origin)) {
      return cb(null, true);
    }

    return cb(new Error("CORS blocked for origin: " + origin), false);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false, // ✅ you are using Bearer token, cookies not required
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // ✅ IMPORTANT for preflight

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

/**
 * ✅ Vercel serverless note:
 * - On Vercel, @vercel/node will handle the server.
 * - For local dev, app.listen is needed.
 */
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

export default app;
