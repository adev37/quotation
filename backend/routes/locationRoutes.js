import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import multer from "multer";

import {
  getLocations,                 // (raw list if you still want)
  getGroupedLocationsPaged,     // ✅ NEW: paginated grouped racks
  createLocation,               // ✅ ALWAYS all warehouses
  importLocationsExcel,         // ✅ NEW: Excel import
  updateLocation,
  updateLocationByName,
  deleteLocation,
  deleteLocationByName,
} from "../controllers/locationController.js";

const router = express.Router();
router.use(verifyToken);

// multer (memory) for excel upload
const upload = multer({ storage: multer.memoryStorage() });

/**
 * ✅ IMPORTANT: static routes MUST come before "/:id"
 */

// ✅ NEW: paginated grouped racks
// GET /api/locations/grouped?page=1&limit=10&search=
router.get("/grouped", getGroupedLocationsPaged);

// ✅ Excel import
// POST /api/locations/import (form-data: file)
router.post("/import", upload.single("file"), importLocationsExcel);

// ✅ Edit All (by rack name)
router.put("/by-name/:name", updateLocationByName);

// ✅ Delete All (by rack name)
router.delete("/by-name/:name", deleteLocationByName);

// ✅ Raw list (optional)
// GET /api/locations?warehouse=<warehouseId>
router.get("/", getLocations);

// ✅ Create rack (always in all warehouses)
router.post("/", createLocation);

// ✅ Single doc update/delete
router.put("/:id", updateLocation);
router.delete("/:id", deleteLocation);

export default router;
