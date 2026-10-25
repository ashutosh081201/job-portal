const {
  app, request, sendMail, useTestDb, freezeClock, lastOtpSentTo, signup, auth,
  signToken, createJob, createResume,
} = require("./helpers");
const User = require("../models/User");
const Job = require("../models/Job");
const Resume = require("../models/Resume");

useTestDb();

const register = (body) => request(app).post("/api/auth/register").send(body);
const base = { name: "Asha", email: "asha@example.com", password: "Passw0rd!", role: "jobseeker" };

describe("signup and email verification", () => {
  test("register stores a hashed password, an unverified user, and emails a 6-digit OTP", async () => {
    const res = await register(base).expect(201);
    expect(res.body).toMatchObject({ success: true, email: base.email });

    const user = await User.findOne({ email: base.email });
    expect(user.isVerified).toBe(false);
    expect(user.password).not.toBe(base.password);
    expect(user.password).toMatch(/^\$2[aby]\$/);

    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0][0];
    expect(mail.to).toBe(base.email);
    expect(mail.subject).toMatch(/Verify/);
    expect(lastOtpSentTo(base.email)).toMatch(/^\d{6}$/);
    expect(mail.text).toContain(user.otp.code);
  });

  test("register rejects a duplicate email", async () => {
    await register(base).expect(201);
    const res = await register(base).expect(400);
    expect(res.body.message).toBe("Email already registered");
  });

  test("unverified users cannot log in", async () => {
    await register(base).expect(201);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: base.email, password: base.password })
      .expect(400);
    expect(res.body.message).toMatch(/verify your email/);
  });

  test("verify-otp with the right code verifies, clears the OTP and returns a working token", async () => {
    await register(base).expect(201);
    const otp = lastOtpSentTo(base.email);
    const res = await request(app).post("/api/auth/verify-otp").send({ email: base.email, otp }).expect(200);
    expect(res.body.user).toMatchObject({ email: base.email, role: "jobseeker" });
    expect(res.body.user.password).toBeUndefined();

    const user = await User.findOne({ email: base.email });
    expect(user.isVerified).toBe(true);
    expect(user.otp?.code).toBeUndefined();

    await request(app).get("/api/resume/all").set(auth(res.body)).expect(200);
  });

  test("verify-otp rejects a wrong code", async () => {
    await register(base).expect(201);
    const res = await request(app)
      .post("/api/auth/verify-otp")
      .send({ email: base.email, otp: "000000" === lastOtpSentTo(base.email) ? "111111" : "000000" })
      .expect(400);
    expect(res.body.message).toBe("Invalid OTP");
  });

  test("verify-otp rejects an OTP after its 10 minute window", async () => {
    freezeClock("2026-10-25T10:00:00Z");
    await register(base).expect(201);
    const otp = lastOtpSentTo(base.email);
    jest.setSystemTime(new Date("2026-10-25T10:10:01Z"));
    const res = await request(app).post("/api/auth/verify-otp").send({ email: base.email, otp }).expect(400);
    expect(res.body.message).toMatch(/expired/);
  });

  test("verify-otp accepts an OTP just inside the window", async () => {
    freezeClock("2026-10-25T10:00:00Z");
    await register(base).expect(201);
    const otp = lastOtpSentTo(base.email);
    jest.setSystemTime(new Date("2026-10-25T10:09:59Z"));
    await request(app).post("/api/auth/verify-otp").send({ email: base.email, otp }).expect(200);
  });

  test("resend-otp issues a new code and the old one stops working", async () => {
    await register(base).expect(201);
    const first = lastOtpSentTo(base.email);
    await request(app).post("/api/auth/resend-otp").send({ email: base.email }).expect(200);
    const second = lastOtpSentTo(base.email);
    expect(sendMail).toHaveBeenCalledTimes(2);
    if (first !== second) {
      await request(app).post("/api/auth/verify-otp").send({ email: base.email, otp: first }).expect(400);
    }
    await request(app).post("/api/auth/verify-otp").send({ email: base.email, otp: second }).expect(200);
  });

  test("verify-otp and resend-otp return 404 for an unknown email", async () => {
    await request(app).post("/api/auth/verify-otp").send({ email: "nobody@x.com", otp: "123456" }).expect(404);
    await request(app).post("/api/auth/resend-otp").send({ email: "nobody@x.com" }).expect(404);
  });

  test("verify-otp must not issue a token when no OTP is pending (account takeover) [BUG-1]", async () => {
    const victim = await signup("recruiter");
    // attacker knows only the email address
    const res = await request(app).post("/api/auth/verify-otp").send({ email: victim.email });
    expect(res.status).toBe(400);
    expect(res.body.token).toBeUndefined();
  });

  test("register with a missing password returns 400, not 500 [BUG-2]", async () => {
    const res = await register({ ...base, password: undefined });
    expect(res.status).toBe(400);
  });

  test("register with an invalid role returns 400, not 500 [BUG-2]", async () => {
    const res = await register({ ...base, role: "admin" });
    expect(res.status).toBe(400);
  });

  test("emails are case-insensitive (no duplicate accounts, login works with any case) [BUG-3]", async () => {
    await signup("jobseeker", { email: "Case@Example.com" });
    const dup = await register({ ...base, email: "case@example.com" });
    expect(dup.status).toBe(400);
    await request(app)
      .post("/api/auth/login")
      .send({ email: "case@example.com", password: "Passw0rd!" })
      .expect(200);
  });
});

