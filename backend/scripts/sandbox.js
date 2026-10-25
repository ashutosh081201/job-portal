// Local sandbox: runs the real API against a throwaway in-memory MongoDB with
// email, Cloudinary and Gemini replaced by local fakes. Never reads .env and
// needs no accounts. Data disappears when the process stops.
//   npm run sandbox   ->  API on http://localhost:5050
const fs = require("fs");
const os = require("os");
const path = require("path");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { MongoMemoryServer } = require("mongodb-memory-server");

const PORT = Number(process.env.SANDBOX_PORT) || 5050;
const FILES = fs.mkdtempSync(path.join(os.tmpdir(), "jobverse-sandbox-"));

Object.assign(process.env, {
  JWT_SECRET: crypto.randomBytes(32).toString("hex"),
  EMAIL_USER: "sandbox@jobverse.local",
  GEMINI_API_KEY: "sandbox",
});

// ── fakes (patched before the app loads its modules) ─────────────────────────
require("nodemailer").createTransport = () => ({
  sendMail: async (m) => {
    const otp = (m.text || "").match(/OTP is: (\d{6})/);
    console.log(`[mail] to=${m.to} subject="${m.subject}"${otp ? " OTP=" + otp[1] : ""}`);
  },
});

require("cloudinary").v2.uploader.upload = async (dataUri, opts) => {
  const file = `${opts.public_id}.pdf`;
  fs.writeFileSync(path.join(FILES, file), Buffer.from(dataUri.split(",")[1], "base64"));
  return { secure_url: `http://localhost:${PORT}/sandbox-files/${file}`, public_id: opts.public_id };
};
require("cloudinary").v2.uploader.destroy = async () => ({ result: "ok" });

