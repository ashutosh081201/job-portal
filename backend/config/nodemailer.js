const nodemailer = require("nodemailer");

// Two ways out:
//  - BREVO_API_KEY set: Brevo's HTTPS API. Render's free tier blocks outbound
//    SMTP ports, so production mail has to go over HTTPS.
//  - otherwise: Gmail SMTP with an app password, which is fine locally.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendViaBrevo = async ({ fromName, fromEmail, to, subject, text, html }) => {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Brevo responded ${res.status}: ${detail.slice(0, 200)}`);
  }
};

const deliver = async (mail) => {
  if (process.env.BREVO_API_KEY) return sendViaBrevo(mail);
  await transporter.sendMail({
    from: `"${mail.fromName}" <${mail.fromEmail}>`,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
};

const sendOTPEmail = async (email, otp, subject, otpSubject, customHtml) => {
  const otpDigits = otp
    ? otp
        .toString()
        .split("")
        .map(
          (digit) => `
            <td style="padding: 0 4px;">
              <div style="
                width: 40px;
                height: 52px;
                background: #ffffff;
                border: 2px solid #3b82f6;
                border-radius: 10px;
                text-align: center;
                line-height: 52px;
                font-size: 26px;
                font-weight: 800;
                color: #2563eb;
                font-family: 'Courier New', monospace;
              ">${digit}</div>
            </td>
          `,
        )
        .join("")
    : "";

  // ✅ FIXED — preheader text is 170+ chars so it fills Gmail Android's
  // notification preview buffer naturally. No need for &zwnj; filler
  // since Gmail counts those as zero-width and ignores them entirely.
  const preheaderText = otp
    ? `Your OTP is: ${otp} — Valid for 10 minutes — Do not share this code with anyone, including JobVerse support — This is an automated security message — Discard after use`
    : subject;

  const defaultHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; }
    table { border-collapse: collapse; }
    img { border: 0; display: block; }
    @media only screen and (max-width: 600px) {
      .email-wrapper { width: 100% !important; padding: 16px !important; }
      .email-card   { padding: 24px 16px !important; border-radius: 12px !important; }
      .otp-digit    { width: 34px !important; height: 44px !important; line-height: 44px !important; font-size: 22px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9;">

  <!--
    ✅ PREHEADER — invisible when email is opened.
    170+ char text fills Gmail Android's preview buffer naturally
    so email body content never bleeds into the notification.
  -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#f1f5f9;line-height:1px;">
    ${preheaderText}
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color:#f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">

        <table class="email-card" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="
            max-width: 520px;
            background: #ffffff;
            border-radius: 16px;
            padding: 40px 32px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          ">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <div style="
                display: inline-block;
                background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
                border-radius: 12px;
                padding: 12px 24px;
              ">
                <span style="
                  font-size: 24px;
                  font-weight: 800;
                  font-family: Arial, sans-serif;
                  color: #ffffff;
                  letter-spacing: -0.5px;
                ">Job<span style="color: #3b82f6;">Verse</span></span>
              </div>
              <p style="
                margin: 10px 0 0;
                color: #94a3b8;
                font-size: 12px;
                font-family: Arial, sans-serif;
                letter-spacing: 0.5px;
                text-transform: uppercase;
              ">AI-Powered Career Platform</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding-bottom: 28px;">
              <div style="height: 1px; background: #e2e8f0;"></div>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td align="center" style="padding-bottom: 8px;">
              <h2 style="
                margin: 0;
                font-size: 22px;
                font-weight: 700;
                color: #1e293b;
                font-family: Arial, sans-serif;
              ">${subject}</h2>
            </td>
          </tr>

          <!-- Subtitle -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <p style="
                margin: 0;
                font-size: 14px;
                color: #64748b;
                font-family: Arial, sans-serif;
                line-height: 1.6;
              ">
                Use the OTP below to continue.<br/>
                This code expires in <strong style="color:#1e293b;">10 minutes</strong>.
              </p>
            </td>
          </tr>

          <!-- OTP Digits -->
          ${
            otpDigits
              ? `
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <div style="
                background: #f8fafc;
                border-radius: 12px;
                padding: 24px 16px;
                display: inline-block;
              ">
                <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                  <tr>${otpDigits}</tr>
                </table>
                <p style="
                  margin: 14px 0 0;
                  font-size: 11px;
                  color: #94a3b8;
                  font-family: Arial, sans-serif;
                  text-align: center;
                ">⏱ Valid for 10 minutes only</p>
              </div>
            </td>
          </tr>
          `
              : ""
          }

          <!-- Warning -->
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <table cellpadding="0" cellspacing="0" border="0"
                style="
                  background: #fef9c3;
                  border: 1px solid #fde68a;
                  border-radius: 8px;
                  padding: 12px 20px;
                  max-width: 380px;
                  width: 100%;
                ">
                <tr>
                  <td align="center">
                    <p style="
                      margin: 0;
                      font-size: 13px;
                      color: #92400e;
                      font-family: Arial, sans-serif;
                      line-height: 1.5;
                    ">
                      ⚠️ If you didn't request this, please ignore this email.
                      Your account is safe.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding-bottom: 20px;">
              <div style="height: 1px; background: #e2e8f0;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center">
              <p style="
                margin: 0 0 4px;
                font-size: 12px;
                color: #94a3b8;
                font-family: Arial, sans-serif;
              ">© 2026 JobVerse</p>
              <p style="
                margin: 0;
                font-size: 11px;
                color: #cbd5e1;
                font-family: Arial, sans-serif;
              ">Made with ❤️ by Ashutosh</p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `;

  const plainText = otp
    ? `${subject}\n\nYour JobVerse OTP is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, please ignore this email.`
    : subject;

  await deliver({
    fromName: "JobVerse",
    // Brevo only sends from a sender address you have verified with them
    fromEmail: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject,
    text: plainText,
    html: customHtml || defaultHtml,
  });
};

module.exports = { sendOTPEmail };
