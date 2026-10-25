const Job = require("../models/Job");
const Application = require("../models/Application");
const SavedJob = require("../models/SavedJob");
const cleanupCloudinaryFile = require("../utils/cloudinaryCleanup");
const { autoCloseExpiredJobs } = require("../utils/deadline");
const { sendError, escapeRegex } = require("../utils/http");

const LOCATION_ALIASES = {
  bengaluru: "bengaluru|bangalore",
  bangalore: "bengaluru|bangalore",
  blr: "bengaluru|bangalore",
  gurugram: "gurugram|gurgaon",
  gurgaon: "gurugram|gurgaon",
  ggn: "gurugram|gurgaon",
  delhi: "delhi|new delhi|delhi ncr",
  "new delhi": "delhi|new delhi|delhi ncr",
  "delhi ncr": "delhi|new delhi|delhi ncr",
  ncr: "delhi|new delhi|delhi ncr",
};

const getLocationRegex = (location) => {
  const key = location.toLowerCase().trim();
  return LOCATION_ALIASES[key] || escapeRegex(location);
};

// Whole-skill match: "Java" must not match "JavaScript", and "C++" / "C#" must
// still match even though \b does not fire after "+" or "#".
const skillRegex = (skill) =>
  new RegExp("(^|[^\\w])" + escapeRegex(skill.trim()) + "($|[^\\w+#])", "i");

const inferSalaryRange = (salary) => {
  if (!salary || salary === "Not Disclosed") return "Not Disclosed";
  const match = salary.match(/\d+(\.\d+)?/);
  const num = match ? parseFloat(match[0]) : null;
  if (!num) return "Not Disclosed";
  if (num < 3) return "0-3 LPA";
  if (num < 6) return "3-6 LPA";
  if (num < 10) return "6-10 LPA";
  if (num < 15) return "10-15 LPA";
  if (num < 25) return "15-25 LPA";
  return "25+ LPA";
};

const createJob = async (req, res) => {
  try {
    const {
      title,
      description,
      company,
      location,
      salary,
      salaryRange,
      skills,
      workType,
      experienceRequired,
      deadline,
    } = req.body;
    if (!title?.trim())
      return res.status(400).json({ message: "Job title is required" });
    if (!description?.trim())
      return res.status(400).json({ message: "Job description is required" });
    if (!company?.trim())
      return res.status(400).json({ message: "Company name is required" });
    if (!location?.trim())
      return res.status(400).json({ message: "Location is required" });
    const job = await Job.create({
      title: title.trim(),
      description: description.trim(),
      company: company.trim(),
      location: location.trim(),
      salary: salary || "Not Disclosed",
      salaryRange: salaryRange || "Not Disclosed",
      skills,
      workType: workType || "On-site",
      experienceRequired: experienceRequired || "Fresher",
      recruiterId: req.user.id,
      deadline: deadline ? new Date(deadline) : null,
      status: "active",
    });
    res.status(201).json({ success: true, job });
  } catch (error) {
    sendError(res, error);
  }
};

const getAllJobs = async (req, res) => {
  try {
    await autoCloseExpiredJobs();
    const {
      skills,
      location,
      workType,
      experienceRequired,
      search,
      salaryRange,
      excludeRecruiter,
      excludeJobIds,
    } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = { status: { $ne: "closed" } };

    if (skills) {
      const skillsArray = String(skills)
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);
      query.skills = { $in: skillsArray.map(skillRegex) };
    }
    if (location)
      query.location = { $regex: getLocationRegex(String(location)), $options: "i" };
    if (workType) query.workType = String(workType);
    if (experienceRequired) query.experienceRequired = String(experienceRequired);
    if (search) {
      const escaped = escapeRegex(search);
      query.$or = [
        { title: { $regex: escaped, $options: "i" } },
        { company: { $regex: escaped, $options: "i" } },
        { skills: skillRegex(String(search)) },
      ];
    }
    if (excludeRecruiter) query.recruiterId = { $ne: String(excludeRecruiter) };
    if (excludeJobIds) {
      const ids = String(excludeJobIds)
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id);
      if (ids.length > 0) query._id = { $nin: ids };
    }

    let jobs = await Job.find(query)
      .populate("recruiterId", "name email")
      .sort({ createdAt: -1, _id: -1 });

    if (salaryRange) {
      jobs = jobs.filter((job) => {
        if (job.salaryRange === salaryRange) return true;
        if (job.salary && inferSalaryRange(job.salary) === salaryRange)
          return true;
        return false;
      });
    }

    const jobsWithCount = await Promise.all(
      jobs.map(async (job) => {
        const count = await Application.countDocuments({ jobId: job._id });
        return { ...job.toObject(), applicationCount: count };
      }),
    );

    const totalJobs = jobsWithCount.length;
    const totalPages = Math.ceil(totalJobs / limit);
    const paginated = jobsWithCount.slice(skip, skip + limit);
    res.json({
      success: true,
      jobs: paginated,
      totalJobs,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    sendError(res, error);
  }
};

