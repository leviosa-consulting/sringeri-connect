import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

function createTransporter() {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD environment variables are required");
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });
}

export async function sendPasswordResetEmail(toEmail: string, resetLink: string): Promise<void> {
  const transporter = createTransporter();
  const fromName = "Sringeri Sharada Peetham";
  const from = `"${fromName}" <${GMAIL_USER}>`;

  await transporter.sendMail({
    from,
    to: toEmail,
    subject: "Reset your password — Sringeri App",
    text: `Namaste,\n\nWe received a request to reset the password for your Sringeri App account.\n\nClick the link below to reset your password:\n${resetLink}\n\nThis link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.\n\nJai Maa Sharade,\nSri Sringeri Sharada Peetham`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#F7F2EC;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F2EC;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#FF6600;padding:28px 32px;text-align:center;">
              <p style="margin:0;color:#ffffff;font-size:13px;letter-spacing:2px;text-transform:uppercase;font-family:Georgia,serif;">Sri Sringeri Sharada Peetham</p>
              <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;font-family:Georgia,serif;font-weight:bold;">Sringeri App</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 28px;">
              <p style="margin:0 0 8px;color:#5C4033;font-size:16px;">Namaste 🙏</p>
              <p style="margin:0 0 20px;color:#3D2B1F;font-size:15px;line-height:1.6;">
                We received a request to reset the password for your Sringeri App account associated with <strong>${toEmail}</strong>.
              </p>
              <p style="margin:0 0 28px;color:#3D2B1F;font-size:15px;line-height:1.6;">
                Click the button below to choose a new password. This link is valid for <strong>1 hour</strong>.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td align="center" style="background:#FF6600;border-radius:8px;">
                    <a href="${resetLink}"
                       style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:15px;font-family:Georgia,serif;font-weight:bold;text-decoration:none;letter-spacing:0.5px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 6px;color:#7A6152;font-size:13px;line-height:1.5;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 28px;word-break:break-all;">
                <a href="${resetLink}" style="color:#FF6600;font-size:13px;">${resetLink}</a>
              </p>
              <p style="margin:0;color:#7A6152;font-size:13px;line-height:1.5;">
                If you did not request a password reset, please ignore this email. Your account remains secure.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#FDF8F3;border-top:1px solid #EDE0D4;padding:20px 32px;text-align:center;">
              <p style="margin:0;color:#9C7E6A;font-size:13px;font-family:Georgia,serif;font-style:italic;">Jai Maa Sharade</p>
              <p style="margin:4px 0 0;color:#B0927A;font-size:12px;">Sri Sringeri Sharada Peetham, Sringeri — 577 139, Karnataka, India</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
}

export function isEmailServiceConfigured(): boolean {
  return !!(GMAIL_USER && GMAIL_APP_PASSWORD);
}
