// backend/routes/currentStockRoutes.js
import express from "express";
import {
  getCurrentStock,
  getDashboardStats,
  getStockByItemWarehouseRack,
  getAvailableStockLocations,
} from "../controllers/currentStockController.js";

import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();
router.use(verifyToken);

// report
router.get("/", getCurrentStock);

// dashboard
router.get("/summary", getDashboardStats);

// id-based qty lookup
router.get("/available-stock-by-location", getStockByItemWarehouseRack);

// ✅ rack dropdown options (MERGED by rack name)
router.get("/rack-options", getAvailableStockLocations);

export default router;
