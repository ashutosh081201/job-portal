const { app, request, useTestDb, signup, auth, createJob, createResume, sendMail, cloudinary } = require("./helpers");
const Application = require("../models/Application");
const Job = require("../models/Job");

useTestDb();

const pdf = Buffer.from("%PDF-1.4\n%test\n");
const uploadApply = (user, jobId, file = pdf, name = "cv.pdf", type = "application/pdf") =>
  request(app)
    .post("/api/applications/apply")
    .set(auth(user))
    .field("jobId", jobId)
    .attach("resume", file, { filename: name, contentType: type });

const setup = async () => {
  const recruiter = await signup("recruiter");
  const seeker = await signup("jobseeker");
  const job = await createJob(recruiter);
  return { recruiter, seeker, job };
};

describe("apply with an uploaded PDF", () => {
  test("uploads to Cloudinary (content-hash id), stores the URL, emails the recruiter", async () => {
    const { recruiter, seeker, job } = await setup();
    const res = await uploadApply(seeker, job._id).expect(201);
    expect(cloudinary.uploader.upload).toHaveBeenCalledTimes(1);
    const [, opts] = cloudinary.uploader.upload.mock.calls[0];
    expect(opts).toMatchObject({ folder: "jobverse-resumes", resource_type: "raw" });
    expect(opts.public_id).toMatch(/^[0-9a-f]{32}$/);
    expect(res.body.application).toMatchObject({ status: "pending", userId: seeker.id, jobId: job._id });
    expect(res.body.application.resumeUrl).toMatch(/^https:\/\/res\.cloudinary\.com\/.*\/raw\/upload\//);

    const mail = sendMail.mock.calls.find(([m]) => m.to === recruiter.email && m.subject.startsWith("New Application"))[0];
    expect(mail.subject).toBe(`New Application - ${job.title}`);
    expect(mail.html).toContain(seeker.name);
  });

  test("no file -> 400", async () => {
    const { seeker, job } = await setup();
    await request(app).post("/api/applications/apply").set(auth(seeker)).field("jobId", job._id).expect(400);
  });

  test("applying twice -> 400", async () => {
    const { seeker, job } = await setup();
    await uploadApply(seeker, job._id).expect(201);
    const res = await uploadApply(seeker, job._id).expect(400);
    expect(res.body.message).toMatch(/Already applied/);
  });

  test("an email failure does not fail the application", async () => {
    const { seeker, job } = await setup();
    sendMail.mockRejectedValueOnce(new Error("SMTP down"));
    await uploadApply(seeker, job._id).expect(201);
  });

  test("a Cloudinary failure is reported and nothing is saved", async () => {
    const { seeker, job } = await setup();
    cloudinary.uploader.upload.mockRejectedValueOnce(new Error("cloudinary 503"));
    const res = await uploadApply(seeker, job._id);
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(await Application.countDocuments()).toBe(0);
  });

  test("a non-PDF upload returns a 400 JSON error, not a 500 HTML page [BUG-2]", async () => {
    const { seeker, job } = await setup();
    const res = await uploadApply(seeker, job._id, Buffer.from("hi"), "a.txt", "text/plain");
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/PDF/);
  });

  test("a PDF over 5 MB returns 400 JSON [BUG-2]", async () => {
    const { seeker, job } = await setup();
    const res = await uploadApply(seeker, job._id, Buffer.alloc(5 * 1024 * 1024 + 1));
    expect(res.status).toBe(400);
    expect(res.body.message).toBeDefined();
  });
});

