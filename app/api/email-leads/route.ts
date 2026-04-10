import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, source = "sample_packet" } = body;

    if (
      !email ||
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Upsert — silently ignore duplicate emails
    const { error: dbError } = await getSupabase()
      .from("email_leads")
      .upsert({ email: cleanEmail, source }, { onConflict: "email", ignoreDuplicates: true });

    if (dbError) {
      console.error("[email-leads] Supabase error:", dbError);
      // Don't block the response — still send the email
    }

    // Send the sample packet email via Resend
    const { error: emailError } = await getResend().emails.send({
      from: "Natalie at Packet Day <hello@packetday.com>",
      to: cleanEmail,
      subject: "Your free Dinosaur Day packet is here 🦕",
      html: buildSampleEmailHtml(),
    });

    if (emailError) {
      console.error("[email-leads] Resend error:", emailError);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[email-leads] Unexpected error:", err);
    return NextResponse.json(
      { error: "Something went sideways. Try again?" },
      { status: 500 }
    );
  }
}

function buildSampleEmailHtml(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Helvetica,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#FDFBF7;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#4A7C59;padding:40px 32px;text-align:center;">
      <p style="font-size:36px;margin:0;">📦</p>
      <h1 style="color:#FDFBF7;font-size:26px;margin:12px 0 4px;font-weight:700;">Packet Day</h1>
      <p style="color:rgba(253,251,247,0.85);margin:0;font-size:15px;">Your backup plan for the hard days.</p>
    </div>

    <!-- Body -->
    <div style="padding:40px 32px;">
      <h2 style="font-size:22px;color:#1A1A2E;margin-top:0;">Hey! Your sample packet is on its way. 👋</h2>
      <p style="font-size:16px;line-height:1.7;color:#374151;">
        I'm Natalie — I built Packet Day because I desperately needed it on my worst homeschool days.
        Oliver wanted sharks. Vivian wanted volcanoes. And I had <em>nothing</em>.
      </p>
      <p style="font-size:16px;line-height:1.7;color:#374151;">
        Below is your <strong>free Dinosaur Day packet for a 3rd grader</strong> —
        a real example of what Packet Day generates. Original math problems, a reading passage,
        a science activity, art, and PE breaks. All woven around dinosaurs.
      </p>

      <!-- Sample Packet Preview -->
      <div style="background:#FFF9EC;border:2px solid #D4A843;border-radius:16px;padding:28px;margin:28px 0;text-align:center;">
        <p style="font-size:40px;margin:0;">🦕</p>
        <h3 style="color:#A67C1E;font-size:20px;margin:12px 0 4px;">Dinosaur Day — 3rd Grade</h3>
        <p style="color:#6B7280;font-size:14px;margin:4px 0 16px;">Math · Reading · Science · Art · PE Breaks · Answer Key</p>
        <div style="display:grid;text-align:left;gap:8px;">
          <div style="background:white;border-radius:10px;padding:12px 16px;border:1px solid #E5E7EB;">
            <strong style="color:#4A7C59;">🦕 Math:</strong> <span style="color:#374151;">Measuring dinosaurs, counting fossils, dino timeline math</span>
          </div>
          <div style="background:white;border-radius:10px;padding:12px 16px;border:1px solid #E5E7EB;">
            <strong style="color:#4A7C59;">📖 Reading:</strong> <span style="color:#374151;">Dino facts passage + comprehension questions</span>
          </div>
          <div style="background:white;border-radius:10px;padding:12px 16px;border:1px solid #E5E7EB;">
            <strong style="color:#4A7C59;">🔬 Science:</strong> <span style="color:#374151;">Fossil dig activity, herbivore vs. carnivore sort</span>
          </div>
          <div style="background:white;border-radius:10px;padding:12px 16px;border:1px solid #E5E7EB;">
            <strong style="color:#4A7C59;">🎨 Art + PE:</strong> <span style="color:#374151;">Draw your own dino + "Dino Stomp" movement break</span>
          </div>
        </div>
        <p style="color:#6B7280;font-size:13px;margin:16px 0 0;">
          ✨ Full printable PDF experience live at packetday.com —
          sign up free to generate packets for your own kids!
        </p>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin:32px 0;">
        <a href="https://packetday.com/signup"
           style="background:#4A7C59;color:#FDFBF7;padding:16px 36px;border-radius:50px;
                  text-decoration:none;font-weight:700;font-size:16px;display:inline-block;letter-spacing:0.01em;">
          Try It Free — No Card Needed ✨
        </a>
        <p style="color:#6B7280;font-size:13px;margin:12px 0 0;">3 free packets/month. No credit card. Cancel anytime.</p>
      </div>

      <hr style="border:none;border-top:1px solid #E5E7EB;margin:28px 0;">
      <p style="font-size:14px;color:#6B7280;line-height:1.6;margin:0;">
        Warmly,<br>
        <strong style="color:#1A1A2E;">Natalie</strong><br>
        Co-Founder, Packet Day · Homeschool mom &amp; recovering perfectionist<br>
        👧🏻 Vivian, 8 &nbsp;·&nbsp; 👦🏼 Oliver, 10
      </p>
      <p style="font-size:12px;color:#9CA3AF;margin-top:20px;">
        You asked for our free sample packet — that's why we're here!
        No spam, ever. <a href="https://packetday.com" style="color:#9CA3AF;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
