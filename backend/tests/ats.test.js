const { app, request, useTestDb, signup, auth, createJob, createResume, generateContent, longDescription } = require("./helpers");
const { __getGenerativeModel: getGenerativeModel } = require("@google/generative-ai");
const AtsResult = require("../models/AtsResult");

useTestDb();

const aiReply = (obj, wrap = (s) => s) => ({ response: { text: () => wrap(JSON.stringify(obj)) } });
const good = {
  score: 72,
  matchedKeywords: ["Node.js", "MongoDB"],
  missingKeywords: ["Kubernetes"],
  strengths: ["APIs"],
  improvements: ["Add metrics"],
  summary: "Solid match.",
};

describe("manual ATS check", () => {
  test("scores my resume against a pasted JD, sends resume text in the prompt, saves history", async () => {
    const s = await signup();
    const resume = await createResume(s);
    generateContent.mockResolvedValueOnce(aiReply(good));
    const res = await request(app)
      .post("/api/ats/check")
      .set(auth(s))
      .send({ jobDescription: longDescription, resumeId: resume._id })
      .expect(200);
    expect(res.body.data).toEqual(good);

    const prompt = generateContent.mock.calls[0][0];
    expect(prompt).toContain("NAME: Asha");
    expect(prompt).toContain(longDescription);
    expect(getGenerativeModel.mock.calls[0][0].generationConfig.responseMimeType).toBe("application/json");

    const saved = await AtsResult.findOne();
    expect(saved).toMatchObject({ score: 72, checkType: "manual", resumeName: "Backend Resume" });
    expect(saved.feedback.missingKeywords).toEqual(["Kubernetes"]);
  });

  test("strips ```json fences from the model output", async () => {
    const s = await signup();
    await createResume(s);
    generateContent.mockResolvedValueOnce(aiReply(good, (t) => "```json\n" + t + "\n```"));
    const res = await request(app).post("/api/ats/check").set(auth(s)).send({ jobDescription: longDescription }).expect(200);
    expect(res.body.data.score).toBe(72);
  });

  test("validation: missing JD, JD under 20 words, no resume", async () => {
    const s = await signup();
    await request(app).post("/api/ats/check").set(auth(s)).send({}).expect(400);
    await request(app).post("/api/ats/check").set(auth(s)).send({ jobDescription: "short jd" }).expect(400);
    await request(app).post("/api/ats/check").set(auth(s)).send({ jobDescription: longDescription }).expect(404);
    expect(generateContent).not.toHaveBeenCalled();
  });

  test("cannot score someone else's resume", async () => {
    const s = await signup();
    const other = await signup();
    const theirs = await createResume(other);
    await request(app).post("/api/ats/check").set(auth(s)).send({ jobDescription: longDescription, resumeId: theirs._id }).expect(404);
  });

  test("an AI failure returns an error and saves nothing", async () => {
    const s = await signup();
    await createResume(s);
    generateContent.mockRejectedValue(new Error("model exploded"));
    const res = await request(app).post("/api/ats/check").set(auth(s)).send({ jobDescription: longDescription });
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(await AtsResult.countDocuments()).toBe(0);
    generateContent.mockReset();
  });

  test("a transient AI error (503) is retried and the check succeeds [BUG-16]", async () => {
    const s = await signup();
    await createResume(s);
    const transient = Object.assign(new Error("[503 Service Unavailable] overloaded"), { status: 503 });
    generateContent.mockRejectedValueOnce(transient).mockResolvedValueOnce(aiReply(good));
    const res = await request(app).post("/api/ats/check").set(auth(s)).send({ jobDescription: longDescription });
    expect(res.status).toBe(200);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  test("non-JSON model output gives a clean 502, not a raw JSON.parse message [BUG-16]", async () => {
    const s = await signup();
    await createResume(s);
    generateContent.mockResolvedValue({ response: { text: () => "Sorry, I can't do that." } });
    const res = await request(app).post("/api/ats/check").set(auth(s)).send({ jobDescription: longDescription });
    expect(res.status).toBe(502);
    expect(res.body.message).not.toMatch(/Unexpected token|JSON/);
    generateContent.mockReset();
  });

  test("an out-of-range score from the model is clamped to 0-100 [BUG-16]", async () => {
    const s = await signup();
    await createResume(s);
    generateContent.mockResolvedValueOnce(aiReply({ ...good, score: 140 }));
    const res = await request(app).post("/api/ats/check").set(auth(s)).send({ jobDescription: longDescription });
    expect(res.body.data.score).toBe(100);
  });
});

describe("job-linked ATS check and history", () => {
  test("uses the job's description and snapshots title/company", async () => {
    const r = await signup("recruiter");
    const s = await signup();
    const job = await createJob(r, { title: "Platform Eng", company: "Zeta" });
    await createResume(s);
    generateContent.mockResolvedValueOnce(aiReply(good));
    const res = await request(app).post("/api/ats/check-job").set(auth(s)).send({ jobId: job._id }).expect(200);
    expect(res.body.job).toEqual({ title: "Platform Eng", company: "Zeta" });
    expect(generateContent.mock.calls[0][0]).toContain(job.description);
    expect(await AtsResult.findOne()).toMatchObject({ checkType: "job", jobTitle: "Platform Eng", companyName: "Zeta" });
  });

  test("validation: missing jobId 400, unknown job 404, short description 400", async () => {
    const r = await signup("recruiter");
    const s = await signup();
    const job = await createJob(r, { description: "too short" });
    await request(app).post("/api/ats/check-job").set(auth(s)).send({}).expect(400);
    await request(app).post("/api/ats/check-job").set(auth(s)).send({ jobId: "64b7f0f0f0f0f0f0f0f0f0f0" }).expect(404);
    await request(app).post("/api/ats/check-job").set(auth(s)).send({ jobId: job._id }).expect(400);
  });

  test("history is split by type, per user, paginated newest first", async () => {
    const s = await signup();
    const other = await signup();
    for (let i = 0; i < 6; i++) {
      await AtsResult.create({ userId: s.id, jobDescription: "jd" + i, score: i * 10, checkType: "manual" });
    }
    await AtsResult.create({ userId: s.id, jobDescription: "j", score: 90, checkType: "job", jobTitle: "T" });
    await AtsResult.create({ userId: other.id, jobDescription: "x", score: 1, checkType: "manual" });
    const manual = await request(app).get("/api/ats/history").set(auth(s)).expect(200);
    expect(manual.body).toMatchObject({ totalHistory: 6, totalPages: 2 });
    expect(manual.body.history[0].score).toBe(50);
    const jobs = await request(app).get("/api/ats/history/jobs").set(auth(s)).expect(200);
    expect(jobs.body.totalHistory).toBe(1);
  });

  test("malformed jobId -> 400 [BUG-2]", async () => {
    const s = await signup();
    expect((await request(app).post("/api/ats/check-job").set(auth(s)).send({ jobId: "nope" })).status).toBe(400);
  });
});

describe("AI failure diagnostics", () => {
  const setup = async () => {
    const s = await signup();
    await createResume(s);
    return s;
  };
  const check = (s) => request(app).post("/api/ats/check").set(auth(s)).send({ jobDescription: longDescription });

  test("an exhausted quota (429) is not retried and says so plainly; the real error is logged", async () => {
    const s = await setup();
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    generateContent.mockRejectedValue(
      Object.assign(new Error("[429 Too Many Requests] You exceeded your current quota. limit: 0"), { status: 429 }),
    );
    const res = await check(s);
    expect(res.status).toBe(429);
    expect(res.body.message).toMatch(/usage limit/);
    expect(generateContent).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0].join(" ")).toMatch(/Gemini call failed .*429.*quota/);
    expect(await AtsResult.countDocuments()).toBe(0);
    generateContent.mockReset();
    log.mockRestore();
  });

  test("a plain rate limit (429 without quota wording) is still retried", async () => {
    const s = await setup();
    jest.spyOn(console, "error").mockImplementation(() => {});
    generateContent
      .mockRejectedValueOnce(Object.assign(new Error("[429 Too Many Requests] Please slow down"), { status: 429 }))
      .mockResolvedValueOnce(aiReply(good));
    expect((await check(s)).status).toBe(200);
    expect(generateContent).toHaveBeenCalledTimes(2);
    console.error.mockRestore();
  });

  test("a missing or retired model (404) is not retried and is logged with the model name", async () => {
    const s = await setup();
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    generateContent.mockRejectedValue(
      Object.assign(new Error("[404 Not Found] models/x is not found for API version v1beta"), { status: 404 }),
    );
    const res = await check(s);
    expect(res.status).toBe(502);
    expect(generateContent).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0].join(" ")).toMatch(/model gemini-3\.6-flash.*404/);
    generateContent.mockReset();
    log.mockRestore();
  });

  test("overload that never clears: 3 attempts, each logged, then the busy message", async () => {
    const s = await setup();
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    generateContent.mockRejectedValue(Object.assign(new Error("[503 Service Unavailable] The model is overloaded"), { status: 503 }));
    const res = await check(s);
    expect(res.status).toBe(503);
    expect(res.body.message).toMatch(/busy/);
    expect(generateContent).toHaveBeenCalledTimes(3);
    expect(log).toHaveBeenCalledTimes(3);
    generateContent.mockReset();
    log.mockRestore();
  });
});
