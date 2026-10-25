const { GoogleGenerativeAI } = require("@google/generative-ai");
const Resume = require("../models/Resume");
const AtsResult = require("../models/AtsResult");
const Job = require("../models/Job");
const { HttpError, sendError } = require("../utils/http");

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = Number(process.env.ATS_RETRY_BASE_MS ?? 800);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Rate limits and "model overloaded" errors are common on the free tier and
// usually clear within a second or two, so those (and network blips) are retried.
const isTransient = (err) =>
  [429, 500, 502, 503, 504].includes(err?.status) ||
  /\b(429|500|502|503|504)\b|overloaded|unavailable|ECONNRESET|ETIMEDOUT|fetch failed/i.test(err?.message || "");

const isQuotaExhausted = (err) =>
  (err?.status === 429 || /\b429\b/.test(err?.message || "")) &&
  /quota|resource.?exhausted|limit: ?0/i.test(err?.message || "");

// wrong or retired model name, or a model this API key cannot use
const isModelUnavailable = (err) =>
  err?.status === 404 || /\b404\b.*not found|is not found for API version|not supported for generateContent/i.test(err?.message || "");

const asStringList = (value) =>
  Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];

// The model is asked for JSON, but its output is still untrusted input.
const parseAtsResponse = (rawText) => {
  const cleanText = String(rawText).replace(/```json/g, "").replace(/```/g, "").trim();
  let data;
  try {
    data = JSON.parse(cleanText);
  } catch {
    throw new HttpError(502, "The AI returned an unreadable result. Please try again.");
  }
  const score = Number(data?.score);
  if (!Number.isFinite(score)) {
    throw new HttpError(502, "The AI returned an unreadable result. Please try again.");
  }
  return {
    score: Math.round(Math.min(100, Math.max(0, score))),
    matchedKeywords: asStringList(data.matchedKeywords),
    missingKeywords: asStringList(data.missingKeywords),
    strengths: asStringList(data.strengths),
    improvements: asStringList(data.improvements),
    summary: typeof data.summary === "string" ? data.summary : "",
  };
};

// ✅ lazy initialization — same pattern as before, prevents crash on module load
let genAI = null;
const getGenAI = () => {
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI;
};

// ✅ shared helper — builds resume text for the AI prompt
const buildResumeText = (resume) => `
NAME: ${resume.personalInfo?.name || ""}
EMAIL: ${resume.personalInfo?.email || ""}
PHONE: ${resume.personalInfo?.phone || ""}
LINKEDIN: ${resume.personalInfo?.linkedin || ""}
GITHUB: ${resume.personalInfo?.github || ""}

EDUCATION:
${(resume.education || [])
  .map(
    (edu) => `
  ${edu.degree} from ${edu.university}, ${edu.location}
  ${edu.startDate} - ${edu.endDate}
  GPA: ${edu.gpa}
`,
  )
  .join("\n")}

EXPERIENCE:
${(resume.experience || [])
  .map(
    (exp) => `
  ${exp.role} at ${exp.company}, ${exp.location}
  ${exp.startDate} - ${exp.endDate}
  ${(exp.bullets || []).filter((b) => b).join(", ")}
`,
  )
  .join("\n")}

PROJECTS:
${(resume.projects || [])
  .map(
    (proj) => `
  ${proj.name} | ${proj.techStack}
  ${(proj.bullets || []).filter((b) => b).join(", ")}
`,
  )
  .join("\n")}

TECHNICAL SKILLS:
Languages: ${resume.skills?.languages || ""}
Frameworks: ${resume.skills?.frameworks || ""}
Tools: ${resume.skills?.tools || ""}
Libraries: ${resume.skills?.libraries || ""}

CERTIFICATIONS:
${(resume.certifications || [])
  .filter((c) => c.name)
  .map((c) => `${c.name} - ${c.issuer} (${c.date})`)
  .join("\n")}

ACHIEVEMENTS:
${(resume.achievements || [])
  .filter((a) => a.title)
  .map((a) => `${a.title} - ${a.description}`)
  .join("\n")}
`;

// ✅ shared helper — calls Gemini and parses JSON response
const runATSCheck = async (resumeText, jobDescription) => {
  const prompt = `
You are an expert ATS (Applicant Tracking System) analyzer.
Analyze this resume strictly against the exact job description provided below.
Only use keywords and requirements explicitly mentioned in the job description.
Do not assume or add requirements that are not in the job description.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Return ONLY a valid JSON object.
No extra text. No markdown. No code blocks.
Just pure JSON like this:
{
  "score": <number between 0 and 100>,
  "matchedKeywords": ["keyword1", "keyword2", "keyword3"],
  "missingKeywords": ["keyword1", "keyword2", "keyword3"],
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "summary": "2 line overall assessment of this resume for the job"
}
  `;

  const model = getGenAI().getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      temperature: 0.3,
      responseMimeType: "application/json",
    },
  });

  for (let attempt = 1; ; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return parseAtsResponse(result.response.text());
    } catch (err) {
      if (err.expose) throw err;
      // Gemini's errors carry the HTTP status and reason but never the API key
      console.error(
        `Gemini call failed (model ${GEMINI_MODEL}, attempt ${attempt}/${MAX_ATTEMPTS}):`,
        err?.status ?? "no status",
        String(err?.message || err).slice(0, 500),
      );
      // an exhausted quota will not recover in seconds, so don't retry it
      if (isQuotaExhausted(err)) {
        throw new HttpError(429, "The ATS checker has reached its AI usage limit for now. Please try again later.");
      }
      if (isModelUnavailable(err)) {
        throw new HttpError(502, "The ATS checker is temporarily unavailable. Please try again later.");
      }
      if (!isTransient(err)) throw err;
      if (attempt >= MAX_ATTEMPTS) {
        throw new HttpError(503, "The AI service is busy right now. Please try again in a minute.");
      }
      await sleep(RETRY_BASE_MS * 2 ** (attempt - 1));
    }
  }
};

