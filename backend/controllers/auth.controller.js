const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const generateOTP = require("../utils/generateOTP");
const { sendOTPEmail } = require("../config/nodemailer");
const Application = require("../models/Application");
const Resume = require("../models/Resume");
const AtsResult = require("../models/AtsResult");
const Job = require("../models/Job");
const SavedJob = require("../models/SavedJob");
const cleanupCloudinaryFile = require("../utils/cloudinaryCleanup");
const { HttpError, sendError } = require("../utils/http");

const MIN_PASSWORD = 6;
const OTP_TTL_MS = 10 * 60 * 1000;

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

// Emails are stored lowercase; the collation also finds accounts created
// before that rule, which may still have mixed case.
const findByEmail = (email) =>
  User.findOne({ email: normalizeEmail(email) }).collation({ locale: "en", strength: 2 });

const requirePassword = (password, label = "Password") => {
  if (typeof password !== "string" || password.length < MIN_PASSWORD) {
    throw new HttpError(400, `${label} must be at least ${MIN_PASSWORD} characters`);
  }
};

// An OTP only counts when one is pending, it matches exactly, and it has not expired.
const checkOtp = (user, otp) => {
  if (!user.otp?.code || !user.otp?.expiresAt) {
    throw new HttpError(400, "No OTP pending. Please request a new one.");
  }
  if (typeof otp !== "string" && typeof otp !== "number") throw new HttpError(400, "Invalid OTP");
  if (user.otp.code !== String(otp).trim()) throw new HttpError(400, "Invalid OTP");
  if (user.otp.expiresAt < new Date()) throw new HttpError(400, "OTP expired. Please resend.");
};

const sessionToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

// Reset tokens are signed with the current password hash mixed into the secret,
// so they stop working once the password changes (single use) and can never
// pass as a session token.
const resetSecret = (user) => process.env.JWT_SECRET + user.password;

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

const register = async (req, res) => {
  try {
    const { name, password, role } = req.body;
    const email = normalizeEmail(req.body.email);
    if (!name?.trim()) throw new HttpError(400, "Name is required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "A valid email is required");
    requirePassword(password);
    if (role !== undefined && !["jobseeker", "recruiter"].includes(role)) {
      throw new HttpError(400, "Role must be jobseeker or recruiter");
    }
    if (await findByEmail(email)) {
      return res.status(400).json({ message: "Email already registered" });
    }
    const otp = generateOTP();
    await User.create({
      name: name.trim(),
      email,
      password: await bcrypt.hash(password, 10),
      role,
      isVerified: false,
      otp: { code: otp, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    });
    await sendOTPEmail(email, otp, "Verify Your Email - JobVerse");
    res.status(201).json({
      success: true,
      message: "OTP sent to your email. Please verify.",
      email,
    });
  } catch (error) {
    sendError(res, error);
  }
};

const verifyOTP = async (req, res) => {
  try {
    const user = await findByEmail(req.body.email);
    if (!user) return res.status(404).json({ message: "User not found" });
    checkOtp(user, req.body.otp);
    user.isVerified = true;
    user.otp = undefined;
    await user.save();
    res.json({ success: true, token: sessionToken(user), user: publicUser(user) });
  } catch (error) {
    sendError(res, error);
  }
};

const login = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await findByEmail(req.body.email);
    if (!user || typeof password !== "string")
      return res.status(400).json({ message: "Invalid email or password" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });
    if (!user.isVerified) {
      return res
        .status(400)
        .json({ message: "Please verify your email first", email: user.email });
    }
    res.json({ success: true, token: sessionToken(user), user: publicUser(user) });
  } catch (error) {
    sendError(res, error);
  }
};

const issueOtp = async (user, subject) => {
  const otp = generateOTP();
  user.otp = { code: otp, expiresAt: new Date(Date.now() + OTP_TTL_MS) };
  await user.save();
  await sendOTPEmail(user.email, otp, subject);
};

const forgotPassword = async (req, res) => {
  try {
    const user = await findByEmail(req.body.email);
    if (!user) return res.status(404).json({ message: "Email not registered" });
    await issueOtp(user, "Reset Your Password - JobVerse");
    res.json({ success: true, message: "OTP sent to your email", email: user.email });
  } catch (error) {
    sendError(res, error);
  }
};

