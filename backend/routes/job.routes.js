const express = require("express");
const router = express.Router();
const {
  createJob,
  getAllJobs,
  getJobById,
  deleteJob,
  updateJob,
  getMyJobs,
  toggleJobStatus,
} = require("../controllers/job.controller");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");

const recruiter = [authMiddleware, requireRole("recruiter")];

router.get("/", getAllJobs);
router.get("/recruiter/myjobs", recruiter, getMyJobs);
router.get("/:id", getJobById);
router.post("/create", recruiter, createJob);
router.put("/:id/status", recruiter, toggleJobStatus);
router.put("/:id", recruiter, updateJob);
router.delete("/:id", recruiter, deleteJob);

module.exports = router;
