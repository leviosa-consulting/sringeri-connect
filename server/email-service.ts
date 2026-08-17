import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

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

function getLogoAttachment() {
  const logoPath = path.join(process.cwd(), "client", "public", "sringeri-logo.png");
  if (fs.existsSync(logoPath)) {
    return {
      filename: "sringeri-logo.png",
      path: logoPath,
      cid: "sringeri-logo",
    };
  }
  return null;
}

export async function sendPasswordResetEmail(toEmail: string, resetLink: string): Promise<void> {
  const transporter = createTransporter();
  const from = `"Online Services, Sringeri Sharada Peetham" <${GMAIL_USER}>`;
  const logoAttachment = getLogoAttachment();
  const logoHtml = logoAttachment
    ? `<img src="cid:sringeri-logo" alt="Online Services, Sringeri Sharada Peetham" style="height:44px;width:auto;display:block;"/>`
    : `<p style="margin:0;color:#FF6600;font-size:14px;font-weight:bold;font-family:Georgia,serif;">Online Services, Sringeri Sharada Peetham</p>`;

  await transporter.sendMail({
    from,
    to: toEmail,
    subject: "Reset your password — Online Services, Sringeri Sharada Peetham",
    text: `Namaste,\n\nWe received a request to reset the password for your account.\n\nClick the link below to choose a new password (valid for 1 hour):\n${resetLink}\n\nIf you did not request this, you can safely ignore this email.\n\nRegards,\nOnline Services Team\nSringeri Sharada Peetham`,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F7F2EC;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F2EC;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#FFF8F0;border-bottom:1px solid #f0e0cc;padding:20px 32px;text-align:center;">
              ${logoHtml}
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
              <p style="margin:0;color:#7A6152;font-size:13px;">Sringeri Sharada Peetham</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    attachments: logoAttachment ? [logoAttachment] : [],
  });
}

export function isEmailServiceConfigured(): boolean {
  return !!(GMAIL_USER && GMAIL_APP_PASSWORD);
}

// ---------------------------------------------------------------------------
// Live Chat emails
// ---------------------------------------------------------------------------