const getJobById = async (req, res) => {
  try {
    await autoCloseExpiredJobs();
    const job = await Job.findById(req.params.id).populate(
      "recruiterId",
      "name email",
    );
    if (!job) return res.status(404).json({ message: "Job not found" });
    const count = await Application.countDocuments({ jobId: req.params.id });
    res.json({
      success: true,
      job: { ...job.toObject(), applicationCount: count },
    });
  } catch (error) {
    sendError(res, error);
  }
};

const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.recruiterId.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    // collect Cloudinary URLs before deleting
    const applications = await Application.find({
      jobId: req.params.id,
    }).select("resumeUrl");
    const resumeUrls = [
      ...new Set(applications.map((a) => a.resumeUrl).filter(Boolean)),
    ];

    // delete applications from DB
    await Application.deleteMany({ jobId: req.params.id });

    // clean up Cloudinary files that are now unreferenced
    for (const url of resumeUrls) {
      await cleanupCloudinaryFile(url);
    }

    // ✅ delete saved job records referencing this job
    await SavedJob.deleteMany({ jobId: req.params.id });

    await job.deleteOne();
    res.json({ success: true, message: "Job deleted" });
  } catch (error) {
    sendError(res, error);
  }
};

const updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.recruiterId.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });
    const {
      title,
      description,
      company,
      location,
      salary,
      salaryRange,
      skills,
      workType,
      experienceRequired,
      deadline,
      status,
    } = req.body;
    job.title = title || job.title;
    job.description = description || job.description;
    job.company = company || job.company;
    job.location = location || job.location;
    job.salary = salary || job.salary;
    job.salaryRange = salaryRange || job.salaryRange;
    job.skills = skills || job.skills;
    job.workType = workType || job.workType;
    job.experienceRequired = experienceRequired || job.experienceRequired;
    job.deadline =
      deadline !== undefined
        ? deadline
          ? new Date(deadline)
          : null
        : job.deadline;
    if (status && ["active", "closed"].includes(status)) job.status = status;
    await job.save();
    res.json({ success: true, job });
  } catch (error) {
    sendError(res, error);
  }
};

const toggleJobStatus = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.recruiterId.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });
    job.status = job.status === "active" ? "closed" : "active";
    await job.save();
    res.json({ success: true, job, newStatus: job.status });
  } catch (error) {
    sendError(res, error);
  }
};

const getMyJobs = async (req, res) => {
  try {
    await autoCloseExpiredJobs();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const skip = (page - 1) * limit;
    const hasApplicants = req.query.hasApplicants === "true";
    const statusFilter = req.query.status;

    let query = { recruiterId: req.user.id };

    if (statusFilter === "active") {
      query.status = { $ne: "closed" };
    } else if (statusFilter === "closed") {
      query.status = "closed";
    }

    if (hasApplicants) {
      const recruiterJobIds = await Job.distinct("_id", {
        recruiterId: req.user.id,
      });
      const jobIdsWithApps = await Application.distinct("jobId", {
        jobId: { $in: recruiterJobIds },
      });
      query._id = { $in: jobIdsWithApps };
    }

    const totalJobs = await Job.countDocuments(query);
    const totalPages = Math.ceil(totalJobs / limit) || 1;
    const jobs = await Job.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit);

    const jobsWithCount = await Promise.all(
      jobs.map(async (job) => {
        const count = await Application.countDocuments({ jobId: job._id });
        return { ...job.toObject(), applicationCount: count };
      }),
    );

    res.json({
      success: true,
      jobs: jobsWithCount,
      totalJobs,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    sendError(res, error);
  }
};

module.exports = {
  createJob,
  getAllJobs,
  getJobById,
  deleteJob,
  updateJob,
  getMyJobs,
  toggleJobStatus,
};
