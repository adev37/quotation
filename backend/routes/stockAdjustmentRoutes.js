import express from "express";
import {
  createStockAdjustment,
  getAllStockAdjustments,
} from "../controllers/stockAdjustmentController.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

router.use(verifyToken);

router.post("/", createStockAdjustment);
router.get("/", getAllStockAdjustments);

export default router;
