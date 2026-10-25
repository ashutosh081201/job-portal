// Email transport selection. The rest of the suite uses the mocked SMTP path.
const { sendOTPEmail } = require("../config/nodemailer");
const sendMail = require("nodemailer").__sendMail;

describe("email delivery", () => {
  const realFetch = global.fetch;
  afterEach(() => {
    delete process.env.BREVO_API_KEY;
    delete process.env.EMAIL_FROM;
    global.fetch = realFetch;
    jest.clearAllMocks();
  });

  test("without BREVO_API_KEY it uses SMTP and puts the OTP in the text body", async () => {
    await sendOTPEmail("a@b.co", "123456", "Verify Your Email - JobVerse");
    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0][0];
    expect(mail).toMatchObject({ to: "a@b.co", subject: "Verify Your Email - JobVerse" });
    expect(mail.from).toBe('"JobVerse" <noreply@test.local>');
    expect(mail.text).toContain("OTP is: 123456");
  });

  test("with BREVO_API_KEY it posts to Brevo over HTTPS from EMAIL_FROM and skips SMTP", async () => {
    process.env.BREVO_API_KEY = "test-brevo-key";
    process.env.EMAIL_FROM = "hello@jobverse.test";
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    await sendOTPEmail("a@b.co", "654321", "Reset Your Password - JobVerse");
    expect(sendMail).not.toHaveBeenCalled();
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(init.headers["api-key"]).toBe("test-brevo-key");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      sender: { name: "JobVerse", email: "hello@jobverse.test" },
      to: [{ email: "a@b.co" }],
      subject: "Reset Your Password - JobVerse",
    });
    expect(body.textContent).toContain("654321");
    expect(body.htmlContent).toContain("654321".split("")[0]);
  });

  test("a Brevo error is raised with its status so callers can report it", async () => {
    process.env.BREVO_API_KEY = "test-brevo-key";
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "Key not found" });
    await expect(sendOTPEmail("a@b.co", "111111", "x")).rejects.toThrow(/Brevo responded 401: Key not found/);
  });
});
