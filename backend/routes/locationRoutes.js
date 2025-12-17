// backend/routes/locationRoutes.js
import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import {
  getLocations,
  createLocation,
  deleteLocation,
} from "../controllers/locationController.js";

const router = express.Router();
router.use(verifyToken);

// dropdown
router.get("/", getLocations);

// optional create/delete
router.post("/", createLocation);
router.delete("/:id", deleteLocation);

export default router;
