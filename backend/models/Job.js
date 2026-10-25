const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String, required: true },
    salary: { type: String, default: "Not Disclosed" },
    salaryRange: {
      type: String,
      enum: [
        "Not Disclosed",
        "0-3 LPA",
        "3-6 LPA",
        "6-10 LPA",
        "10-15 LPA",
        "15-25 LPA",
        "25+ LPA",
      ],
      default: "Not Disclosed",
    },
    skills: [{ type: String }],
    workType: {
      type: String,
      enum: ["Remote", "On-site", "Hybrid"],
      default: "On-site",
    },
    experienceRequired: {
      type: String,
      enum: ["Fresher", "0-1 years", "1-3 years", "3-5 years", "5+ years"],
      default: "Fresher",
    },
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deadline: { type: Date, default: null },
    status: { type: String, enum: ["active", "closed"], default: "active" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Job", jobSchema);
