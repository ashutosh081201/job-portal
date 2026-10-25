const { app, request, useTestDb, signup, auth, createJob, jobPayload } = require("./helpers");
const Job = require("../models/Job");
const Application = require("../models/Application");
const SavedJob = require("../models/SavedJob");

useTestDb();

describe("create job", () => {
  test("recruiter creates a job; fields are trimmed and defaults applied", async () => {
    const r = await signup("recruiter");
    const res = await request(app)
      .post("/api/jobs/create")
      .set(auth(r))
      .send({ title: "  Dev  ", description: " d ", company: " Acme ", location: " Pune " })
      .expect(201);
    expect(res.body.job).toMatchObject({
      title: "Dev", description: "d", company: "Acme", location: "Pune",
      salary: "Not Disclosed", salaryRange: "Not Disclosed", workType: "On-site",
      experienceRequired: "Fresher", status: "active", deadline: null, recruiterId: r.id,
    });
  });

  test.each([
    ["title", "Job title is required"],
    ["description", "Job description is required"],
    ["company", "Company name is required"],
    ["location", "Location is required"],
  ])("missing %s -> 400", async (field, message) => {
    const r = await signup("recruiter");
    const res = await request(app)
      .post("/api/jobs/create")
      .set(auth(r))
      .send(jobPayload({ [field]: "   " }))
      .expect(400);
    expect(res.body.message).toBe(message);
  });

  test("requires auth", async () => {
    await request(app).post("/api/jobs/create").send(jobPayload()).expect(401);
  });

  test("recruiterId in the body is ignored", async () => {
    const r = await signup("recruiter");
    const other = await signup("recruiter");
    const job = await createJob(r, { recruiterId: other.id });
    expect(job.recruiterId).toBe(r.id);
  });

  test("a jobseeker cannot post jobs [BUG-7]", async () => {
    const s = await signup("jobseeker");
    const res = await request(app).post("/api/jobs/create").set(auth(s)).send(jobPayload());
    expect(res.status).toBe(403);
  });

  test("an invalid enum value returns 400, not 500 [BUG-2]", async () => {
    const r = await signup("recruiter");
    const res = await request(app)
      .post("/api/jobs/create")
      .set(auth(r))
      .send(jobPayload({ workType: "Moon" }));
    expect(res.status).toBe(400);
  });
});