describe("apply with a saved resume", () => {
  test("uses the chosen resume and stores a /resume/view link", async () => {
    const { seeker, job } = await setup();
    const resume = await createResume(seeker);
    const res = await request(app)
      .post("/api/applications/apply-saved")
      .set(auth(seeker))
      .send({ jobId: job._id, resumeId: resume._id })
      .expect(201);
    expect(res.body.application.resumeUrl).toBe(`/resume/view/${resume._id}`);
  });

  test("without resumeId falls back to the most recently updated resume", async () => {
    const { seeker, job } = await setup();
    await createResume(seeker, { name: "old" });
    const newer = await createResume(seeker, { name: "new" });
    const res = await request(app).post("/api/applications/apply-saved").set(auth(seeker)).send({ jobId: job._id }).expect(201);
    expect(res.body.application.resumeUrl).toBe(`/resume/view/${newer._id}`);
  });

  test("cannot apply with someone else's resume -> 404", async () => {
    const { seeker, job } = await setup();
    const other = await signup("jobseeker");
    const theirs = await createResume(other);
    await request(app)
      .post("/api/applications/apply-saved")
      .set(auth(seeker))
      .send({ jobId: job._id, resumeId: theirs._id })
      .expect(404);
  });

  test("no resume -> 404", async () => {
    const { seeker, job } = await setup();
    await request(app).post("/api/applications/apply-saved").set(auth(seeker)).send({ jobId: job._id }).expect(404);
  });

  test("cannot apply to a closed job [BUG-11]", async () => {
    const { seeker, job } = await setup();
    await createResume(seeker);
    await Job.updateOne({ _id: job._id }, { status: "closed" });
    const res = await request(app).post("/api/applications/apply-saved").set(auth(seeker)).send({ jobId: job._id });
    expect(res.status).toBe(400);
  });

  test("cannot apply to a job that does not exist [BUG-11]", async () => {
    const { seeker } = await setup();
    await createResume(seeker);
    const res = await request(app)
      .post("/api/applications/apply-saved")
      .set(auth(seeker))
      .send({ jobId: "64b7f0f0f0f0f0f0f0f0f0f0" });
    expect(res.status).toBe(404);
  });

  test("a recruiter cannot apply to jobs [BUG-11]", async () => {
    const { job } = await setup();
    const r2 = await signup("recruiter");
    await createResume(r2);
    const res = await request(app).post("/api/applications/apply-saved").set(auth(r2)).send({ jobId: job._id });
    expect(res.status).toBe(403);
  });

  test("malformed jobId -> 400 [BUG-2]", async () => {
    const { seeker } = await setup();
    await createResume(seeker);
    const res = await request(app).post("/api/applications/apply-saved").set(auth(seeker)).send({ jobId: "nope" });
    expect(res.status).toBe(400);
  });
});

describe("my applications, check, withdraw", () => {
  const seedApps = async () => {
    const recruiter = await signup("recruiter");
    const seeker = await signup("jobseeker");
    const jobs = [];
    for (let i = 0; i < 4; i++) jobs.push(await createJob(recruiter, { title: "J" + i }));
    const statuses = ["pending", "reviewed", "shortlisted", "shortlisted"];
    for (let i = 0; i < 4; i++) {
      await Application.create({ jobId: jobs[i]._id, userId: seeker.id, resumeUrl: "x", status: statuses[i] });
    }
    return { recruiter, seeker, jobs };
  };

  test("status counts and filtering", async () => {
    const { seeker } = await seedApps();
    const other = await signup("jobseeker");
    const res = await request(app).get("/api/applications/my").set(auth(seeker)).expect(200);
    expect(res.body.statusCounts).toEqual({ all: 4, pending: 1, reviewed: 1, shortlisted: 2, rejected: 0 });
    expect(res.body.applications[0].jobId).toHaveProperty("title");
    const sl = await request(app).get("/api/applications/my?status=shortlisted").set(auth(seeker)).expect(200);
    expect(sl.body.totalApplications).toBe(2);
    // counts stay global even when filtered
    expect(sl.body.statusCounts.all).toBe(4);
    const mine = await request(app).get("/api/applications/my").set(auth(other)).expect(200);
    expect(mine.body.totalApplications).toBe(0);
  });

  test("check reports applied/not applied", async () => {
    const { seeker, jobs, recruiter } = await seedApps();
    const extra = await createJob(recruiter);
    expect((await request(app).get("/api/applications/check/" + jobs[0]._id).set(auth(seeker))).body.applied).toBe(true);
    expect((await request(app).get("/api/applications/check/" + extra._id).set(auth(seeker))).body.applied).toBe(false);
  });

  test("withdraw: only the owner can withdraw; unreferenced Cloudinary files are deleted", async () => {
    const { seeker, job } = await setup();
    const res = await uploadApply(seeker, job._id).expect(201);
    const id = res.body.application._id;
    const intruder = await signup("jobseeker");
    await request(app).delete(`/api/applications/${id}/withdraw`).set(auth(intruder)).expect(404);
    expect(await Application.countDocuments()).toBe(1);

    await request(app).delete(`/api/applications/${id}/withdraw`).set(auth(seeker)).expect(200);
    expect(await Application.countDocuments()).toBe(0);
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
      expect.stringMatching(/^jobverse-resumes\/[0-9a-f]{32}$/),
      { resource_type: "raw" },
    );
  });

  test("withdraw keeps a Cloudinary file another application still uses", async () => {
    const { recruiter, seeker, job } = await setup();
    const job2 = await createJob(recruiter);
    const a = await uploadApply(seeker, job._id).expect(201);
    await uploadApply(seeker, job2._id).expect(201); // same bytes -> same hash -> same URL
    await request(app).delete(`/api/applications/${a.body.application._id}/withdraw`).set(auth(seeker)).expect(200);
    expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
  });
});

