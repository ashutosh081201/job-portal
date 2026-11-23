const { app, request, useTestDb, signup, auth, createJob, freezeClock } = require("./helpers");
const Application = require("../models/Application");
const Job = require("../models/Job");

useTestDb();

describe("recruiter applicant list: status filter and counts across all pages [BUG-D]", () => {
  const setup = async () => {
    const recruiter = await signup("recruiter");
    const job = await createJob(recruiter);
    const statuses = ["pending", "pending", "pending", "reviewed", "shortlisted", "pending", "rejected", "pending", "pending", "shortlisted"];
    for (let i = 0; i < statuses.length; i++) {
      const s = await signup("jobseeker");
      await Application.create({ jobId: job._id, userId: s.id, resumeUrl: "/resume/view/x", status: statuses[i] });
    }
    return { recruiter, job };
  };
  const list = (r, job, q = "") => request(app).get(`/api/applications/job/${job._id}?limit=4${q}`).set(auth(r)).expect(200);

  test("counts cover every applicant, whatever page is shown", async () => {
    const { recruiter, job } = await setup();
    const p1 = await list(recruiter, job, "&page=1");
    const p3 = await list(recruiter, job, "&page=3");
    const expected = { all: 10, pending: 6, reviewed: 1, shortlisted: 2, rejected: 1 };
    expect(p1.body.statusCounts).toEqual(expected);
    expect(p3.body.statusCounts).toEqual(expected);
    expect(p1.body.applications).toHaveLength(4);
  });

  test("status filter returns matches from all pages, with totals for that status", async () => {
    const { recruiter, job } = await setup();
    const res = await list(recruiter, job, "&status=shortlisted");
    expect(res.body.applications.map((a) => a.status)).toEqual(["shortlisted", "shortlisted"]);
    expect(res.body).toMatchObject({ totalApplications: 2, totalPages: 1 });
    const pending = await list(recruiter, job, "&status=pending&page=2");
    expect(pending.body.totalApplications).toBe(6);
    expect(pending.body.applications).toHaveLength(2);
    expect(pending.body.applications.every((a) => a.status === "pending")).toBe(true);
  });

  test("status=all or no status lists everyone; an unknown status is a 400", async () => {
    const { recruiter, job } = await setup();
    expect((await list(recruiter, job, "&status=all")).body.totalApplications).toBe(10);
    const bad = await request(app).get(`/api/applications/job/${job._id}?status=hired`).set(auth(recruiter));
    expect(bad.status).toBe(400);
  });
});

describe("deadlines in the API [NOTE-E]", () => {
  test("creating a job with a past deadline is rejected; today and future are fine", async () => {
    freezeClock("2026-11-23T06:00:00Z"); // 11:30 IST on 23 Nov
    const r = await signup("recruiter");
    const res = await request(app).post("/api/jobs/create").set(auth(r))
      .send({ title: "T", description: "D", company: "C", location: "L", deadline: "2026-11-22" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot be in the past/);
    await createJob(r, { deadline: "2026-11-23" });
    await createJob(r, { deadline: "2026-12-01" });
  });

  test("an invalid deadline is a 400", async () => {
    const r = await signup("recruiter");
    const res = await request(app).post("/api/jobs/create").set(auth(r))
      .send({ title: "T", description: "D", company: "C", location: "L", deadline: "not-a-date" });
    expect(res.status).toBe(400);
  });

  test("editing: a changed deadline can't be in the past, but other edits on an expired job still work", async () => {
    freezeClock("2026-11-20T06:00:00Z");
    const r = await signup("recruiter");
    const job = await createJob(r, { deadline: "2026-11-21" });
    jest.setSystemTime(new Date("2026-11-25T06:00:00Z")); // the deadline has passed

    const moved = await request(app).put("/api/jobs/" + job._id).set(auth(r)).send({ deadline: "2026-11-24" });
    expect(moved.status).toBe(400);

    // the edit form always resends the existing deadline; that must not block other changes
    const renamed = await request(app).put("/api/jobs/" + job._id).set(auth(r))
      .send({ title: "Renamed", deadline: "2026-11-21" });
    expect(renamed.status).toBe(200);
    expect((await Job.findById(job._id)).title).toBe("Renamed");

    const extended = await request(app).put("/api/jobs/" + job._id).set(auth(r)).send({ deadline: "2026-12-05" });
    expect(extended.status).toBe(200);
  });
});
