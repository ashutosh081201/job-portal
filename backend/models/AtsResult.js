const mongoose = require("mongoose");

const atsResultSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    jobDescription: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      required: true,
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
    },
    resumeName: {
      type: String,
      default: "My Resume",
    },
    // ✅ NEW — distinguishes manual JD checks from job-linked checks
    checkType: {
      type: String,
      enum: ["manual", "job"],
      default: "manual",
    },
    // ✅ NEW — only set for job-linked checks
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
    },
    // ✅ NEW — snapshots so history stays intact even if job is deleted
    jobTitle: {
      type: String,
      default: null,
    },
    companyName: {
      type: String,
      default: null,
    },
    feedback: {
      matchedKeywords: [String],
      missingKeywords: [String],
      strengths: [String],
      improvements: [String],
      summary: String,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AtsResult", atsResultSchema);
