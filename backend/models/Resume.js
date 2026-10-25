const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      default: "My Resume",
    },
    personalInfo: {
      name: String,
      email: String,
      phone: String,
      linkedin: String,
      github: String,
    },
    education: [
      {
        eduType: {
          type: String,
          enum: ["university", "school"],
          default: "university",
        },
        // university fields
        university: String,
        degree: String,
        gpa: String,
        // school fields
        schoolName: String,
        schoolType: String,
        marks: String,
        board: String,
        // common fields
        location: String,
        startDate: String,
        endDate: String,
      },
    ],
    experience: [
      {
        company: String,
        role: String,
        location: String,
        startDate: String,
        endDate: String,
        bullets: [String],
      },
    ],
    projects: [
      {
        name: String,
        techStack: String,
        url: String, // ← KEY FIX: was missing, Mongoose was silently dropping project URLs
        bullets: [String],
      },
    ],
    certifications: [
      {
        name: String,
        issuer: String,
        date: String,
        url: String,
      },
    ],
    achievements: [
      {
        title: String,
        description: String,
      },
    ],
    skills: {
      languages: String,
      frameworks: String,
      tools: String,
      libraries: String,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Resume", resumeSchema);
