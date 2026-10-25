const Application = require("../models/Application");
const { sendOTPEmail } = require("../config/nodemailer");
const User = require("../models/User");
const Job = require("../models/Job");
const Resume = require("../models/Resume");
const mongoose = require("mongoose");
const cleanupCloudinaryFile = require("../utils/cloudinaryCleanup");
const { isDeadlinePassed } = require("../utils/deadline");
const { HttpError, sendError, escapeHtml } = require("../utils/http");

const STATUSES = Application.schema.path("status").enumValues;

// The job must exist and still be open before anyone can apply.
const findOpenJob = async (jobId) => {
  if (!jobId) throw new HttpError(400, "Job ID is required");
  const job = await Job.findById(jobId);
  if (!job) throw new HttpError(404, "Job not found");
  if (job.status === "closed" || isDeadlinePassed(job.deadline)) {
    throw new HttpError(400, "This job is no longer accepting applications");
  }
  return job;
};

// Only the recruiter who posted the job may see or change its applications.
const assertJobOwner = (job, userId) => {
  if (!job) throw new HttpError(404, "Job not found");
  const ownerId = job.recruiterId?._id || job.recruiterId;
  if (ownerId?.toString() !== userId) throw new HttpError(403, "Not authorized");
};

const sendNewApplicationEmail = async (jobId, applicantId) => {
  try {
    const job = await Job.findById(jobId).populate("recruiterId", "name email");
    const applicant = await User.findById(applicantId);
    if (job && job.recruiterId?.email) {
      await sendOTPEmail(
        job.recruiterId.email,
        null,
        `New Application - ${job.title}`,
        null,
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #2563eb; margin: 0;">Job<span style="color: #1d4ed8;">Verse</span></h2>
            </div>
            <h3 style="color: #1e293b;">New Application Received!</h3>
            <p style="color: #475569;">You have a new application for your job posting:</p>
            <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0 0 8px;"><strong>Job:</strong> ${escapeHtml(job.title)}</p>
              <p style="margin: 0 0 8px;"><strong>Applicant:</strong> ${escapeHtml(applicant?.name)}</p>
            </div>
            <p style="color: #475569;">Login to your dashboard to review the application.</p>
            <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px; text-align: center;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0 0 4px;">© 2026 JobVerse</p>
              <p style="color: #cbd5e1; font-size: 11px; margin: 0;">Made with ❤️ by Ashutosh</p>
            </div>
          </div>
        `,
      );
    }
  } catch (err) {
    console.log("New application email failed:", err.message);
  }
};

const applyJob = async (req, res) => {
  const resumeUrl = req.file?.path;
  try {
    if (!req.file)
      return res.status(400).json({ message: "Please upload a PDF file" });

    const { jobId } = req.body;
    await findOpenJob(jobId);
    const existing = await Application.findOne({ jobId, userId: req.user.id });
    if (existing)
      return res.status(400).json({ message: "Already applied to this job" });

    const application = await Application.create({
      jobId,
      userId: req.user.id,
      resumeUrl,
      status: "pending",
    });

    await sendNewApplicationEmail(jobId, req.user.id);
    res.status(201).json({ success: true, application });
  } catch (error) {
    sendError(res, error);
  } finally {
    // the PDF is uploaded before we know the application is valid; drop it if unused
    if (resumeUrl && !res.statusCode.toString().startsWith("2")) {
      await cleanupCloudinaryFile(resumeUrl);
    }
  }
};

const applySavedResume = async (req, res) => {
  try {
    const { jobId, resumeId } = req.body;
    await findOpenJob(jobId);
    const existing = await Application.findOne({ jobId, userId: req.user.id });
    if (existing)
      return res.status(400).json({ message: "Already applied to this job" });

    const query = resumeId
      ? { _id: resumeId, userId: req.user.id }
      : { userId: req.user.id };

    const resume = await Resume.findOne(query).sort({ updatedAt: -1, _id: -1 });
    if (!resume)
      return res
        .status(404)
        .json({ message: "Resume not found. Please build your resume first." });

    const resumeUrl = `/resume/view/${resume._id}`;
    const application = await Application.create({
      jobId,
      userId: req.user.id,
      resumeUrl,
      status: "pending",
    });

    await sendNewApplicationEmail(jobId, req.user.id);
    res.status(201).json({ success: true, application });
  } catch (error) {
    sendError(res, error);
  }
};

// ✅ NEW — checks if current user has applied to a specific job
// Direct DB lookup — not affected by pagination at all
// GET /api/applications/check/:jobId
const checkApplied = async (req, res) => {
  try {
    const existing = await Application.findOne({
      jobId: req.params.jobId,
      userId: req.user.id,
    });
    res.json({ success: true, applied: !!existing });
  } catch (error) {
    sendError(res, error);
  }
};

const getApplicationsByJob = async (req, res) => {
  try {
    assertJobOwner(await Job.findById(req.params.jobId), req.user.id);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalApplications = await Application.countDocuments({
      jobId: req.params.jobId,
    });
    const totalPages = Math.ceil(totalApplications / limit);

    const applications = await Application.find({ jobId: req.params.jobId })
      .populate("userId", "name email")
      .populate("jobId", "title company")
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      applications,
      totalApplications,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    sendError(res, error);
  }
};

const getMyApplications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const skip = (page - 1) * limit;
    const status = req.query.status;

    const query = { userId: req.user.id };
    if (status && status !== "all") query.status = status;

    const totalApplications = await Application.countDocuments(query);
    const totalPages = Math.ceil(totalApplications / limit);

    const applications = await Application.find(query)
      .populate("jobId", "title company location salary")
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit);

    const statusAgg = await Application.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const counts = {
      all: 0,
      pending: 0,
      reviewed: 0,
      shortlisted: 0,
      rejected: 0,
    };
    statusAgg.forEach(({ _id, count }) => {
      if (counts.hasOwnProperty(_id)) counts[_id] = count;
      counts.all += count;
    });

    res.json({
      success: true,
      applications,
      totalApplications,
      totalPages,
      currentPage: page,
      statusCounts: counts,
    });
  } catch (error) {
    sendError(res, error);
  }
};

const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!STATUSES.includes(status)) {
      throw new HttpError(400, `Status must be one of: ${STATUSES.join(", ")}`);
    }
    const application = await Application.findById(req.params.id).populate("jobId", "recruiterId");
    if (!application)
      return res.status(404).json({ message: "Application not found" });
    assertJobOwner(application.jobId, req.user.id);
    application.status = status;
    await application.save();
    application.depopulate("jobId");

    try {
      const populatedApp = await Application.findById(application._id)
        .populate("userId", "name email")
        .populate("jobId", "title company");

      if (populatedApp?.userId?.email) {
        await sendOTPEmail(
          populatedApp.userId.email,
          null,
          `Application Update - ${populatedApp.jobId?.title}`,
          null,
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h2 style="color: #2563eb; margin: 0;">Job<span style="color: #1d4ed8;">Verse</span></h2>
              </div>
              <h3 style="color: #1e293b;">Application Status Updated</h3>
              <p style="color: #475569;">Hi ${escapeHtml(populatedApp.userId.name)}, your application status has been updated:</p>
              <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0 0 8px;"><strong>Job:</strong> ${escapeHtml(populatedApp.jobId?.title)}</p>
                <p style="margin: 0 0 8px;"><strong>Company:</strong> ${escapeHtml(populatedApp.jobId?.company)}</p>
                <p style="margin: 0;"><strong>Status:</strong>
                  <span style="color: ${
                    status === "shortlisted"
                      ? "#22c55e"
                      : status === "rejected"
                        ? "#ef4444"
                        : status === "reviewed"
                          ? "#3b82f6"
                          : "#f59e0b"
                  }; font-weight: bold; text-transform: capitalize;">${status}</span>
                </p>
              </div>
              <p style="color: #475569;">Login to your dashboard to view more details.</p>
              <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px; text-align: center;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0 0 4px;">© 2026 JobVerse</p>
                <p style="color: #cbd5e1; font-size: 11px; margin: 0;">Made with ❤️ by Ashutosh</p>
              </div>
            </div>
          `,
        );
      }
    } catch (emailError) {
      console.log("Status email failed:", emailError.message);
    }

    res.json({ success: true, application });
  } catch (error) {
    sendError(res, error);
  }
};

const withdrawApplication = async (req, res) => {
  try {
    const application = await Application.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!application)
      return res.status(404).json({ message: "Application not found" });

    await application.deleteOne();
    await cleanupCloudinaryFile(application.resumeUrl);

    res.json({ success: true, message: "Application withdrawn successfully" });
  } catch (error) {
    sendError(res, error);
  }
};

module.exports = {
  applyJob,
  applySavedResume,
  checkApplied,
  getApplicationsByJob,
  getMyApplications,
  updateStatus,
  withdrawApplication,
};
