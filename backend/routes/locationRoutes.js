import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import {
  getLocations,
  createLocation,
  updateLocation,
  updateLocationByName,
  deleteLocation,
  deleteLocationByName,
} from "../controllers/locationController.js";

const router = express.Router();
router.use(verifyToken);

// GET /api/locations?warehouse=<warehouseId>
router.get("/", getLocations);

// POST /api/locations  (warehouse can be "ALL" or id)
router.post("/", createLocation);

// PUT /api/locations/:id
router.put("/:id", updateLocation);

// PUT /api/locations/by-name/:name (Edit All)
router.put("/by-name/:name", updateLocationByName);

// DELETE /api/locations/:id
router.delete("/:id", deleteLocation);

// DELETE /api/locations/by-name/:name (Delete All)
router.delete("/by-name/:name", deleteLocationByName);

export default router;