export const SUPPORT_MAILBOX = process.env.SUPPORT_MAILBOX || "online@sringeri.net";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Shared cream/maroon shell used by every live-chat email. */
function wrap(bodyHtml: string, logoHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F7F2EC;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F2EC;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:#FFF8F0;border-bottom:1px solid #f0e0cc;padding:20px 32px;text-align:center;">${logoHtml}</td></tr>
        <tr><td style="padding:32px;color:#3D2B1F;font-size:15px;line-height:1.6;">${bodyHtml}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function transcriptHtml(transcript: { author: string; content: string }[]): string {
  if (!transcript.length) return "";
  const rows = transcript
    .map((line) => {
      const who = line.author === "user" ? "Devotee" : line.author === "agent" ? "Team" : line.author === "bot" ? "Sahayak" : "System";
      return `<p style="margin:0 0 8px;"><strong style="color:#7A2E1E;">${who}:</strong> ${escapeHtml(line.content).replace(/\n/g, "<br/>")}</p>`;
    })
    .join("");
  return `<div style="background:#FAF6F0;border:1px solid #f0e0cc;border-radius:8px;padding:16px;margin:16px 0;font-size:14px;">${rows}</div>`;
}

interface ChatEmailPayload {
  conversationId: number;
  name: string;
  email: string;
  phone?: string | null;
  concern: string;
  transcript: { author: string; content: string }[];
}

/**
 * Sent to the devotee the moment we take their concern offline, promising a
 * reply within 2–4 hours.
 */
export async function sendChatOfflineAcknowledgement(payload: ChatEmailPayload): Promise<void> {
  const transporter = createTransporter();
  const logoAttachment = getLogoAttachment();
  const logoHtml = logoAttachment
    ? `<img src="cid:sringeri-logo" alt="Online Services, Sringeri Sharada Peetham" style="height:44px;width:auto;display:block;margin:0 auto;"/>`
    : `<p style="margin:0;color:#FF6600;font-size:14px;font-weight:bold;">Online Services, Sringeri Sharada Peetham</p>`;

  const body = `
    <p style="margin:0 0 12px;">Namaste ${escapeHtml(payload.name)} 🙏</p>
    <p style="margin:0 0 12px;">Thank you for writing to us. Our team is offline at the moment, so we have recorded your concern and a member of the team will reply within <strong>2–4 hours</strong>.</p>
    <p style="margin:0 0 4px;font-size:13px;color:#7A6152;">Your message</p>
    <div style="background:#FAF6F0;border-left:3px solid #FF6600;padding:12px 16px;border-radius:0 8px 8px 0;margin:0 0 20px;">${escapeHtml(payload.concern).replace(/\n/g, "<br/>")}</div>
    <p style="margin:0 0 4px;">Regards,</p>
    <p style="margin:0;font-weight:bold;">Online Services Team</p>
    <p style="margin:0;color:#7A6152;font-size:13px;">Sringeri Sharada Peetham</p>`;

  await transporter.sendMail({
    from: `"Online Services, Sringeri Sharada Peetham" <${GMAIL_USER}>`,
    to: payload.email,
    replyTo: SUPPORT_MAILBOX,
    subject: `We have received your message — Sringeri Online Services (#${payload.conversationId})`,
    text: `Namaste ${payload.name},\n\nThank you for writing to us. Our team is offline at the moment, so we have recorded your concern and a member of the team will reply within 2-4 hours.\n\nYour message:\n${payload.concern}\n\nRegards,\nOnline Services Team\nSringeri Sharada Peetham`,
    html: wrap(body, logoHtml),
    attachments: logoAttachment ? [logoAttachment] : [],
  });
}

/** Sent to the support mailbox so the team can pick the concern up. */
export async function sendChatConcernToSupport(payload: ChatEmailPayload): Promise<void> {
  const transporter = createTransporter();
  const logoAttachment = getLogoAttachment();
  const logoHtml = logoAttachment
    ? `<img src="cid:sringeri-logo" alt="Online Services" style="height:40px;width:auto;display:block;margin:0 auto;"/>`
    : `<p style="margin:0;color:#FF6600;font-size:14px;font-weight:bold;">Online Services</p>`;

  const body = `
    <p style="margin:0 0 12px;font-size:16px;"><strong>Live Chat concern #${payload.conversationId}</strong></p>
    <p style="margin:0 0 4px;"><strong>Name:</strong> ${escapeHtml(payload.name)}</p>
    <p style="margin:0 0 4px;"><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
    ${payload.phone ? `<p style="margin:0 0 4px;"><strong>Phone:</strong> ${escapeHtml(payload.phone)}</p>` : ""}
    <p style="margin:12px 0 4px;font-size:13px;color:#7A6152;">Concern</p>
    <div style="background:#FAF6F0;border-left:3px solid #FF6600;padding:12px 16px;border-radius:0 8px 8px 0;">${escapeHtml(payload.concern).replace(/\n/g, "<br/>")}</div>
    <p style="margin:16px 0 4px;font-size:13px;color:#7A6152;">Transcript</p>
    ${transcriptHtml(payload.transcript)}
    <p style="margin:16px 0 0;font-size:13px;color:#7A6152;">Reply from the Live Chat console in the admin area, or answer this email directly.</p>`;

  await transporter.sendMail({
    from: `"Sringeri Live Chat" <${GMAIL_USER}>`,
    to: SUPPORT_MAILBOX,
    replyTo: payload.email,
    subject: `[Live Chat #${payload.conversationId}] ${payload.name} — offline concern`,
    text: `Live Chat concern #${payload.conversationId}\n\nName: ${payload.name}\nEmail: ${payload.email}\nPhone: ${payload.phone || "-"}\n\nConcern:\n${payload.concern}\n\nTranscript:\n${payload.transcript.map(l => `${l.author}: ${l.content}`).join("\n")}`,
    html: wrap(body, logoHtml),
    attachments: logoAttachment ? [logoAttachment] : [],
  });
}

/** Sent when an agent answers a chat the devotee has already left. */
export async function sendChatAgentReplyEmail(
  toEmail: string,
  name: string,
  conversationId: number,
  reply: string,
): Promise<void> {
  const transporter = createTransporter();
  const logoAttachment = getLogoAttachment();
  const logoHtml = logoAttachment
    ? `<img src="cid:sringeri-logo" alt="Online Services, Sringeri Sharada Peetham" style="height:44px;width:auto;display:block;margin:0 auto;"/>`
    : `<p style="margin:0;color:#FF6600;font-size:14px;font-weight:bold;">Online Services, Sringeri Sharada Peetham</p>`;

  const body = `
    <p style="margin:0 0 12px;">Namaste ${escapeHtml(name)} 🙏</p>
    <p style="margin:0 0 12px;">Here is our reply to the message you sent us through Live Chat:</p>
    <div style="background:#FAF6F0;border-left:3px solid #FF6600;padding:12px 16px;border-radius:0 8px 8px 0;margin:0 0 20px;">${escapeHtml(reply).replace(/\n/g, "<br/>")}</div>
    <p style="margin:0 0 12px;font-size:13px;color:#7A6152;">You can continue the conversation by replying to this email or by reopening Live Chat in the app.</p>
    <p style="margin:0 0 4px;">Regards,</p>
    <p style="margin:0;font-weight:bold;">Online Services Team</p>
    <p style="margin:0;color:#7A6152;font-size:13px;">Sringeri Sharada Peetham</p>`;

  await transporter.sendMail({
    from: `"Online Services, Sringeri Sharada Peetham" <${GMAIL_USER}>`,
    to: toEmail,
    replyTo: SUPPORT_MAILBOX,
    subject: `Reply from Sringeri Online Services (#${conversationId})`,
    text: `Namaste ${name},\n\nHere is our reply to the message you sent us through Live Chat:\n\n${reply}\n\nRegards,\nOnline Services Team\nSringeri Sharada Peetham`,
    html: wrap(body, logoHtml),
    attachments: logoAttachment ? [logoAttachment] : [],
  });
}
