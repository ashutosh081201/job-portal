// Runs before every test file. Nothing here may touch a real service.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.EMAIL_USER = "noreply@test.local";
process.env.EMAIL_PASS = "not-a-real-password";
process.env.GEMINI_API_KEY = "test-gemini-key";
process.env.CLOUDINARY_NAME = "test";
process.env.CLOUDINARY_API_KEY = "test";
process.env.CLOUDINARY_API_SECRET = "test";
process.env.ATS_RETRY_BASE_MS = "0"; // retries without real waiting
delete process.env.MONGO_URI;
delete process.env.BREVO_API_KEY;

// Loading the real .env from a test is a bug: fail loudly.
jest.mock("dotenv", () => ({
  config: () => {
    throw new Error("Tests must not load .env");
  },
}));

jest.mock("nodemailer", () => {
  const sendMail = jest.fn().mockResolvedValue({ messageId: "test" });
  return { createTransport: jest.fn(() => ({ sendMail })), __sendMail: sendMail };
});

jest.mock("cloudinary", () => {
  const uploader = {
    upload: jest.fn(async (_uri, opts) => ({
      secure_url: `https://res.cloudinary.com/test/raw/upload/v1/${opts.folder}/${opts.public_id}.pdf`,
      public_id: `${opts.folder}/${opts.public_id}`,
    })),
    destroy: jest.fn().mockResolvedValue({ result: "ok" }),
  };
  return { v2: { config: jest.fn(), uploader } };
});

jest.mock("@google/generative-ai", () => {
  const generateContent = jest.fn();
  const getGenerativeModel = jest.fn(() => ({ generateContent }));
  return {
    GoogleGenerativeAI: jest.fn(() => ({ getGenerativeModel })),
    __generateContent: generateContent,
    __getGenerativeModel: getGenerativeModel,
  };
});
