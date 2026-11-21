// The main suite runs with rate limits off. Here the real auth routes are mounted
// behind fresh limiters that are ON, so each test starts with empty counters.
const express = require("express");
const { request, useTestDb, signup, lastOtpSentTo } = require("./helpers");
const { createRateLimiters } = require("../middleware/rateLimits");

useTestDb();

const limitedApp = () => {
  const a = express();
  a.set("trust proxy", 1);
  a.use(express.json());
  const limits = createRateLimiters();
  a.use("/api/auth", limits.authPerNetwork, limits.authPerAccount, require("../routes/auth.routes"));
  return a;
};

const login = (a, email, password, ip = "203.0.113.7") =>
  request(a).post("/api/auth/login").set("X-Forwarded-For", ip).send({ email, password });

describe("auth rate limits", () => {
  test("10 failed logins lock that account on that network, even with the right password", async () => {
    const a = limitedApp();
    const u = await signup();
    for (let i = 0; i < 10; i++) expect((await login(a, u.email, "wrong")).status).toBe(400);
    const res = await login(a, u.email, u.password);
    expect(res.status).toBe(429);
    expect(res.body.message).toBe("Too many attempts, please try again in 15 minutes");
  });

  test("[BUG-C] one person's failures do not lock out others on the same network", async () => {
    const a = limitedApp();
    const typo = await signup();
    const neighbour = await signup();
    for (let i = 0; i < 11; i++) await login(a, typo.email, "wrong");
    expect((await login(a, neighbour.email, neighbour.password)).status).toBe(200);
    const fresh = await request(a)
      .post("/api/auth/register")
      .set("X-Forwarded-For", "203.0.113.7")
      .send({ name: "New Person", email: "brand-new@example.com", password: "Passw0rd!" });
    expect(fresh.status).toBe(201);
  });

  test("successful requests never count toward the limit", async () => {
    const a = limitedApp();
    const u = await signup();
    for (let i = 0; i < 15; i++) expect((await login(a, u.email, u.password)).status).toBe(200);
  });

  test("an attacker on another network cannot lock the owner out", async () => {
    const a = limitedApp();
    const u = await signup();
    for (let i = 0; i < 11; i++) await login(a, u.email, "wrong", "198.51.100.9");
    expect((await login(a, u.email, "wrong", "198.51.100.9")).status).toBe(429);
    expect((await login(a, u.email, u.password, "203.0.113.7")).status).toBe(200);
  });

  test("emails in different case count as the same account", async () => {
    const a = limitedApp();
    const u = await signup();
    for (let i = 0; i < 10; i++) await login(a, i % 2 ? u.email.toUpperCase() : u.email, "wrong");
    expect((await login(a, u.email, u.password)).status).toBe(429);
  });

  test("OTP guessing is capped at 10 wrong codes per email", async () => {
    const a = limitedApp();
    await request(a)
      .post("/api/auth/register")
      .set("X-Forwarded-For", "203.0.113.7")
      .send({ name: "Otp", email: "otp@example.com", password: "Passw0rd!" })
      .expect(201);
    const real = lastOtpSentTo("otp@example.com");
    const wrong = real === "000000" ? "111111" : "000000";
    for (let i = 0; i < 10; i++) {
      await request(a).post("/api/auth/verify-otp").set("X-Forwarded-For", "203.0.113.7").send({ email: "otp@example.com", otp: wrong });
    }
    const res = await request(a)
      .post("/api/auth/verify-otp")
      .set("X-Forwarded-For", "203.0.113.7")
      .send({ email: "otp@example.com", otp: real });
    expect(res.status).toBe(429);
  });

  test("one network trying many different accounts is capped at 50 failures", async () => {
    const a = limitedApp();
    for (let i = 0; i < 50; i++) await login(a, `nobody${i}@example.com`, "wrong", "192.0.2.50");
    const res = await login(a, "someone-else@example.com", "wrong", "192.0.2.50");
    expect(res.status).toBe(429);
    expect(res.body.message).toMatch(/from your network/);
    // other networks are unaffected
    expect((await login(a, "someone-else@example.com", "wrong", "192.0.2.51")).status).toBe(400);
  });
});