describe("recruiter views and status updates", () => {
  test("job owner lists applicants and updates status; applicant gets an email", async () => {
    const { recruiter, seeker, job } = await setup();
    const a = await uploadApply(seeker, job._id).expect(201);
    const list = await request(app).get("/api/applications/job/" + job._id).set(auth(recruiter)).expect(200);
    expect(list.body.totalApplications).toBe(1);
    expect(list.body.applications[0].userId).toMatchObject({ email: seeker.email });

    sendMail.mockClear();
    const res = await request(app)
      .put(`/api/applications/${a.body.application._id}/status`)
      .set(auth(recruiter))
      .send({ status: "shortlisted" })
      .expect(200);
    expect(res.body.application.status).toBe("shortlisted");
    const mail = sendMail.mock.calls[0][0];
    expect(mail.to).toBe(seeker.email);
    expect(mail.html).toMatch(/shortlisted/);
  });

  test("unknown application -> 404", async () => {
    const { recruiter } = await setup();
    await request(app)
      .put("/api/applications/64b7f0f0f0f0f0f0f0f0f0f0/status")
      .set(auth(recruiter))
      .send({ status: "reviewed" })
      .expect(404);
  });

  test("an applicant cannot shortlist their own application [BUG-9]", async () => {
    const { seeker, job } = await setup();
    const a = await uploadApply(seeker, job._id).expect(201);
    const res = await request(app)
      .put(`/api/applications/${a.body.application._id}/status`)
      .set(auth(seeker))
      .send({ status: "shortlisted" });
    expect(res.status).toBe(403);
    expect((await Application.findById(a.body.application._id)).status).toBe("pending");
  });

  test("another recruiter cannot change the status of applications on my job [BUG-9]", async () => {
    const { seeker, job } = await setup();
    const rival = await signup("recruiter");
    const a = await uploadApply(seeker, job._id).expect(201);
    const res = await request(app)
      .put(`/api/applications/${a.body.application._id}/status`)
      .set(auth(rival))
      .send({ status: "rejected" });
    expect(res.status).toBe(403);
  });

  test("another user cannot list the applicants (names, emails, resumes) of my job [BUG-10]", async () => {
    const { seeker, job } = await setup();
    await uploadApply(seeker, job._id).expect(201);
    const snoop = await signup("jobseeker");
    const res = await request(app).get("/api/applications/job/" + job._id).set(auth(snoop));
    expect(res.status).toBe(403);
  });

  test("an invalid status value is rejected and not stored [BUG-2]", async () => {
    const { recruiter, seeker, job } = await setup();
    const a = await uploadApply(seeker, job._id).expect(201);
    const res = await request(app)
      .put(`/api/applications/${a.body.application._id}/status`)
      .set(auth(recruiter))
      .send({ status: "hired" });
    expect(res.status).toBe(400);
    expect((await Application.findById(a.body.application._id)).status).toBe("pending");
  });

  test("user-controlled names are HTML-escaped in emails [BUG-12]", async () => {
    const recruiter = await signup("recruiter");
    const seeker = await signup("jobseeker", { name: '<a href="https://evil.example">Click</a>' });
    const job = await createJob(recruiter);
    await uploadApply(seeker, job._id).expect(201);
    const mail = sendMail.mock.calls.find(([m]) => m.to === recruiter.email && m.subject.startsWith("New Application"))[0];
    expect(mail.html).not.toContain('<a href="https://evil.example">');
  });
});
