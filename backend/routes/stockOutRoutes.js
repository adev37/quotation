// backend/routes/stockOutRoutes.js
import express from "express";
import {
  createStockOut,
  getAllStockOuts,
  getPendingDemoReturns,
  getStockOutChallan,
} from "../controllers/stockOutController.js";

import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();
router.use(verifyToken);

router.post("/", createStockOut);
router.get("/", getAllStockOuts);
router.get("/demo-returns", getPendingDemoReturns);
router.get("/challan/:stockOutNo", getStockOutChallan);

export default router;
