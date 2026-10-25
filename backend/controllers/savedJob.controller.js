const SavedJob = require("../models/SavedJob");
const Job = require("../models/Job");
const { autoCloseExpiredJobs } = require("../utils/deadline");
const { sendError } = require("../utils/http");

const toggleSaveJob = async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ message: "Job ID is required" });
    const existing = await SavedJob.findOne({ userId: req.user.id, jobId });
    if (existing) {
      await existing.deleteOne();
      return res.json({ success: true, saved: false });
    }
    // unsaving always works; saving needs the job to exist
    if (!(await Job.exists({ _id: jobId })))
      return res.status(404).json({ message: "Job not found" });
    await SavedJob.create({ userId: req.user.id, jobId });
    res.json({ success: true, saved: true });
  } catch (error) {
    sendError(res, error);
  }
};

const getSavedJobs = async (req, res) => {
  try {
    await autoCloseExpiredJobs();

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // ✅ fetch ALL saved jobs first so we can filter and clean orphans
    const allSaved = await SavedJob.find({ userId: req.user.id })
      .populate({
        path: "jobId",
        populate: { path: "recruiterId", select: "name email" },
      })
      .sort({ createdAt: -1, _id: -1 });

    // ✅ find orphaned records where job was deleted
    const orphanedIds = allSaved.filter((s) => !s.jobId).map((s) => s._id);

    // ✅ auto-delete orphaned records so count stays accurate going forward
    if (orphanedIds.length > 0) {
      await SavedJob.deleteMany({ _id: { $in: orphanedIds } });
    }

    // ✅ only keep valid ones where job still exists
    const valid = allSaved.filter((s) => s.jobId);

    // ✅ paginate from valid results only
    const skip = (page - 1) * limit;
    const total = valid.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = valid.slice(skip, skip + limit);

    res.json({
      success: true,
      savedJobs: paginated,
      // ✅ total now reflects valid jobs only — not raw DB count
      total,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    sendError(res, error);
  }
};

const getSavedJobIds = async (req, res) => {
  try {
    const savedJobs = await SavedJob.find({ userId: req.user.id }).select(
      "jobId",
    );
    const jobIds = savedJobs.map((s) => s.jobId.toString());
    res.json({ success: true, jobIds });
  } catch (error) {
    sendError(res, error);
  }
};

module.exports = { toggleSaveJob, getSavedJobs, getSavedJobIds };
