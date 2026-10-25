const express = require("express");
const router = express.Router();
const {
  saveResume,
  getMyResumes,
  getMyResume,
  deleteResume,
  viewResume,
} = require("../controllers/resume.controller");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/save", authMiddleware, saveResume);
router.get("/all", authMiddleware, getMyResumes);
router.get("/my", authMiddleware, getMyResume);
router.get("/view/:id", authMiddleware, viewResume);
router.delete("/:id", authMiddleware, deleteResume);

module.exports = router;
