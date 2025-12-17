// backend/routes/authRoutes.js

import express from "express";

// ✅ Import auth controller functions (case-sensitive)
import {
  signup,
  login,
  updateUser,
  userDetail,
} from "../controllers/authControllers.js";

// ✅ Import middleware
import verifyToken from "../middleware/verifyToken.js";
import {
  signupValidation,
  loginValidation,
} from "../middleware/authValidations.js";

const router = express.Router();

// 📌 Signup Route
router.post("/signup", signupValidation, signup);

// 📌 Login Route
router.post("/login", loginValidation, login);

// 📌 Update user (requires auth token)
router.put("/updateUser", verifyToken, updateUser);

// 📌 Get user details (requires auth token)
router.get("/userDetail", verifyToken, userDetail);

export default router;
