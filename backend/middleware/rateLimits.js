const crypto = require("crypto");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const WINDOW_MS = 15 * 60 * 1000;

const common = { windowMs: WINDOW_MS, standardHeaders: true, legacyHeaders: false };

// Who an auth request is about: the email in the body (login, sign-up, OTP,
// password reset) or, for signed-in actions, the session token.
const accountOf = (req) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (email) return "email:" + email;
  const token = req.headers.authorization?.split(" ")[1];
  if (token) return "session:" + crypto.createHash("sha256").update(token).digest("hex").slice(0, 16);
  return "anonymous";
};

// Pass `skip` to switch limits off (the test suite does, except in the rate-limit tests).
const createRateLimiters = ({ skip = () => false } = {}) => ({
  general: rateLimit({
    ...common,
    limit: 200,
    message: { message: "Too many requests, please try again later" },
    skip,
  }),

  // Auth limits count only FAILED requests, so normal use never hits them.
  // Per account: 10 failures on one email from one network locks just that
  // email there. That stops password and OTP guessing without locking out
  // everyone else on a shared Wi-Fi, and an attacker elsewhere cannot lock
  // the real owner out.
  authPerAccount: rateLimit({
    ...common,
    limit: 10,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => ipKeyGenerator(req.ip) + "|" + accountOf(req),
    message: { message: "Too many attempts, please try again in 15 minutes" },
    skip,
  }),

  // Per network: a looser cap on failures across all accounts, against one
  // source trying many different emails.
  authPerNetwork: rateLimit({
    ...common,
    limit: 50,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => ipKeyGenerator(req.ip),
    message: { message: "Too many failed attempts from your network, please try again in 15 minutes" },
    skip,
  }),
});

module.exports = { createRateLimiters };
