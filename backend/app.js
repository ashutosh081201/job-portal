const express = require("express");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");
const { sendError } = require("./utils/http");
const { corsOptions } = require("./utils/cors");

const app = express();

// Render (and most hosts) sit behind one proxy hop; without this every visitor
// shares the proxy's IP and the rate limiter locks everyone out together.
app.set("trust proxy", 1);

// rate limits are skipped under test so the suite can hit auth routes freely
const skipInTest = () => process.env.NODE_ENV === "test";

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many attempts, please try again in 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});

// CLIENT_URL lists the allowed origins (wildcards supported, see utils/cors.js).
// Unset means any origin, which is fine because auth uses bearer tokens, not cookies.
app.use(cors(corsOptions(process.env.CLIENT_URL)));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ limit: "2mb", extended: true }));

app.use("/api", generalLimiter);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authLimiter, require("./routes/auth.routes"));
app.use("/api/jobs", require("./routes/job.routes"));
app.use("/api/applications", require("./routes/application.routes"));
app.use("/api/resume", require("./routes/resume.routes"));
app.use("/api/ats", require("./routes/ats.routes"));
app.use("/api/saved-jobs", require("./routes/savedJob.routes"));

app.get("/", (req, res) => {
  res.json({ message: "Server is running" });
});

// For uptime checks and deploy verification: 200 only when MongoDB is connected.
app.get("/api/health", (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? "ok" : "degraded", db: dbUp ? "connected" : "disconnected" });
});

app.use("/api", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Errors passed to next(): uploads, malformed JSON bodies, anything unexpected.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "File is too large (max 5 MB)" : err.message;
    return res.status(400).json({ message });
  }
  if (err.message === "Only PDF files allowed") {
    return res.status(400).json({ message: "Only PDF files are allowed" });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Malformed JSON body" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body is too large" });
  }
  sendError(res, err);
});

module.exports = app;
