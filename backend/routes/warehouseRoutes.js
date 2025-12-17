import express from "express";
import {
  createWarehouse,
  getAllWarehouses,
  updateWarehouse,
  deleteWarehouse,
} from "../controllers/warehouseController.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

router.use(verifyToken); // 🔒 All routes require token

// ➕ Create a warehouse
router.post("/", createWarehouse);

// 📄 Get all warehouses
router.get("/", getAllWarehouses);

// 🔄 Update warehouse by ID
router.put("/:id", updateWarehouse);

// 🗑️ Delete warehouse by ID
router.delete("/:id", deleteWarehouse);

export default router;
