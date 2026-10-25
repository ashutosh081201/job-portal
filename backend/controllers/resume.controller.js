const Resume = require("../models/Resume");
const AtsResult = require("../models/AtsResult");
const Application = require("../models/Application");
const Job = require("../models/Job");
const { sendError } = require("../utils/http");

// The only fields a client may set; everything else (userId, timestamps) is ours.
const EDITABLE = ["personalInfo", "experience", "projects", "certifications", "achievements", "skills"];

const pickResumeFields = (body) => {
  const data = {};
  for (const key of EDITABLE) if (body[key] !== undefined) data[key] = body[key];
  data.name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "My Resume";
  data.education = cleanEducation(Array.isArray(body.education) ? body.education : []);
  return data;
};

const cleanEducation = (education = []) => {
  return education
    .filter((e) => {
      if (e.eduType === "school") return e.schoolName?.trim();
      return e.university?.trim() || e.degree?.trim();
    })
    .map((e) => {
      if (e.eduType === "school") {
        return {
          eduType: "school",
          schoolName: e.schoolName?.trim() || "",
          schoolType: e.schoolType?.trim() || "Senior Secondary",
          location: e.location?.trim() || "",
          startDate: e.startDate?.trim() || "",
          endDate: e.endDate?.trim() || "",
          marks: e.marks?.trim() || "",
          board: e.board?.trim() || "",
        };
      }
      return {
        eduType: "university",
        university: e.university?.trim() || "",
        degree: e.degree?.trim() || "",
        location: e.location?.trim() || "",
        startDate: e.startDate?.trim() || "",
        endDate: e.endDate?.trim() || "",
        gpa: e.gpa?.trim() || "",
      };
    });
};

const saveResume = async (req, res) => {
  try {
    const { resumeId } = req.body;
    const cleanedData = pickResumeFields(req.body);

    if (resumeId) {
      const resume = await Resume.findOneAndUpdate(
        { _id: resumeId, userId: req.user.id },
        cleanedData,
        { returnDocument: "after", runValidators: true },
      );
      if (!resume) return res.status(404).json({ message: "Resume not found" });
      return res.json({ success: true, resume });
    }

    const resume = await Resume.create({ ...cleanedData, userId: req.user.id });
    res.json({ success: true, resume });
  } catch (error) {
    sendError(res, error);
  }
};

const getMyResumes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    const totalResumes = await Resume.countDocuments({ userId: req.user.id });
    const totalPages = Math.ceil(totalResumes / limit);

    const resumes = await Resume.find({ userId: req.user.id })
      .sort({ updatedAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      resumes,
      totalResumes,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    sendError(res, error);
  }
};

const getMyResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({ userId: req.user.id }).sort({ updatedAt: -1, _id: -1 });
    if (!resume) return res.status(404).json({ message: "No resume found" });
    res.json({ success: true, resume });
  } catch (error) {
    sendError(res, error);
  }
};

const deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!resume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    // ✅ NEW — cascade delete: remove all ATS results tied to this resume
    await AtsResult.deleteMany({ resumeId: req.params.id });

    res.json({ success: true, message: "Resume deleted" });
  } catch (error) {
    sendError(res, error);
  }
};

// Owners can always view their resume. A recruiter can view it only when it
// was submitted to one of their jobs (applications store /resume/view/<id>).
const viewResume = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume) return res.status(404).json({ message: "Resume not found" });

    if (resume.userId.toString() !== req.user.id) {
      const myJobIds =
        req.user.role === "recruiter" ? await Job.distinct("_id", { recruiterId: req.user.id }) : [];
      const submittedToMe =
        myJobIds.length > 0 &&
        (await Application.exists({
          jobId: { $in: myJobIds },
          resumeUrl: `/resume/view/${resume._id}`,
        }));
      if (!submittedToMe) return res.status(403).json({ message: "You don't have access to this resume" });
    }

    res.json({ success: true, resume });
  } catch (error) {
    sendError(res, error);
  }
};

module.exports = {
  saveResume,
  getMyResumes,
  getMyResume,
  deleteResume,
  viewResume,
};
