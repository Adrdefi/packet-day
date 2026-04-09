import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY environment variable");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_EMAIL = "Packet Day <hello@packetday.com>";

export async function sendWelcomeEmail(to: string, name: string) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Welcome to Packet Day!",
    html: `<p>Hi ${name},</p>
<p>You're in! We're so glad you're here.</p>
<p>Packet Day is your backup plan for the hard days — ready whenever you need it.</p>
<p>Warmly,<br/>The Packet Day team</p>`,
  });
}

export async function sendPacketReadyEmail(
  to: string,
  name: string,
  packetTitle: string,
  pdfUrl: string
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Your packet is ready: ${packetTitle}`,
    html: `<p>Hi ${name},</p>
<p>Great news — your learning packet "<strong>${packetTitle}</strong>" is ready to print!</p>
<p><a href="${pdfUrl}">Download your packet</a></p>
<p>Hope today is a good day. You've got this.</p>
<p>Warmly,<br/>The Packet Day team</p>`,
  });
}
