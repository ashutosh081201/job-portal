const { escapeRegex } = require("./http");

// CLIENT_URL is a comma-separated list of allowed origins. An entry may use "*"
// for one hostname label, e.g. "https://job-portal-*-apps-6474.vercel.app" to
// accept every Vercel deployment URL of this project. "*" never matches a dot,
// so a pattern cannot be stretched to cover another domain.
const parseAllowedOrigins = (value = "") =>
  value
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean)
    .map((o) =>
      o.includes("*")
        ? new RegExp("^" + o.split("*").map(escapeRegex).join("[a-z0-9-]+") + "$", "i")
        : o,
    );

const isAllowedOrigin = (origin, allowed) =>
  allowed.some((rule) => (rule instanceof RegExp ? rule.test(origin) : rule === origin));

// Options for the cors middleware; no CLIENT_URL means any origin may call the API.
const corsOptions = (clientUrl) => {
  const allowed = parseAllowedOrigins(clientUrl);
  if (!allowed.length) return {};
  return {
    origin: (origin, callback) => callback(null, !origin || isAllowedOrigin(origin, allowed)),
  };
};

module.exports = { parseAllowedOrigins, isAllowedOrigin, corsOptions };
