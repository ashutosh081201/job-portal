// Errors we create on purpose carry a status and a message that is safe to show.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.expose = true;
  }
}

// Turns any error into a JSON response: client mistakes become 4xx with a
// readable message, anything unexpected is logged and hidden behind a 500.
const sendError = (res, error) => {
  if (error.expose && error.status) {
    return res.status(error.status).json({ message: error.message });
  }
  if (error.name === "CastError") {
    const field = error.path === "_id" ? "id" : error.path;
    return res.status(400).json({ message: `Invalid ${field}` });
  }
  if (error.name === "ValidationError") {
    const message = Object.values(error.errors).map((e) => e.message).join(", ");
    return res.status(400).json({ message });
  }
  if (error.code === 11000) {
    return res.status(409).json({ message: "This record already exists" });
  }
  console.error(error);
  res.status(500).json({ message: "Something went wrong. Please try again." });
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = { HttpError, sendError, escapeHtml, escapeRegex };
