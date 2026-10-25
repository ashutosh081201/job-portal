const express = require("express");
const router = express.Router();
const {
  applyJob,
  applySavedResume,
  checkApplied,
  getApplicationsByJob,
  getMyApplications,
  updateStatus,
  withdrawApplication,
} = require("../controllers/application.controller");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const requireRole = require("../middleware/requireRole");

const jobseeker = [authMiddleware, requireRole("jobseeker")];
const recruiter = [authMiddleware, requireRole("recruiter")];

router.post("/apply", jobseeker, upload.single("resume"), applyJob);
router.post("/apply-saved", jobseeker, applySavedResume);

// ✅ MUST be before /:id/status — otherwise Express matches
// /check/:jobId as /:id and hits the wrong handler
router.get("/check/:jobId", authMiddleware, checkApplied);

router.get("/job/:jobId", recruiter, getApplicationsByJob);
router.get("/my", authMiddleware, getMyApplications);
router.put("/:id/status", recruiter, updateStatus);
router.delete("/:id/withdraw", authMiddleware, withdrawApplication);

module.exports = router;