const verifyForgotOTP = async (req, res) => {
  try {
    const user = await findByEmail(req.body.email);
    if (!user) return res.status(404).json({ message: "User not found" });
    checkOtp(user, req.body.otp);
    user.otp = undefined;
    await user.save();
    const resetToken = jwt.sign({ id: user._id, purpose: "reset" }, resetSecret(user), {
      expiresIn: "15m",
    });
    res.json({ success: true, resetToken });
  } catch (error) {
    sendError(res, error);
  }
};

const resetPassword = async (req, res) => {
  const invalid = () =>
    res.status(400).json({ message: "Reset link is invalid or has expired. Please start again." });
  try {
    const { resetToken, newPassword } = req.body;
    requirePassword(newPassword, "New password");
    const claimed = typeof resetToken === "string" ? jwt.decode(resetToken) : null;
    if (!claimed?.id || claimed.purpose !== "reset") return invalid();
    const user = await User.findById(claimed.id);
    if (!user) return invalid();
    try {
      jwt.verify(resetToken, resetSecret(user));
    } catch {
      return invalid();
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    sendError(res, error);
  }
};

const resendOTP = async (req, res) => {
  try {
    const user = await findByEmail(req.body.email);
    if (!user) return res.status(404).json({ message: "User not found" });
    await issueOtp(user, "Your New OTP - JobVerse");
    res.json({ success: true, message: "New OTP sent to your email" });
  } catch (error) {
    sendError(res, error);
  }
};

// only the display name is editable; email and role are fixed
const updateProfile = async (req, res) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    if (!name) throw new HttpError(400, "Name is required");
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name },
      { returnDocument: "after", runValidators: true },
    ).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ success: true, user: publicUser(user) });
  } catch (error) {
    sendError(res, error);
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    requirePassword(newPassword, "New password");
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const isMatch =
      typeof currentPassword === "string" && (await bcrypt.compare(currentPassword, user.password));
    if (!isMatch)
      return res.status(400).json({ message: "Current password is incorrect" });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    sendError(res, error);
  }
};

const deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "jobseeker") {
      // ── JOBSEEKER cleanup ────────────────────────────────────────────────

      // 1. collect all Cloudinary PDF URLs from their applications
      const applications = await Application.find({
        userId: req.user.id,
      }).select("resumeUrl");
      const resumeUrls = [
        ...new Set(applications.map((a) => a.resumeUrl).filter(Boolean)),
      ];

      // 2. delete their applications from DB
      await Application.deleteMany({ userId: req.user.id });

      // 3. clean up Cloudinary files that are now unreferenced
      for (const url of resumeUrls) {
        await cleanupCloudinaryFile(url);
      }

      // 4. delete their resumes (JSON data in MongoDB)
      await Resume.deleteMany({ userId: req.user.id });

      // 5. delete their ATS results
      await AtsResult.deleteMany({ userId: req.user.id });

      // 6. delete their saved jobs
      await SavedJob.deleteMany({ userId: req.user.id });
    } else if (user.role === "recruiter") {
      // ── RECRUITER cleanup ────────────────────────────────────────────────

      // 1. find all jobs posted by this recruiter
      const recruiterJobs = await Job.find({ recruiterId: req.user.id }).select(
        "_id",
      );
      const jobIds = recruiterJobs.map((j) => j._id);

      if (jobIds.length > 0) {
        // 2. collect all Cloudinary PDF URLs from applications on their jobs
        const applications = await Application.find({
          jobId: { $in: jobIds },
        }).select("resumeUrl");
        const resumeUrls = [
          ...new Set(applications.map((a) => a.resumeUrl).filter(Boolean)),
        ];

        // 3. delete all applications on their jobs
        await Application.deleteMany({ jobId: { $in: jobIds } });

        // 4. clean up Cloudinary files that are now unreferenced
        for (const url of resumeUrls) {
          await cleanupCloudinaryFile(url);
        }

        // 5. delete saved job records referencing their jobs
        await SavedJob.deleteMany({ jobId: { $in: jobIds } });

        // 6. delete all their posted jobs
        await Job.deleteMany({ recruiterId: req.user.id });
      }
    }

    // ── delete the user account itself ──────────────────────────────────────
    await User.findByIdAndDelete(req.user.id);

    res.json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    sendError(res, error);
  }
};

module.exports = {
  register,
  verifyOTP,
  login,
  forgotPassword,
  verifyForgotOTP,
  resetPassword,
  resendOTP,
  updateProfile,
  changePassword,
  deleteAccount,
};