describe("list and search jobs", () => {
  const seed = async () => {
    const r = await signup("recruiter");
    const a = await createJob(r, { title: "React Developer", company: "Zeta", location: "Bangalore", skills: ["React", "JavaScript"], workType: "Remote", salary: "12 LPA", salaryRange: "Not Disclosed" });
    const b = await createJob(r, { title: "Java Engineer", company: "Acme", location: "Gurgaon", skills: ["Java", "Spring"], workType: "On-site", experienceRequired: "3-5 years", salaryRange: "15-25 LPA" });
    const c = await createJob(r, { title: "Closed role", skills: ["Go"] });
    await Job.updateOne({ _id: c._id }, { status: "closed" });
    return { r, a, b, c };
  };
  const list = (q = "") => request(app).get("/api/jobs" + q).expect(200);

  test("public listing hides closed jobs and is newest first", async () => {
    const { a, b } = await seed();
    const res = await list();
    expect(res.body.jobs.map((j) => j._id)).toEqual([b._id, a._id]);
    expect(res.body.totalJobs).toBe(2);
    expect(res.body.jobs[0].recruiterId).toHaveProperty("email");
    expect(res.body.jobs[0].recruiterId).not.toHaveProperty("password");
  });

  test("search matches title, company or whole-word skill, case-insensitive", async () => {
    const { a, b } = await seed();
    expect((await list("?search=react")).body.jobs.map((j) => j._id)).toEqual([a._id]);
    expect((await list("?search=ACME")).body.jobs.map((j) => j._id)).toEqual([b._id]);
    expect((await list("?search=spring")).body.jobs.map((j) => j._id)).toEqual([b._id]);
    // "Java" must not match "JavaScript" as a skill, but does match the title "Java Engineer"
    expect((await list("?skills=Java")).body.jobs.map((j) => j._id)).toEqual([b._id]);
  });

  test("location aliases: Bengaluru finds Bangalore, Gurugram finds Gurgaon", async () => {
    const { a, b } = await seed();
    expect((await list("?location=Bengaluru")).body.jobs.map((j) => j._id)).toEqual([a._id]);
    expect((await list("?location=gurugram")).body.jobs.map((j) => j._id)).toEqual([b._id]);
  });

  test("filters by workType, experience, and salaryRange (inferred from free-text salary)", async () => {
    const { a, b } = await seed();
    expect((await list("?workType=Remote")).body.jobs.map((j) => j._id)).toEqual([a._id]);
    expect((await list("?experienceRequired=3-5%20years")).body.jobs.map((j) => j._id)).toEqual([b._id]);
    // a has salaryRange "Not Disclosed" but salary "12 LPA" -> inferred 10-15
    expect((await list("?salaryRange=10-15%20LPA")).body.jobs.map((j) => j._id)).toEqual([a._id]);
    expect((await list("?salaryRange=15-25%20LPA")).body.jobs.map((j) => j._id)).toEqual([b._id]);
  });

  test("salary inference bucket edges", async () => {
    const r = await signup("recruiter");
    const cases = { "2.9 LPA": "0-3 LPA", "3 LPA": "3-6 LPA", "9.99": "6-10 LPA", "10": "10-15 LPA", "24.5": "15-25 LPA", "25": "25+ LPA", "40 LPA": "25+ LPA" };
    for (const salary of Object.keys(cases)) await createJob(r, { title: salary, salary, salaryRange: "Not Disclosed" });
    for (const [salary, bucket] of Object.entries(cases)) {
      const titles = (await list("?limit=50&salaryRange=" + encodeURIComponent(bucket))).body.jobs.map((j) => j.title);
      expect(titles).toContain(salary);
    }
  });

  test("excludeRecruiter and excludeJobIds", async () => {
    const { r, a, b } = await seed();
    const r2 = await signup("recruiter");
    const d = await createJob(r2);
    expect((await list("?excludeRecruiter=" + r.id)).body.jobs.map((j) => j._id)).toEqual([d._id]);
    expect((await list(`?excludeJobIds=${a._id},${d._id}`)).body.jobs.map((j) => j._id)).toEqual([b._id]);
  });

  test("pagination math and applicationCount", async () => {
    const r = await signup("recruiter");
    const s = await signup("jobseeker");
    const jobs = [];
    for (let i = 0; i < 5; i++) jobs.push(await createJob(r, { title: "J" + i }));
    await Application.create({ jobId: jobs[4]._id, userId: s.id, resumeUrl: "x" });
    const p1 = (await list("?page=1&limit=2")).body;
    const p3 = (await list("?page=3&limit=2")).body;
    expect(p1).toMatchObject({ totalJobs: 5, totalPages: 3, currentPage: 1 });
    expect(p1.jobs.map((j) => j.title)).toEqual(["J4", "J3"]);
    expect(p1.jobs[0].applicationCount).toBe(1);
    expect(p3.jobs.map((j) => j.title)).toEqual(["J0"]);
  });

  test("a skill with regex characters (C++) does not crash the search [BUG-8]", async () => {
    const r = await signup("recruiter");
    const job = await createJob(r, { skills: ["C++"] });
    const res = await request(app).get("/api/jobs?skills=C%2B%2B");
    expect(res.status).toBe(200);
    expect(res.body.jobs.map((j) => j._id)).toEqual([job._id]);
  });

  test("malformed excludeRecruiter / excludeJobIds return 400, not 500 [BUG-2]", async () => {
    expect((await request(app).get("/api/jobs?excludeRecruiter=abc")).status).toBe(400);
    expect((await request(app).get("/api/jobs?excludeJobIds=abc")).status).toBe(400);
  });
});

describe("get one job", () => {
  test("returns the job with applicationCount", async () => {
    const r = await signup("recruiter");
    const job = await createJob(r);
    const res = await request(app).get("/api/jobs/" + job._id).expect(200);
    expect(res.body.job).toMatchObject({ _id: job._id, applicationCount: 0 });
  });

  test("unknown id -> 404", async () => {
    await request(app).get("/api/jobs/64b7f0f0f0f0f0f0f0f0f0f0").expect(404);
  });

  test("malformed id -> 400, not 500 [BUG-2]", async () => {
    expect((await request(app).get("/api/jobs/not-an-id")).status).toBe(400);
  });
});

