const express = require("express");
const router = express.Router();
const {
  checkATS,
  checkATSForJob,
  getATSHistory,
  getATSJobHistory,
} = require("../controllers/ats.controller");
const authMiddleware = require("../middleware/authMiddleware");

// manual JD check — user pastes their own job description
router.post("/check", authMiddleware, checkATS);

// job-linked check — checks resume against a specific JobVerse job
router.post("/check-job", authMiddleware, checkATSForJob);

// manual JD history
router.get("/history", authMiddleware, getATSHistory);

// job-linked history
router.get("/history/jobs", authMiddleware, getATSJobHistory);

module.exports = router;
