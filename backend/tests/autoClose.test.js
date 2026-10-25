// Expired jobs are closed lazily: every job read calls autoCloseExpiredJobs().
// Deadlines arrive from <input type="date"> as "YYYY-MM-DD" (stored at UTC midnight)
// and a job stays open until the end of that date in India time (UTC+5:30),
// i.e. it closes at 18:30 UTC on the deadline date. This must hold whatever the
// server's own TZ is: `npm run test:tz` re-runs this file in IST and New York.
const { app, request, useTestDb, signup, freezeClock, createJob } = require("./helpers");
const Job = require("../models/Job");

useTestDb();

const statusAt = async (deadline, nowIso) => {
  const r = await signup("recruiter");
  const job = await createJob(r, { deadline });
  freezeClock(nowIso);
  await request(app).get("/api/jobs").expect(200);
  return (await Job.findById(job._id)).status;
};

describe(`auto-close at date boundaries (server TZ=${process.env.TZ})`, () => {
  test.each([
    ["open on the deadline day until 23:59:59 IST", "2026-10-25", "2026-10-25T18:29:59Z", "active"],
    ["closes at midnight IST after the deadline day", "2026-10-25", "2026-10-25T18:30:00Z", "closed"],
    ["open early on the deadline day (00:30 IST)", "2026-10-25", "2026-10-24T19:00:00Z", "active"],
    ["month end, last second (IST)", "2026-10-31", "2026-10-31T18:29:59Z", "active"],
    ["month end, rolled over (IST)", "2026-10-31", "2026-10-31T18:30:00Z", "closed"],
    ["quarter end (Q1->Q2)", "2027-03-31", "2027-03-31T18:30:00Z", "closed"],
    ["year end, last second", "2026-12-31", "2026-12-31T18:29:59Z", "active"],
    ["year end, rolled over", "2026-12-31", "2026-12-31T18:30:00Z", "closed"],
    ["leap day", "2028-02-29", "2028-02-29T18:30:00Z", "closed"],
    ["no deadline never closes", null, "2099-01-01T00:00:00Z", "active"],
  ])("%s", async (_name, deadline, now, expected) => {
    expect(await statusAt(deadline, now)).toBe(expected);
  });

  test("closed jobs disappear from the public list, getJobById and saved-jobs also trigger the close", async () => {
    const r = await signup("recruiter");
    const job = await createJob(r, { deadline: "2026-10-25" });
    freezeClock("2026-10-26T08:00:00Z");
    const list = await request(app).get("/api/jobs").expect(200);
    expect(list.body.totalJobs).toBe(0);
    const one = await request(app).get("/api/jobs/" + job._id).expect(200);
    expect(one.body.job.status).toBe("closed");
  });

  test("a recruiter re-opening a past-deadline job is closed again on the next read", async () => {
    const r = await signup("recruiter");
    const job = await createJob(r, { deadline: "2026-10-25" });
    freezeClock("2026-10-27T00:00:00Z");
    await request(app).get("/api/jobs").expect(200);
    await Job.updateOne({ _id: job._id }, { status: "active" });
    await request(app).get("/api/jobs").expect(200);
    expect((await Job.findById(job._id)).status).toBe("closed");
  });
});