describe("login", () => {
  test("valid credentials return a JWT carrying id and role", async () => {
    const u = await signup("recruiter");
    const res = await request(app).post("/api/auth/login").send({ email: u.email, password: u.password }).expect(200);
    const payload = JSON.parse(Buffer.from(res.body.token.split(".")[1], "base64url"));
    expect(payload).toMatchObject({ id: u.id, role: "recruiter" });
    expect(payload.exp - payload.iat).toBe(7 * 24 * 3600);
  });

  test("wrong password and unknown email give the same generic message", async () => {
    const u = await signup();
    const a = await request(app).post("/api/auth/login").send({ email: u.email, password: "nope" }).expect(400);
    const b = await request(app).post("/api/auth/login").send({ email: "x@y.com", password: "nope" }).expect(400);
    expect(a.body.message).toBe("Invalid email or password");
    expect(b.body.message).toBe(a.body.message);
  });
});

describe("auth guard (JWT)", () => {
  const protectedGet = (headers = {}) => request(app).get("/api/resume/all").set(headers);

  test("missing token -> 401", async () => {
    const res = await protectedGet().expect(401);
    expect(res.body.message).toMatch(/No token/);
  });

  test("malformed token -> 401", async () => {
    await protectedGet({ Authorization: "Bearer not.a.jwt" }).expect(401);
    await protectedGet({ Authorization: "garbage" }).expect(401);
  });

  test("token signed with another secret (forged) -> 401", async () => {
    const u = await signup();
    const forged = signToken({ id: u.id, role: "recruiter" }, { expiresIn: "1h" }, "attacker-secret");
    await protectedGet({ Authorization: `Bearer ${forged}` }).expect(401);
  });

  test("unsigned alg:none token -> 401", async () => {
    const u = await signup();
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify({ id: u.id, role: "recruiter" })).toString("base64url");
    await protectedGet({ Authorization: `Bearer ${header}.${body}.` }).expect(401);
  });

  test("expired token -> 401, a token one second from expiry still works", async () => {
    const u = await signup();
    freezeClock("2026-10-25T00:00:00Z");
    const token = signToken({ id: u.id, role: "jobseeker" }, { expiresIn: "7d" });
    jest.setSystemTime(new Date("2026-10-31T23:59:59Z"));
    await protectedGet({ Authorization: `Bearer ${token}` }).expect(200);
    jest.setSystemTime(new Date("2026-11-01T00:00:01Z"));
    await protectedGet({ Authorization: `Bearer ${token}` }).expect(401);
  });
});

