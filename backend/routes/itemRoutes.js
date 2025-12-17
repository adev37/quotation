import express from "express";
import {
  createItem,
  getAllItems,
  updateItem,
  deleteItem,
  importItemsExcel,
} from "../controllers/itemController.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();
router.use(verifyToken);

router.post("/", createItem);
router.get("/", getAllItems);
router.put("/:id", updateItem);
router.delete("/:id", deleteItem);

// ✅ Excel import
router.post("/import", importItemsExcel);

export default router;
