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
  const from = `"Sringeri App" <${GMAIL_USER}>`;

  await transporter.sendMail({
    from,
    to: toEmail,
    subject: "Reset your password — Sringeri App",
    text: `Namaste,\n\nWe received a request to reset the password for your Sringeri App account.\n\nClick the link below to choose a new password (valid for 1 hour):\n${resetLink}\n\nIf you did not request this, you can safely ignore this email.\n\nRegards,\nOnline Services Team`,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F7F2EC;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F2EC;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#FF6600;padding:24px 32px;text-align:center;">
              <p style="margin:0;color:#ffffff;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-family:Georgia,serif;">Sri Sringeri Sharada Peetham</p>
              <h1 style="margin:4px 0 0;color:#ffffff;font-size:22px;font-family:Georgia,serif;font-weight:bold;">Sringeri App</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 32px;">
              <p style="margin:0 0 8px;color:#5C4033;font-size:16px;">Namaste 🙏</p>
              <p style="margin:0 0 20px;color:#3D2B1F;font-size:15px;line-height:1.6;">
                We received a request to reset the password for your account associated with <strong>${toEmail}</strong>.
              </p>
              <p style="margin:0 0 28px;color:#3D2B1F;font-size:15px;line-height:1.6;">
                Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td align="center" style="background:#FF6600;border-radius:8px;">
                    <a href="${resetLink}" style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:15px;font-family:Georgia,serif;font-weight:bold;text-decoration:none;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 6px;color:#7A6152;font-size:13px;">If the button doesn't work, copy and paste this link:</p>
              <p style="margin:0 0 28px;word-break:break-all;"><a href="${resetLink}" style="color:#FF6600;font-size:13px;">${resetLink}</a></p>
              <p style="margin:0 0 4px;color:#3D2B1F;font-size:14px;">Regards,</p>
              <p style="margin:0;color:#3D2B1F;font-size:14px;font-weight:bold;">Online Services Team</p>
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
