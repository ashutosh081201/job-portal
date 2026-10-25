// Runs in the real process (not the per-file sandbox), so TZ actually applies.
// Defaults to UTC like Render; `npm run test:tz` overrides it to prove TZ-independence.
module.exports = async () => {
  process.env.TZ = process.env.TEST_TZ || "UTC";
};