describe("update, toggle, delete (ownership)", () => {
  test("owner updates allowed fields; recruiterId and unknown fields are ignored", async () => {
    const r = await signup("recruiter");
    const other = await signup("recruiter");
    const job = await createJob(r);
    const res = await request(app)
      .put("/api/jobs/" + job._id)
      .set(auth(r))
      .send({ title: "Senior", recruiterId: other.id, createdAt: "2000-01-01", deadline: "2026-12-31", status: "closed" })
      .expect(200);
    expect(res.body.job).toMatchObject({ title: "Senior", recruiterId: r.id, status: "closed" });
    expect(res.body.job.deadline).toBe("2026-12-31T00:00:00.000Z");
    expect(res.body.job.createdAt).not.toMatch(/^2000/);
  });

  test("owner can clear a deadline with null, and omitting it keeps it", async () => {
    const r = await signup("recruiter");
    const job = await createJob(r, { deadline: "2026-12-31" });
    const keep = await request(app).put("/api/jobs/" + job._id).set(auth(r)).send({ title: "x" }).expect(200);
    expect(keep.body.job.deadline).toBe("2026-12-31T00:00:00.000Z");
    const cleared = await request(app).put("/api/jobs/" + job._id).set(auth(r)).send({ deadline: null }).expect(200);
    expect(cleared.body.job.deadline).toBeNull();
  });

  test("another recruiter cannot update, toggle or delete -> 403, and nothing changes", async () => {
    const r = await signup("recruiter");
    const intruder = await signup("recruiter");
    const job = await createJob(r);
    await request(app).put("/api/jobs/" + job._id).set(auth(intruder)).send({ title: "pwned" }).expect(403);
    await request(app).put(`/api/jobs/${job._id}/status`).set(auth(intruder)).expect(403);
    await request(app).delete("/api/jobs/" + job._id).set(auth(intruder)).expect(403);
    const db = await Job.findById(job._id);
    expect(db).toMatchObject({ title: job.title, status: "active" });
  });

  test("toggle flips active <-> closed", async () => {
    const r = await signup("recruiter");
    const job = await createJob(r);
    const a = await request(app).put(`/api/jobs/${job._id}/status`).set(auth(r)).expect(200);
    expect(a.body.newStatus).toBe("closed");
    const b = await request(app).put(`/api/jobs/${job._id}/status`).set(auth(r)).expect(200);
    expect(b.body.newStatus).toBe("active");
  });

  test("delete cascades applications and saved-job records", async () => {
    const r = await signup("recruiter");
    const s = await signup("jobseeker");
    const job = await createJob(r);
    await Application.create({ jobId: job._id, userId: s.id, resumeUrl: "/resume/view/x" });
    await SavedJob.create({ jobId: job._id, userId: s.id });
    await request(app).delete("/api/jobs/" + job._id).set(auth(r)).expect(200);
    expect(await Job.countDocuments()).toBe(0);
    expect(await Application.countDocuments()).toBe(0);
    expect(await SavedJob.countDocuments()).toBe(0);
  });

  test("unknown id -> 404 on update/toggle/delete", async () => {
    const r = await signup("recruiter");
    const id = "64b7f0f0f0f0f0f0f0f0f0f0";
    await request(app).put("/api/jobs/" + id).set(auth(r)).send({}).expect(404);
    await request(app).put(`/api/jobs/${id}/status`).set(auth(r)).expect(404);
    await request(app).delete("/api/jobs/" + id).set(auth(r)).expect(404);
  });

  test("invalid enum on update -> 400, malformed id -> 400 [BUG-2]", async () => {
    const r = await signup("recruiter");
    const job = await createJob(r);
    expect((await request(app).put("/api/jobs/" + job._id).set(auth(r)).send({ workType: "Moon" })).status).toBe(400);
    expect((await request(app).delete("/api/jobs/nope").set(auth(r))).status).toBe(400);
  });
});

describe("recruiter's own jobs", () => {
  test("only own jobs, with status and hasApplicants filters", async () => {
    const r = await signup("recruiter");
    const other = await signup("recruiter");
    const s = await signup("jobseeker");
    const j1 = await createJob(r, { title: "one" });
    const j2 = await createJob(r, { title: "two" });
    await createJob(other, { title: "not mine" });
    await Job.updateOne({ _id: j2._id }, { status: "closed" });
    await Application.create({ jobId: j1._id, userId: s.id, resumeUrl: "x" });

    const all = await request(app).get("/api/jobs/recruiter/myjobs").set(auth(r)).expect(200);
    expect(all.body.jobs.map((j) => j.title).sort()).toEqual(["one", "two"]);
    const active = await request(app).get("/api/jobs/recruiter/myjobs?status=active").set(auth(r)).expect(200);
    expect(active.body.jobs.map((j) => j.title)).toEqual(["one"]);
    const closed = await request(app).get("/api/jobs/recruiter/myjobs?status=closed").set(auth(r)).expect(200);
    expect(closed.body.jobs.map((j) => j.title)).toEqual(["two"]);
    const withApps = await request(app).get("/api/jobs/recruiter/myjobs?hasApplicants=true").set(auth(r)).expect(200);
    expect(withApps.body.jobs).toHaveLength(1);
    expect(withApps.body.jobs[0]).toMatchObject({ title: "one", applicationCount: 1 });
  });

  test("empty list still reports totalPages 1", async () => {
    const r = await signup("recruiter");
    const res = await request(app).get("/api/jobs/recruiter/myjobs").set(auth(r)).expect(200);
    expect(res.body).toMatchObject({ totalJobs: 0, totalPages: 1, jobs: [] });
  });
});
