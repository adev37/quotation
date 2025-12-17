import express from "express";
import { getStockLedger } from "../controllers/stockLedgerController.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

// 🔒 All routes below require authentication
router.use(verifyToken);

// 📄 GET: Full stock ledger report
router.get("/", getStockLedger);

export default router;
