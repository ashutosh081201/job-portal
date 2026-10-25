const express = require("express");
const router = express.Router();
const {
  register,
  verifyOTP,
  login,
  forgotPassword,
  verifyForgotOTP,
  resetPassword,
  resendOTP,
  updateProfile,
  changePassword,
  deleteAccount,
} = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/verify-otp", verifyOTP);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/verify-forgot-otp", verifyForgotOTP);
router.post("/reset-password", resetPassword);
router.post("/resend-otp", resendOTP);
router.put("/profile", authMiddleware, updateProfile);
router.put("/change-password", authMiddleware, changePassword);
router.delete("/delete-account", authMiddleware, deleteAccount);

module.exports = router;
