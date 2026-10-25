const Job = require("../models/Job");

// Deadlines are calendar dates: "2026-10-25" from <input type="date"> is stored
// as 2026-10-25T00:00Z. A job stays open until the end of that date in
// APP_TIMEZONE (India by default), whatever time zone the server runs in.
const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";

const todayKey = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // "YYYY-MM-DD"

// Any deadline before this instant is a date that has fully passed.
const startOfToday = () => new Date(todayKey() + "T00:00:00.000Z");

const isDeadlinePassed = (deadline) => !!deadline && new Date(deadline) < startOfToday();

// Closed lazily on every job read instead of on a timer, so a sleeping
// free-tier server never shows stale jobs as open.
const autoCloseExpiredJobs = async () => {
  try {
    await Job.updateMany(
      { deadline: { $ne: null, $lt: startOfToday() }, status: { $ne: "closed" } },
      { $set: { status: "closed" } },
    );
  } catch (err) {
    console.log("Auto-close error:", err.message);
  }
};

module.exports = { APP_TIMEZONE, todayKey, startOfToday, isDeadlinePassed, autoCloseExpiredJobs };
