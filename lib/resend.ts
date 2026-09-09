import { Resend } from "resend";

export const FROM_EMAIL = "Packet Day <hello@packetday.com>";

// ─── Lazy client ──────────────────────────────────────────────────────────────

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY environment variable");
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string) {
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Welcome to Packet Day!",
    html: `<p>Hi ${name},</p>
<p>You're in! We're so glad you're here.</p>
<p>Packet Day is your backup plan for the hard days — ready whenever you need it.</p>
<p>Warmly,<br/>The Packet Day team</p>`,
  });
}

// Non-academic activity subjects that shouldn't be named as "what's inside" —
// they're real activities but naming them alongside Math/Reading reads like a
// manifest rather than a warm description of the day.
const NON_ACADEMIC_SUBJECTS = new Set(["Puzzle Break", "Movement Break"]);

function buildSubjectsPhrase(subjects: string[]): string {
  const academic = subjects.filter((s) => !NON_ACADEMIC_SUBJECTS.has(s));
  const unique = [...new Set(academic)].slice(0, 2).map((s) => s.toLowerCase());

  if (unique.length === 0) return "a full day of activities";
  if (unique.length === 1) return unique[0];
  return `${unique[0]} and ${unique[1]}`;
}

function buildMascotIntro(mascotName: string | null): string {
  return mascotName
    ? `${mascotName} helped pull this one together, and it's attached and ready to print.`
    : `It's all ready, and it's attached and ready to print.`;
}

function buildHeroRow(heroImageUrl: string | null, mascotName: string | null): string {
  if (!heroImageUrl) return "";
  return `
        <tr>
          <td align="center" style="padding:8px 40px 0 40px;">
            <img src="${heroImageUrl}" alt="${mascotName ?? "Packet Day mascot"}" width="160" height="160" style="display:block;width:160px;height:160px;border-radius:50%;background-color:#FDFBF7;" />
          </td>
        </tr>`;
}

interface SendPacketReadyEmailParams {
  to: string;
  childName: string;
  theme: string;
  mascotName: string | null;
  heroImageUrl: string | null;
  subjects: string[];
  pdfBuffer: Uint8Array;
  filename: string;
}

export async function sendPacketReadyEmail(params: SendPacketReadyEmailParams) {
  const { to, childName, theme, mascotName, heroImageUrl, subjects, pdfBuffer, filename } = params;

  const subjectsPhrase = buildSubjectsPhrase(subjects);
  const mascotIntro = buildMascotIntro(mascotName);
  const heroRow = buildHeroRow(heroImageUrl, mascotName);

  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FDFBF7;padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;">
        <tr>
          <td align="center" style="padding:32px 40px 8px 40px;">
            <p style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:20px;font-weight:700;color:#4A7C59;letter-spacing:-0.2px;">Packet Day</p>
          </td>
        </tr>${heroRow}
        <tr>
          <td align="center" style="padding:20px 40px 0 40px;">
            <h1 style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:24px;font-weight:700;color:#1A1A2E;line-height:1.3;">${childName}'s ${theme} packet is ready!</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 40px 8px 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.65;color:#1A1A2E;">
            <p style="margin:0 0 14px 0;">${mascotIntro}</p>
            <p style="margin:0 0 14px 0;">Today's mix: ${subjectsPhrase}, a coloring page, and a certificate of completion waiting at the end.</p>
            <p style="margin:0;">Print it, hand it over, and you've got today covered.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px 0 40px;">
            <hr style="border:none;border-top:1px solid #F0EAE0;margin:0;" />
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:20px 40px 32px 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <p style="margin:0;font-size:14px;color:#1A1A2E;">Warmly,<br/>The Packet Day team</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${childName}'s ${theme} packet is ready to print!`,
    html,
    attachments: [
      {
        filename,
        content: Buffer.from(pdfBuffer),
      },
    ],
  });
}
