export const inferSalaryRange = (text) => {
  if (!text) return "Not Disclosed";
  const match = text.match(/\d+(\.\d+)?/);
  const num = match ? parseFloat(match[0]) : null;
  if (!num) return "Not Disclosed";
  if (num < 3) return "0-3 LPA";
  if (num < 6) return "3-6 LPA";
  if (num < 10) return "6-10 LPA";
  if (num < 15) return "10-15 LPA";
  if (num < 25) return "15-25 LPA";
  return "25+ LPA";
};

// A deadline is a calendar date ("2026-10-25", stored by the API at UTC midnight).
// Jobs stay open until the end of that date in India time, the same rule the
// server uses, so every viewer sees the same status whatever their time zone.
export const APP_TIMEZONE = "Asia/Kolkata";

const keyInZone = (date, timeZone) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date); // "YYYY-MM-DD"

export const todayKey = () => keyInZone(new Date(), APP_TIMEZONE);

// "2026-10-25" or "2026-10-25T00:00:00.000Z" -> "2026-10-25"; null if unparseable
export const deadlineKey = (deadline) => {
  const d = new Date(deadline);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

const daysBetween = (fromKey, toKey) => Math.round((Date.parse(toKey) - Date.parse(fromKey)) / 864e5);

export const formatDeadline = (deadline, withYear = true) => {
  const key = deadlineKey(deadline);
  if (!key) return "";
  // format the calendar date itself, not the viewer's local view of UTC midnight
  return new Date(key + "T00:00:00Z").toLocaleDateString("en-IN", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    ...(withYear && { year: "numeric" }),
  });
};

export const isDeadlinePast = (deadline) => {
  const key = deadline ? deadlineKey(deadline) : null;
  return !!key && key < todayKey();
};

// JobCard (compact) and JobDetail (verbose) word the same states differently
const LABELS = {
  card: { closed: "Closed", passed: "Expired", withYear: false },
  detail: { closed: "This job is closed", passed: "Deadline passed", withYear: true },
};

export const getDeadlineInfo = (deadline, status, variant = "card") => {
  const labels = LABELS[variant];
  if (status === "closed") return { text: labels.closed, color: "#ef4444", isClosed: true };
  const key = deadline ? deadlineKey(deadline) : null;
  if (!key) return null;
  const daysLeft = daysBetween(todayKey(), key);
  if (daysLeft < 0) return { text: labels.passed, color: "#ef4444", isClosed: true };
  if (daysLeft === 0) return { text: "Closes today", color: "#ef4444", isClosed: false };
  if (daysLeft <= 3)
    return {
      text: "Closes in " + daysLeft + (daysLeft === 1 ? " day" : " days"),
      color: "#f59e0b",
      isClosed: false,
    };
  return {
    text: "Closes " + formatDeadline(key, labels.withYear),
    color: "#64748b",
    isClosed: false,
  };
};
