const express = require("express");
const router = express.Router();
const {
  toggleSaveJob,
  getSavedJobs,
  getSavedJobIds,
} = require("../controllers/savedJob.controller");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/toggle", authMiddleware, toggleSaveJob);
router.get("/my", authMiddleware, getSavedJobs);
router.get("/ids", authMiddleware, getSavedJobIds);

module.exports = router;
