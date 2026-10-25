// Regression tests for behaviour added while fixing the reported bugs.
const bcrypt = require("bcryptjs");
const { app, request, mongoose, useTestDb, signup, auth, createJob, lastOtpSentTo, cloudinary } = require("./helpers");
const Job = require("../models/Job");
const Application = require("../models/Application");

useTestDb();

test("a reset token works once: reusing it after the password changed fails", async () => {
  const u = await signup();
  await request(app).post("/api/auth/forgot-password").send({ email: u.email }).expect(200);
  const v = await request(app)
    .post("/api/auth/verify-forgot-otp")
    .send({ email: u.email, otp: lastOtpSentTo(u.email) })
    .expect(200);
  await request(app).post("/api/auth/reset-password").send({ resetToken: v.body.resetToken, newPassword: "First1!" }).expect(200);
  await request(app).post("/api/auth/reset-password").send({ resetToken: v.body.resetToken, newPassword: "Second2!" }).expect(400);
});

test("a reset token is never accepted as a session token", async () => {
  const u = await signup();
  await request(app).post("/api/auth/forgot-password").send({ email: u.email }).expect(200);
  const v = await request(app)
    .post("/api/auth/verify-forgot-otp")
    .send({ email: u.email, otp: lastOtpSentTo(u.email) })
    .expect(200);
  await request(app).get("/api/resume/all").set({ Authorization: `Bearer ${v.body.resetToken}` }).expect(401);
});

test("accounts stored with mixed-case email before the lowercase rule can still log in", async () => {
  await mongoose.connection.collection("users").insertOne({
    name: "Legacy", email: "Legacy@Example.COM", password: await bcrypt.hash("Passw0rd!", 10),
    role: "jobseeker", isVerified: true,
  });
  await request(app).post("/api/auth/login").send({ email: "legacy@example.com", password: "Passw0rd!" }).expect(200);
  await request(app).post("/api/auth/register").send({ name: "x", email: "LEGACY@example.com", password: "Passw0rd!" }).expect(400);
});

test("register and reset enforce a minimum password length", async () => {
  const res = await request(app).post("/api/auth/register").send({ name: "A", email: "a@b.co", password: "123" });
  expect(res.status).toBe(400);
  expect(res.body.message).toMatch(/at least 6/);
});

test("health check reports the database connection", async () => {
  const res = await request(app).get("/api/health").expect(200);
  expect(res.body).toEqual({ status: "ok", db: "connected" });
});

test("unknown API routes return JSON 404; malformed JSON returns 400", async () => {
  const res = await request(app).get("/api/nope").expect(404);
  expect(res.body.message).toBe("Route not found");
  await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{bad").expect(400);
});

test("unexpected errors are logged but not leaked to the client", async () => {
  const s = await signup();
  jest.spyOn(Job, "find").mockImplementationOnce(() => { throw new Error("secret internals"); });
  jest.spyOn(console, "error").mockImplementationOnce(() => {});
  const res = await request(app).get("/api/jobs").set(auth(s)).expect(500);
  expect(res.body.message).not.toMatch(/secret/);
});

test("skill search: C# matches C# only, Java does not match JavaScript", async () => {
  const r = await signup("recruiter");
  const cs = await createJob(r, { title: "a", skills: ["C#"] });
  await createJob(r, { title: "b", skills: ["C"] });
  await createJob(r, { title: "c", skills: ["JavaScript"] });
  const res = await request(app).get("/api/jobs?skills=C%23").expect(200);
  expect(res.body.jobs.map((j) => j._id)).toEqual([cs._id]);
  expect((await request(app).get("/api/jobs?skills=Java")).body.jobs).toHaveLength(0);
});

test("jobseekers cannot use recruiter-only routes", async () => {
  const s = await signup();
  await request(app).get("/api/jobs/recruiter/myjobs").set(auth(s)).expect(403);
});

test("an uploaded PDF is removed again when the application is rejected (closed job)", async () => {
  const r = await signup("recruiter");
  const s = await signup();
  const job = await createJob(r);
  await Job.updateOne({ _id: job._id }, { status: "closed" });
  await request(app)
    .post("/api/applications/apply")
    .set(auth(s))
    .field("jobId", job._id)
    .attach("resume", Buffer.from("%PDF-1.4 x"), { filename: "cv.pdf", contentType: "application/pdf" })
    .expect(400);
  expect(await Application.countDocuments()).toBe(0);
  expect(cloudinary.uploader.destroy).toHaveBeenCalledTimes(1);
});
