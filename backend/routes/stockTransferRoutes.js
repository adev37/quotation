import express from "express";
import {
  createStockTransfer,
  getAllTransfers,
  getAvailableTransferItems,
  fetchAvailableQty,
} from "../controllers/stockTransferController.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();
router.use(verifyToken);

// Existing routes
router.post("/", createStockTransfer);
router.get("/", getAllTransfers);
router.get("/available-stock-by-location", fetchAvailableQty);

// ✅ New helper route for Postman use
router.get("/available", getAvailableTransferItems);

export default router;