// ── Manual ATS check — user pastes their own job description ─────────────────
// POST /api/ats/check
// body: { jobDescription, resumeId }
const checkATS = async (req, res) => {
  try {
    const { jobDescription, resumeId } = req.body;

    if (typeof jobDescription !== "string" || !jobDescription.trim()) {
      return res.status(400).json({ message: "Job description is required" });
    }
    if (jobDescription.trim().split(/\s+/).length < 20) {
      return res.status(400).json({
        message:
          "Please provide a more detailed job description (at least 20 words)",
      });
    }

    const query = resumeId
      ? { _id: resumeId, userId: req.user.id }
      : { userId: req.user.id };

    const resume = await Resume.findOne(query).sort({ updatedAt: -1, _id: -1 });
    if (!resume) {
      return res.status(404).json({
        message: "No resume found. Please build your resume first.",
      });
    }

    const atsResult = await runATSCheck(
      buildResumeText(resume),
      jobDescription,
    );

    await AtsResult.create({
      userId: req.user.id,
      jobDescription,
      score: atsResult.score,
      resumeId: resume._id,
      resumeName: resume.name || "My Resume",
      checkType: "manual",
      feedback: {
        matchedKeywords: atsResult.matchedKeywords,
        missingKeywords: atsResult.missingKeywords,
        strengths: atsResult.strengths,
        improvements: atsResult.improvements,
        summary: atsResult.summary,
      },
    });

    res.json({ success: true, data: atsResult });
  } catch (error) {
    sendError(res, error);
  }
};

// ── Job-linked ATS check — checks resume against a specific posted job ────────
// POST /api/ats/check-job
// body: { jobId, resumeId }
const checkATSForJob = async (req, res) => {
  try {
    const { jobId, resumeId } = req.body;

    if (!jobId) {
      return res.status(400).json({ message: "Job ID is required" });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    if (!job.description || job.description.trim().split(/\s+/).length < 20) {
      return res.status(400).json({
        message:
          "This job does not have a detailed enough description for ATS checking",
      });
    }

    const query = resumeId
      ? { _id: resumeId, userId: req.user.id }
      : { userId: req.user.id };

    const resume = await Resume.findOne(query).sort({ updatedAt: -1, _id: -1 });
    if (!resume) {
      return res.status(404).json({
        message: "No resume found. Please build your resume first.",
      });
    }

    const atsResult = await runATSCheck(
      buildResumeText(resume),
      job.description,
    );

    await AtsResult.create({
      userId: req.user.id,
      jobDescription: job.description,
      score: atsResult.score,
      resumeId: resume._id,
      resumeName: resume.name || "My Resume",
      checkType: "job",
      jobId: job._id,
      jobTitle: job.title,
      companyName: job.company,
      feedback: {
        matchedKeywords: atsResult.matchedKeywords,
        missingKeywords: atsResult.missingKeywords,
        strengths: atsResult.strengths,
        improvements: atsResult.improvements,
        summary: atsResult.summary,
      },
    });

    res.json({
      success: true,
      data: atsResult,
      job: { title: job.title, company: job.company },
    });
  } catch (error) {
    sendError(res, error);
  }
};

// ── Manual JD history ─────────────────────────────────────────────────────────
// GET /api/ats/history?page=1&limit=5
const getATSHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const query = { userId: req.user.id, checkType: "manual" };

    const totalHistory = await AtsResult.countDocuments(query);
    const totalPages = Math.ceil(totalHistory / limit);

    const history = await AtsResult.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      history,
      totalHistory,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    sendError(res, error);
  }
};

// ── Job-linked ATS history ────────────────────────────────────────────────────
// GET /api/ats/history/jobs?page=1&limit=5
const getATSJobHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const query = { userId: req.user.id, checkType: "job" };

    const totalHistory = await AtsResult.countDocuments(query);
    const totalPages = Math.ceil(totalHistory / limit);

    const history = await AtsResult.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      history,
      totalHistory,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    sendError(res, error);
  }
};

module.exports = { checkATS, checkATSForJob, getATSHistory, getATSJobHistory };
