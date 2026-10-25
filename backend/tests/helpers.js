const mongoose = require("mongoose");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("../app");

const sendMail = require("nodemailer").__sendMail;
const generateContent = require("@google/generative-ai").__generateContent;
const cloudinary = require("cloudinary").v2;

let mongod;

// Call at the top of each test file.
const useTestDb = () => {
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  });
  afterEach(async () => {
    jest.useRealTimers();
    await Promise.all(
      Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})),
    );
    jest.clearAllMocks();
  });
  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });
};

// Fake only Date so DB drivers and supertest keep working with real timers.
const freezeClock = (iso) => {
  jest.useFakeTimers({
    doNotFake: [
      "hrtime", "nextTick", "performance", "queueMicrotask",
      "requestAnimationFrame", "cancelAnimationFrame",
      "requestIdleCallback", "cancelIdleCallback",
      "setImmediate", "clearImmediate", "setInterval", "clearInterval",
      "setTimeout", "clearTimeout",
    ],
  });
  jest.setSystemTime(new Date(iso));
};

const lastOtpSentTo = (email) => {
  const call = [...sendMail.mock.calls]
    .reverse()
    .find(([opts]) => opts.to.toLowerCase() === email.toLowerCase());
  if (!call) throw new Error("No email sent to " + email);
  const m = call[0].text.match(/OTP is: (\d{6})/);
  return m && m[1];
};

let seq = 0;
// Full real flow: register -> read OTP from the (mocked) email -> verify.
const signup = async (role = "jobseeker", overrides = {}) => {
  seq += 1;
  const body = {
    name: `${role} ${seq}`,
    email: `${role}${seq}@example.com`,
    password: "Passw0rd!",
    role,
    ...overrides,
  };
  await request(app).post("/api/auth/register").send(body).expect(201);
  const otp = lastOtpSentTo(body.email);
  const res = await request(app)
    .post("/api/auth/verify-otp")
    .send({ email: body.email, otp })
    .expect(200);
  return { ...body, token: res.body.token, id: res.body.user.id };
};

const auth = (user) => ({ Authorization: `Bearer ${user.token}` });

const longDescription =
  "We are hiring a backend engineer to build Node.js and Express APIs with MongoDB, " +
  "write tests, review code, design schemas, and ship features with a small product team.";

const jobPayload = (overrides = {}) => ({
  title: "Backend Engineer",
  description: longDescription,
  company: "Acme",
  location: "Bengaluru",
  salary: "8 LPA",
  salaryRange: "6-10 LPA",
  skills: ["Node.js", "MongoDB"],
  workType: "Remote",
  experienceRequired: "1-3 years",
  ...overrides,
});

const createJob = async (recruiter, overrides) => {
  const res = await request(app)
    .post("/api/jobs/create")
    .set(auth(recruiter))
    .send(jobPayload(overrides))
    .expect(201);
  return res.body.job;
};

const resumePayload = (overrides = {}) => ({
  name: "Backend Resume",
  personalInfo: { name: "Asha", email: "asha@example.com", phone: "999" },
  education: [{ eduType: "university", university: "IIT", degree: "B.Tech" }],
  experience: [{ company: "Acme", role: "Intern", bullets: ["Built APIs"] }],
  projects: [{ name: "JobVerse", techStack: "MERN", url: "github.com/x", bullets: ["Shipped"] }],
  skills: { languages: "JavaScript", frameworks: "Express" },
  ...overrides,
});

const createResume = async (user, overrides) => {
  const res = await request(app)
    .post("/api/resume/save")
    .set(auth(user))
    .send(resumePayload(overrides))
    .expect(200);
  return res.body.resume;
};

const signToken = (payload, opts = { expiresIn: "7d" }, secret = process.env.JWT_SECRET) =>
  jwt.sign(payload, secret, opts);

module.exports = {
  app, request, mongoose, sendMail, generateContent, cloudinary,
  useTestDb, freezeClock, lastOtpSentTo, signup, auth, jobPayload, createJob,
  resumePayload, createResume, signToken, longDescription,
};
