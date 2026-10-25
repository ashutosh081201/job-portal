const { app, request, useTestDb, signup, auth, createJob } = require("./helpers");
const SavedJob = require("../models/SavedJob");
const Job = require("../models/Job");

useTestDb();

describe("saved jobs", () => {
  test("toggle saves then unsaves; ids and list reflect it; per user", async () => {
    const r = await signup("recruiter");
    const s = await signup();
    const other = await signup();
    const job = await createJob(r);

    expect((await request(app).post("/api/saved-jobs/toggle").set(auth(s)).send({ jobId: job._id }).expect(200)).body.saved).toBe(true);
    expect((await request(app).get("/api/saved-jobs/ids").set(auth(s))).body.jobIds).toEqual([job._id]);
    expect((await request(app).get("/api/saved-jobs/ids").set(auth(other))).body.jobIds).toEqual([]);

    const list = await request(app).get("/api/saved-jobs/my").set(auth(s)).expect(200);
    expect(list.body.total).toBe(1);
    expect(list.body.savedJobs[0].jobId).toMatchObject({ title: job.title });
    expect(list.body.savedJobs[0].jobId.recruiterId).toHaveProperty("name");

    expect((await request(app).post("/api/saved-jobs/toggle").set(auth(s)).send({ jobId: job._id })).body.saved).toBe(false);
    expect(await SavedJob.countDocuments()).toBe(0);
  });

  test("missing jobId -> 400", async () => {
    const s = await signup();
    await request(app).post("/api/saved-jobs/toggle").set(auth(s)).send({}).expect(400);
  });

  test("orphans (job deleted directly) are dropped from the list and cleaned up", async () => {
    const r = await signup("recruiter");
    const s = await signup();
    const a = await createJob(r);
    const b = await createJob(r);
    await SavedJob.create({ userId: s.id, jobId: a._id });
    await SavedJob.create({ userId: s.id, jobId: b._id });
    await Job.deleteOne({ _id: a._id });
    const res = await request(app).get("/api/saved-jobs/my").set(auth(s)).expect(200);
    expect(res.body.total).toBe(1);
    expect(await SavedJob.countDocuments()).toBe(1);
  });

  test("pagination of saved jobs", async () => {
    const r = await signup("recruiter");
    const s = await signup();
    for (let i = 0; i < 3; i++) {
      const j = await createJob(r);
      await SavedJob.create({ userId: s.id, jobId: j._id });
    }
    const res = await request(app).get("/api/saved-jobs/my?page=2&limit=2").set(auth(s)).expect(200);
    expect(res.body).toMatchObject({ total: 3, totalPages: 2, currentPage: 2 });
    expect(res.body.savedJobs).toHaveLength(1);
  });

  test("saving a job that does not exist -> 404 [BUG-15]", async () => {
    const s = await signup();
    const res = await request(app).post("/api/saved-jobs/toggle").set(auth(s)).send({ jobId: "64b7f0f0f0f0f0f0f0f0f0f0" });
    expect(res.status).toBe(404);
  });

  test("malformed jobId -> 400 [BUG-2]", async () => {
    const s = await signup();
    const res = await request(app).post("/api/saved-jobs/toggle").set(auth(s)).send({ jobId: "nope" });
    expect(res.status).toBe(400);
  });
});
