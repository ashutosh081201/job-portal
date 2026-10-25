const { app, request, useTestDb, signup, auth, createResume, resumePayload } = require("./helpers");
const Resume = require("../models/Resume");
const AtsResult = require("../models/AtsResult");

useTestDb();

describe("resume CRUD", () => {
  test("create cleans education: drops empty rows, trims, keeps school fields", async () => {
    const s = await signup();
    const r = await createResume(s, {
      education: [
        { eduType: "university", university: "  IIT  ", degree: " B.Tech ", gpa: " 9 " },
        { eduType: "university", university: "", degree: "" },
        { eduType: "school", schoolName: "DPS", marks: "95%", board: "CBSE" },
        { eduType: "school", schoolName: "  " },
      ],
    });
    expect(r.education).toHaveLength(2);
    expect(r.education[0]).toMatchObject({ eduType: "university", university: "IIT", degree: "B.Tech", gpa: "9" });
    expect(r.education[1]).toMatchObject({ eduType: "school", schoolName: "DPS", schoolType: "Senior Secondary", board: "CBSE" });
    expect(r.projects[0].url).toBe("github.com/x");
    expect(r.userId).toBe(s.id);
  });

  test("name defaults to 'My Resume'", async () => {
    const s = await signup();
    const r = await createResume(s, { name: "" });
    expect(r.name).toBe("My Resume");
  });

  test("update by resumeId; other users cannot update it", async () => {
    const s = await signup();
    const other = await signup();
    const r = await createResume(s);
    const res = await request(app).post("/api/resume/save").set(auth(s)).send({ resumeId: r._id, name: "Renamed" }).expect(200);
    expect(res.body.resume.name).toBe("Renamed");
    await request(app).post("/api/resume/save").set(auth(other)).send({ resumeId: r._id, name: "pwned" }).expect(404);
    expect((await Resume.findById(r._id)).name).toBe("Renamed");
  });

  test("list is paginated, newest first, own only", async () => {
    const s = await signup();
    const other = await signup();
    for (let i = 0; i < 7; i++) await createResume(s, { name: "R" + i });
    await createResume(other);
    const p1 = await request(app).get("/api/resume/all").set(auth(s)).expect(200);
    expect(p1.body).toMatchObject({ totalResumes: 7, totalPages: 2, currentPage: 1 });
    expect(p1.body.resumes).toHaveLength(6);
    expect(p1.body.resumes[0].name).toBe("R6");
    const my = await request(app).get("/api/resume/my").set(auth(s)).expect(200);
    expect(my.body.resume.name).toBe("R6");
  });

  test("/my with no resume -> 404", async () => {
    const s = await signup();
    await request(app).get("/api/resume/my").set(auth(s)).expect(404);
  });

  test("delete: own only, cascades ATS results for that resume", async () => {
    const s = await signup();
    const other = await signup();
    const r = await createResume(s);
    await AtsResult.create({ userId: s.id, resumeId: r._id, jobDescription: "x", score: 50 });
    await request(app).delete("/api/resume/" + r._id).set(auth(other)).expect(404);
    expect(await Resume.countDocuments()).toBe(1);
    await request(app).delete("/api/resume/" + r._id).set(auth(s)).expect(200);
    expect(await Resume.countDocuments()).toBe(0);
    expect(await AtsResult.countDocuments()).toBe(0);
  });

  test("view returns the resume JSON; unknown -> 404", async () => {
    const s = await signup();
    const r = await createResume(s);
    const res = await request(app).get("/api/resume/view/" + r._id).set(auth(s)).expect(200);
    expect(res.body.resume.personalInfo.name).toBe("Asha");
    await request(app).get("/api/resume/view/64b7f0f0f0f0f0f0f0f0f0f0").set(auth(s)).expect(404);
  });

  test("userId in the body cannot create a resume owned by someone else [BUG-13]", async () => {
    const attacker = await signup();
    const victim = await signup();
    const res = await request(app)
      .post("/api/resume/save")
      .set(auth(attacker))
      .send(resumePayload({ userId: victim.id }))
      .expect(200);
    expect(res.body.resume.userId).toBe(attacker.id);
  });

  test("userId in the body cannot move my resume to another account [BUG-13]", async () => {
    const s = await signup();
    const victim = await signup();
    const r = await createResume(s);
    await request(app).post("/api/resume/save").set(auth(s)).send({ resumeId: r._id, userId: victim.id });
    expect((await Resume.findById(r._id)).userId.toString()).toBe(s.id);
  });

  test("an anonymous visitor cannot read a resume's personal details [BUG-14]", async () => {
    const s = await signup();
    const r = await createResume(s);
    const res = await request(app).get("/api/resume/view/" + r._id);
    expect(res.status).toBe(401);
  });

  test("a recruiter can view a resume only if it was used to apply to one of their jobs [BUG-14]", async () => {
    const { createJob } = require("./helpers");
    const s = await signup();
    const r = await createResume(s);
    const mine = await signup("recruiter");
    const stranger = await signup("recruiter");
    const job = await createJob(mine);
    await request(app).post("/api/applications/apply-saved").set(auth(s)).send({ jobId: job._id, resumeId: r._id }).expect(201);
    await request(app).get("/api/resume/view/" + r._id).set(auth(mine)).expect(200);
    expect((await request(app).get("/api/resume/view/" + r._id).set(auth(stranger))).status).toBe(403);
  });

  test("malformed id on view/delete -> 400 [BUG-2]", async () => {
    const s = await signup();
    expect((await request(app).get("/api/resume/view/zzz").set(auth(s))).status).toBe(400);
    expect((await request(app).delete("/api/resume/zzz").set(auth(s))).status).toBe(400);
  });
});