// keyword-overlap stand-in for Gemini so the ATS screens have real-looking numbers
require("@google/generative-ai").GoogleGenerativeAI = class {
  getGenerativeModel() {
    return {
      generateContent: async (prompt) => {
        const [, resume = "", jd = ""] = prompt.match(/RESUME:([\s\S]*)JOB DESCRIPTION:([\s\S]*)Return ONLY/) || [];
        const words = (s) => new Set(s.toLowerCase().match(/[a-z][a-z.+#]{2,}/g) || []);
        const stop = new Set(["the", "and", "with", "for", "you", "our", "are", "will", "who", "that", "this", "have", "from"]);
        const jdWords = [...words(jd)].filter((w) => !stop.has(w));
        const have = words(resume);
        const matched = jdWords.filter((w) => have.has(w));
        const missing = jdWords.filter((w) => !have.has(w));
        const score = Math.round((100 * matched.length) / Math.max(jdWords.length, 1));
        const body = {
          score,
          matchedKeywords: matched.slice(0, 10),
          missingKeywords: missing.slice(0, 10),
          strengths: ["(sandbox) keyword overlap only"],
          improvements: missing.slice(0, 3).map((w) => `Mention ${w} if you have used it`),
          summary: `Sandbox score: ${matched.length} of ${jdWords.length} job-description keywords found in the resume.`,
        };
        return { response: { text: () => JSON.stringify(body) } };
      },
    };
  }
};

// ── seed data ────────────────────────────────────────────────────────────────
// Demo logins for the sandbox only (password for all: see DEMO_PASSWORD).
const DEMO_PASSWORD = "Demo@1234";
const seed = async () => {
  const User = require("../models/User");
  const Job = require("../models/Job");
  const Resume = require("../models/Resume");
  const Application = require("../models/Application");
  const SavedJob = require("../models/SavedJob");

  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  const recruiter = await User.create({ name: "Riya Recruiter", email: "recruiter@demo.local", password, role: "recruiter", isVerified: true });
  const recruiter2 = await User.create({ name: "Karan Hiring", email: "recruiter2@demo.local", password, role: "recruiter", isVerified: true });
  const seeker = await User.create({ name: "Sam Seeker", email: "seeker@demo.local", password, role: "jobseeker", isVerified: true });

  const today = new Date().toISOString().slice(0, 10);
  const inDays = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  const desc = (role, stack) =>
    `We are looking for a ${role} to join a small product team. You will design, build and ship features using ${stack}, ` +
    "write tests, review pull requests, and work closely with design and product. Good communication and ownership matter more than years.";

  const jobs = await Job.create([
    { title: "MERN Stack Developer", company: "Zeta Labs", location: "Bengaluru", salary: "8 LPA", salaryRange: "6-10 LPA", skills: ["React", "Node.js", "MongoDB", "Express"], workType: "Hybrid", experienceRequired: "1-3 years", recruiterId: recruiter._id, deadline: inDays(20), description: desc("MERN stack developer", "React, Node.js, Express and MongoDB") },
    { title: "Frontend Engineer (React)", company: "Zeta Labs", location: "Remote", salary: "12 LPA", salaryRange: "10-15 LPA", skills: ["React", "TypeScript", "CSS"], workType: "Remote", experienceRequired: "3-5 years", recruiterId: recruiter._id, deadline: today, description: desc("frontend engineer", "React, TypeScript and modern CSS") },
    { title: "Backend Intern", company: "Zeta Labs", location: "Pune", salary: "Not Disclosed", skills: ["Node.js", "SQL"], workType: "On-site", experienceRequired: "Fresher", recruiterId: recruiter._id, deadline: inDays(2), description: desc("backend intern", "Node.js and SQL") },
    { title: "Java Developer", company: "Acme Corp", location: "Gurgaon", salary: "15 LPA", salaryRange: "15-25 LPA", skills: ["Java", "Spring Boot", "MySQL"], workType: "On-site", experienceRequired: "3-5 years", recruiterId: recruiter2._id, deadline: null, description: desc("Java developer", "Java, Spring Boot and MySQL") },
    { title: "C++ Systems Engineer", company: "Acme Corp", location: "Hyderabad", salary: "20 LPA", skills: ["C++", "Linux"], workType: "On-site", experienceRequired: "5+ years", recruiterId: recruiter2._id, deadline: inDays(30), description: desc("systems engineer", "C++ on Linux") },
    { title: "Data Analyst (closed)", company: "Acme Corp", location: "Mumbai", salary: "6 LPA", skills: ["SQL", "Excel"], workType: "Remote", experienceRequired: "0-1 years", recruiterId: recruiter2._id, deadline: inDays(-3), description: desc("data analyst", "SQL and Excel") },
  ]);

  const resume = await Resume.create({
    userId: seeker._id,
    name: "MERN Resume",
    personalInfo: { name: "Sam Seeker", email: "seeker@demo.local", phone: "+91 90000 00000", linkedin: "linkedin.com/in/sam-seeker", github: "github.com/sam-seeker" },
    education: [{ eduType: "university", university: "Demo Institute of Technology", degree: "B.Tech, Computer Science", location: "Pune", startDate: "2021", endDate: "2025", gpa: "8.4" }],
    experience: [{ company: "Startup Co", role: "Full Stack Intern", location: "Remote", startDate: "Jan 2025", endDate: "Jun 2025", bullets: ["Built REST APIs with Node.js and Express backed by MongoDB", "Wrote React components and tests for the dashboard"] }],
    projects: [{ name: "JobVerse", techStack: "React, Node.js, Express, MongoDB", url: "github.com/sam-seeker/jobverse", bullets: ["Job portal with resume builder and ATS checker"] }],
    skills: { languages: "JavaScript, SQL", frameworks: "React, Express", tools: "Git, Postman", libraries: "Mongoose, Axios" },
  });

  await Application.create([
    { jobId: jobs[3]._id, userId: seeker._id, resumeUrl: `/resume/view/${resume._id}`, status: "shortlisted" },
    { jobId: jobs[4]._id, userId: seeker._id, resumeUrl: `/resume/view/${resume._id}`, status: "reviewed" },
  ]);
  await SavedJob.create({ userId: seeker._id, jobId: jobs[0]._id });

  console.log(`[sandbox] seeded 3 users, ${jobs.length} jobs. Demo logins: recruiter@demo.local, recruiter2@demo.local, seeker@demo.local (password in scripts/sandbox.js)`);
};

(async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  await require("../config/db")();
  await seed();

  const express = require("express");
  const app = require("../app");
  app.use("/sandbox-files", express.static(FILES));
  app.listen(PORT, () => console.log(`[sandbox] API on http://localhost:${PORT} (in-memory DB, fake mail/AI/uploads)`));

  const stop = async () => {
    await mongod.stop();
    fs.rmSync(FILES, { recursive: true, force: true });
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
})();
