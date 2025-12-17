import express from "express";
import { createStockIn, getAllStockIns } from "../controllers/stockInController.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

router.use(verifyToken);

// ✅ Excel Import + Normal create both can use same route:
router.post("/", createStockIn);

// Report
router.get("/", getAllStockIns);

export default router;