describe("password reset", () => {
  const startReset = async (email) => {
    await request(app).post("/api/auth/forgot-password").send({ email }).expect(200);
    return lastOtpSentTo(email);
  };

  test("full flow: forgot -> OTP email -> reset token -> new password works, old does not", async () => {
    const u = await signup();
    const otp = await startReset(u.email);
    expect(sendMail.mock.calls.at(-1)[0].subject).toMatch(/Reset/);

    const v = await request(app).post("/api/auth/verify-forgot-otp").send({ email: u.email, otp }).expect(200);
    expect(v.body.resetToken).toBeTruthy();

    await request(app)
      .post("/api/auth/reset-password")
      .send({ resetToken: v.body.resetToken, newPassword: "NewPass1!" })
      .expect(200);

    await request(app).post("/api/auth/login").send({ email: u.email, password: u.password }).expect(400);
    await request(app).post("/api/auth/login").send({ email: u.email, password: "NewPass1!" }).expect(200);
  });

  test("forgot-password for an unknown email -> 404", async () => {
    await request(app).post("/api/auth/forgot-password").send({ email: "ghost@x.com" }).expect(404);
  });

  test("wrong reset OTP -> 400, expired reset OTP -> 400", async () => {
    const u = await signup();
    freezeClock("2026-10-25T10:00:00Z");
    const otp = await startReset(u.email);
    await request(app)
      .post("/api/auth/verify-forgot-otp")
      .send({ email: u.email, otp: otp === "123456" ? "654321" : "123456" })
      .expect(400);
    jest.setSystemTime(new Date("2026-10-25T10:11:00Z"));
    const res = await request(app).post("/api/auth/verify-forgot-otp").send({ email: u.email, otp }).expect(400);
    expect(res.body.message).toMatch(/expired/);
  });

  test("reset token expires after 15 minutes", async () => {
    const u = await signup();
    freezeClock("2026-10-25T10:00:00Z");
    const otp = await startReset(u.email);
    const v = await request(app).post("/api/auth/verify-forgot-otp").send({ email: u.email, otp }).expect(200);
    jest.setSystemTime(new Date("2026-10-25T10:15:01Z"));
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ resetToken: v.body.resetToken, newPassword: "NewPass1!" });
    expect(res.status).not.toBe(200);
  });

  test("verify-forgot-otp without an OTP must not hand out a reset token (account takeover) [BUG-1]", async () => {
    const victim = await signup();
    const res = await request(app).post("/api/auth/verify-forgot-otp").send({ email: victim.email });
    expect(res.status).toBe(400);
    expect(res.body.resetToken).toBeUndefined();
  });

  test("a normal login token must not be accepted as a password-reset token [BUG-4]", async () => {
    const u = await signup();
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ resetToken: u.token, newPassword: "Hijacked1!" });
    expect(res.status).toBe(400);
  });

  test("a garbage reset token returns 400, not 500 [BUG-2]", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ resetToken: "garbage", newPassword: "x" });
    expect(res.status).toBe(400);
  });
});

describe("profile, change password, delete account", () => {
  test("PUT /api/auth/profile updates the name", async () => {
    const u = await signup();
    const res = await request(app).put("/api/auth/profile").set(auth(u)).send({ name: "New Name" }).expect(200);
    expect(res.body.user.name).toBe("New Name");
  });

  test("profile update ignores role/email/isVerified in the body (mass assignment)", async () => {
    const u = await signup();
    await request(app)
      .put("/api/auth/profile")
      .set(auth(u))
      .send({ name: "Ok", role: "recruiter", email: "hijack@x.com" })
      .expect(200);
    const db = await User.findById(u.id);
    expect(db.role).toBe("jobseeker");
    expect(db.email).toBe(u.email);
  });

  test("profile update with an empty name is rejected (validators run) [BUG-6]", async () => {
    const u = await signup();
    const res = await request(app).put("/api/auth/profile").set(auth(u)).send({ name: "" });
    expect(res.status).toBe(400);
  });

  test("change-password requires the current password", async () => {
    const u = await signup();
    await request(app)
      .put("/api/auth/change-password")
      .set(auth(u))
      .send({ currentPassword: "wrong", newPassword: "Another1!" })
      .expect(400);
    await request(app)
      .put("/api/auth/change-password")
      .set(auth(u))
      .send({ currentPassword: u.password, newPassword: "Another1!" })
      .expect(200);
    await request(app).post("/api/auth/login").send({ email: u.email, password: "Another1!" }).expect(200);
  });

  test("change-password without newPassword returns 400, not 500 [BUG-2]", async () => {
    const u = await signup();
    const res = await request(app)
      .put("/api/auth/change-password")
      .set(auth(u))
      .send({ currentPassword: u.password });
    expect(res.status).toBe(400);
  });

  test("deleting a recruiter removes their jobs; deleting a jobseeker removes their resumes", async () => {
    const r = await signup("recruiter");
    const s = await signup("jobseeker");
    await createJob(r);
    await createResume(s);

    await request(app).delete("/api/auth/delete-account").set(auth(r)).expect(200);
    await request(app).delete("/api/auth/delete-account").set(auth(s)).expect(200);

    expect(await User.countDocuments()).toBe(0);
    expect(await Job.countDocuments()).toBe(0);
    expect(await Resume.countDocuments()).toBe(0);
  });
});
