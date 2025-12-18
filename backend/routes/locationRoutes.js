import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import {
  getLocations,
  createLocation,
  deleteLocation,
} from "../controllers/locationController.js";

const router = express.Router();
router.use(verifyToken);

// ✅ /api/locations?warehouse=<warehouseId>
router.get("/", getLocations);

// ✅ create rack with warehouse
router.post("/", createLocation);

router.delete("/:id", deleteLocation);

export default router;
