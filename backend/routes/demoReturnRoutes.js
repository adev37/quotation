import express from "express";
import {
  getPendingDemoReturns,
  returnDemoBatch, // ✅ Used with fallback _id
  getAllDemoReturns,
  getDemoReturnReport,
} from "../controllers/demoController.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

// 🔐 Apply token verification middleware to all routes
router.use(verifyToken);

// 📦 GET: All pending demo returns (grouped fallback if stockOutNo is missing)
router.get("/", getPendingDemoReturns);

// 🔄 POST: Mark return using fallback _id (since stockOutNo was removed)
// router.post("/return-batch/by-id/:fallbackId", returnDemoBatch); // ✅ Updated route
router.post("/return/:id", returnDemoBatch); // return single item using _id

// ✅ GET: All completed demo returns (IN entries)
router.get("/completed", getAllDemoReturns);

// 📊 GET: Full report (OUTs and returns status)
router.get("/report", getDemoReturnReport);

export default router;
