import { greeting } from "@/lib/firstName";
import { possessive } from "@/lib/possessive";
import { buildGenerateLink, buildUpgradeLink } from "@/lib/emails/links";
import { escapeHtml, renderMarketingEmail } from "@/lib/emails/layout";

export interface EmailTemplateParams {
  userId: string;
  fullName: string | null;
}

export interface PacketBackTemplateParams extends EmailTemplateParams {
  childName: string;
  theme: string;
  /** The actual email_sends key this send will claim (e.g. "packet_back_monthly:2026-10"). Passed through to renderMarketingEmail — only ever meaningful for the one-time address-lock exception in lib/emailFooter.ts. Omit for a normal, strict send. */
  emailSendKey?: string;
}

export interface EmailContent {
  subject: string;
  preview: string;
  html: string;
  text: string;
}

// ─── Paragraph helpers ──────────────────────────────────────────────────────
// Every paragraph in a content block gets a 14px bottom margin except the
// block's last child, which gets none — the next <tr>'s own padding takes
// over from there. Shared across every template below so they can't drift.

function p(text: string, last = false): string {
  return `            <p style="margin:${last ? "0" : "0 0 14px 0"};">${text}</p>`;
}

function htmlBlock(lines: string[]): string {
  return lines.map((line, i) => p(line, i === lines.length - 1)).join("\n");
}

function textBlock(lines: string[]): string {
  return lines.join("\n\n");
}

// ─── welcome_1 ──────────────────────────────────────────────────────────────

export function buildWelcome1Email({ userId, fullName }: EmailTemplateParams): EmailContent {
  const greet = greeting(fullName);
  const generateUrl = buildGenerateLink("welcome_1");

  const preCtaLines = [
    greet,
    "I'm Natalie, and I'm so glad you're here.",
    "Tell us your kid's name, grade, and one thing they're obsessed with. A minute or two later you'll have a full learning packet built around them, with their name on it and a character made just for them. It's a full school day, roughly 2 to 5 hours with breaks, and it lands in your inbox ready to print.",
    "Your first one is free. Let's make it.",
  ];
  const postCtaLines = [
    "Natalie",
    "P.S. Vivian is in an upcoming production of Oliver!, so we made her an Oliver Twist packet. Her guide was Dodger the Fox, and she was thrilled. He felt like someone from her own cast.",
  ];

  const { html, text } = renderMarketingEmail({
    userId,
    preview: "All you need is a name, a grade, and one thing they love.",
    preCtaHtml: htmlBlock(preCtaLines),
    preCtaText: textBlock(preCtaLines),
    cta: { label: "Make My First Packet", url: generateUrl },
    postCtaHtml: htmlBlock(postCtaLines),
    postCtaText: textBlock(postCtaLines),
  });

  return {
    subject: "Your first packet is 2 minutes away",
    preview: "All you need is a name, a grade, and one thing they love.",
    html,
    text,
  };
}

// ─── nudge_2 ────────────────────────────────────────────────────────────────

export function buildNudge2Email({ userId, fullName }: EmailTemplateParams): EmailContent {
  const greet = greeting(fullName);
  const generateUrl = buildGenerateLink("nudge_2");

  const listItemsHtml = ["Their name", "Their grade", "One thing they love (dinosaurs, baking, Minecraft, anything)"]
    .map((item, i, arr) => `              <li style="margin:${i === arr.length - 1 ? "0" : "0 0 4px 0"};">${item}</li>`)
    .join("\n");

  const preCtaHtml = [
    p(greet),
    p("Quick check in. I noticed you haven't made your first packet yet, and I have a guess why: it feels like there's probably prep involved."),
    p("There isn't. All you enter is:"),
    `            <ol style="margin:0 0 14px 0;padding-left:20px;">\n${listItemsHtml}\n            </ol>`,
    p(
      "That's it. A minute or two later there's a packet in your inbox, ready to print, with their name on it and a character built around what they love. Kids lose their minds over seeing their own name in their schoolwork. Mine did.",
      true
    ),
  ].join("\n");

  const preCtaText = textBlock([
    greet,
    "Quick check in. I noticed you haven't made your first packet yet, and I have a guess why: it feels like there's probably prep involved.",
    "There isn't. All you enter is:\n1. Their name\n2. Their grade\n3. One thing they love (dinosaurs, baking, Minecraft, anything)",
    "That's it. A minute or two later there's a packet in your inbox, ready to print, with their name on it and a character built around what they love. Kids lose their minds over seeing their own name in their schoolwork. Mine did.",
  ]);

  const postCtaLines = ["Natalie"];

  const { html, text } = renderMarketingEmail({
    userId,
    preview: "You don't need to prep anything. I promise.",
    preCtaHtml,
    preCtaText,
    cta: { label: "Make My First Packet", url: generateUrl },
    postCtaHtml: htmlBlock(postCtaLines),
    postCtaText: textBlock(postCtaLines),
  });

  return {
    subject: "It really is just a name and a dinosaur \u{1F995}",
    preview: "You don't need to prep anything. I promise.",
    html,
    text,
  };
}

// ─── story_3 ────────────────────────────────────────────────────────────────

export function buildStory3Email({ userId, fullName }: EmailTemplateParams): EmailContent {
  const greet = greeting(fullName);
  const generateUrl = buildGenerateLink("story_3");

  const preCtaLines = [
    greet,
    "I want to tell you why Packet Day exists, because it might be why you're here too.",
    "In our house, Friday is pizza night and Packet Day. Every Friday I made a fun learning packet for Oliver and Vivian. I'd hunt for activities, then print, cut, and staple, usually late Thursday night. It took longer than I'd like, and sometimes I'd accidentally add duplicates (which my kids were quick to point out). The thing I invented to make Fridays fun became the thing that wasn't so fun for me.",
    "Andy, my husband, is the techy one in our family. He built something for me and made my dream come to life: a generator that makes the whole packet around each child and what they're into that week, in a minute or two. No stress, no duplicates, and a brand new packet every time with reading, math, writing, and even a movement break built in. It takes so much off my plate, and I think it can help you too.",
    "Now my kids beg me to make packets. A new theme, a new character, even a holiday like National Burger Day, Presidents Day, or Dr. Seuss Day. They think that part is the coolest.",
    "If your Fridays, sick days, or rainy days could use a little help, make a packet and see.",
  ];
  const postCtaLines = ["Natalie"];

  const { html, text } = renderMarketingEmail({
    userId,
    preview: "A fun end to the week, and the story behind it.",
    preCtaHtml: htmlBlock(preCtaLines),
    preCtaText: textBlock(preCtaLines),
    cta: { label: "Make a Packet and See", url: generateUrl },
    postCtaHtml: htmlBlock(postCtaLines),
    postCtaText: textBlock(postCtaLines),
  });

  return {
    subject: "Friday is pizza night and Packet Day",
    preview: "A fun end to the week, and the story behind it.",
    html,
    text,
  };
}

// ─── plans_4 ────────────────────────────────────────────────────────────────

export function buildPlans4Email({ userId, fullName }: EmailTemplateParams): EmailContent {
  const greet = greeting(fullName);
  const upgradeUrl = buildUpgradeLink("plans_4");

  const preCtaLines = [
    greet,
    "Here's how the plans work, so there are no surprises.",
    "Free: one packet a month, no card needed.",
    "Unlimited: as many packets as you want, for every kid in your house. $9 a month billed yearly, or $12 month to month.",
    "One price covers all your kids. A store workbook costs about the same as a month of Unlimited, and it wasn't made for your kid.",
    "If you're already thinking about the next sick day, go Unlimited.",
  ];
  const postCtaLines = [
    "If not, your free packet will be waiting next month. No countdown timers, no fake urgency.",
    "Natalie",
  ];

  const { html, text } = renderMarketingEmail({
    userId,
    preview: "How the plans work, no surprises.",
    preCtaHtml: htmlBlock(preCtaLines),
    preCtaText: textBlock(preCtaLines),
    cta: { label: "Go Unlimited", url: upgradeUrl },
    postCtaHtml: htmlBlock(postCtaLines),
    postCtaText: textBlock(postCtaLines),
  });

  return {
    subject: "What happens after your free packet",
    preview: "How the plans work, no surprises.",
    html,
    text,
  };
}

// ─── faq_5 ──────────────────────────────────────────────────────────────────

const FAQ_ITEMS: Array<{ q: string; a: string }> = [
  { q: "What ages?", a: "Kindergarten through 8th grade." },
  {
    q: "What's actually in a packet?",
    a: "Reading, math, and writing, plus a rotating subject like science or history, a puzzle break, a get up and move break, a coloring page, and a certificate at the end. There's an answer sheet for you in the back. It's 11 to 17 pages, a full school day, roughly 2 to 5 hours with breaks.",
  },
  { q: "How do I get it?", a: "It downloads right away and lands in your inbox too." },
  { q: "Do I need a special printer?", a: "Nope. Any home printer works." },
  {
    q: "What if my kid hates worksheets?",
    a: "Fair. But a worksheet with their name on it and a character built around their obsession feels different. That's the whole bet.",
  },
  { q: "Can I really try it free?", a: "Yes. One packet a month, no card." },
];

export function buildFaq5Email({ userId, fullName }: EmailTemplateParams): EmailContent {
  const greet = greeting(fullName);
  const generateUrl = buildGenerateLink("faq_5");

  const preCtaHtml = [
    p(greet),
    p("Last email in this little series. Just the questions everyone asks, answered straight."),
    ...FAQ_ITEMS.map((item, i) =>
      p(`<strong>${item.q}</strong> ${item.a}`, i === FAQ_ITEMS.length - 1)
    ),
  ].join("\n");

  const preCtaText = textBlock([
    greet,
    "Last email in this little series. Just the questions everyone asks, answered straight.",
    ...FAQ_ITEMS.map((item) => `${item.q} ${item.a}`),
  ]);

  const postCtaLines = [
    "Thanks for reading these. If you ever want to reply and tell us what's going on with your kids' learning, we read everything.",
    "Natalie",
  ];

  const { html, text } = renderMarketingEmail({
    userId,
    preview: "Printing, what's inside, ages. The real FAQ.",
    preCtaHtml,
    preCtaText,
    cta: { label: "Make Yours Here", url: generateUrl },
    postCtaHtml: htmlBlock(postCtaLines),
    postCtaText: textBlock(postCtaLines),
  });

  return {
    subject: "Will this actually work for my kid?",
    preview: "Printing, what's inside, ages. The real FAQ.",
    html,
    text,
  };
}

// ─── checkin_day1 ───────────────────────────────────────────────────────────
// Reply only, no button — the "one CTA button per email" rule is satisfied
// by having zero, not by substituting a link for it.

export function buildCheckinDay1Email({ userId, fullName }: EmailTemplateParams): EmailContent {
  const greet = greeting(fullName);

  const preCtaLines = [
    greet,
    "You made your first packet! I'm always a little nervous and a lot excited to hear how it went.",
    "Did they like their character? Was there a page they flew through, or one that flopped? Hit reply and tell us. And if you snapped a photo of your kid working on it, we would love to see it.",
    "Natalie",
    "P.S. Your packet is saved in your inbox, in case you need to print it again.",
  ];

  const { html, text } = renderMarketingEmail({
    userId,
    preview: "Hit reply. We'd love to hear.",
    preCtaHtml: htmlBlock(preCtaLines),
    preCtaText: textBlock(preCtaLines),
    cta: null,
    postCtaHtml: "",
    postCtaText: "",
  });

  return {
    subject: "How did it go?",
    preview: "Hit reply. We'd love to hear.",
    html,
    text,
  };
}

// ─── cap_followup ───────────────────────────────────────────────────────────

export function buildCapFollowupEmail({ userId, fullName }: EmailTemplateParams): EmailContent {
  const greet = greeting(fullName);
  const upgradeUrl = buildUpgradeLink("cap_followup");

  const preCtaLines = [
    greet,
    "Looks like you've used this month's free packet. That usually means it was a hit.",
    "If another sick day or slow Friday is coming, Unlimited means you never have to count packets again. $9 a month billed yearly, or $12 month to month, and one price covers every kid in your house.",
  ];
  const postCtaLines = ["If not, no worries. Your free packet comes back on the 1st.", "Natalie"];

  const { html, text } = renderMarketingEmail({
    userId,
    preview: "That's usually a good sign.",
    preCtaHtml: htmlBlock(preCtaLines),
    preCtaText: textBlock(preCtaLines),
    cta: { label: "Go Unlimited", url: upgradeUrl },
    postCtaHtml: htmlBlock(postCtaLines),
    postCtaText: textBlock(postCtaLines),
  });

  return {
    subject: "Out of packets already?",
    preview: "That's usually a good sign.",
    html,
    text,
  };
}

// ─── packet_back_monthly ────────────────────────────────────────────────────
// Ported from the retired one-time scripts/send-packet-back-email.ts
// (Natalie-approved copy, see git history on feat/packet-back-email) into
// this template system: the ad hoc "reply stop" footer line is dropped in
// favor of the real unsubscribe footer/headers every other marketing email
// here gets, and the copy's month reference was already generic ("a new
// month") so no wording changed there. The upgrade link stays an inline
// P.S. link, not a second button — buildGenerateLink stays the one CTA.

export function buildPacketBackMonthlyEmail({
  userId,
  fullName,
  childName,
  theme,
  emailSendKey,
}: PacketBackTemplateParams): EmailContent {
  const greet = greeting(fullName);
  const generateUrl = buildGenerateLink("packet_back_monthly");
  const upgradeUrl = buildUpgradeLink("packet_back_monthly");
  const safeChildName = escapeHtml(childName);
  const safeTheme = escapeHtml(theme);
  // Never pre-escape this — it's shared with the plain-text CTA line, and
  // renderMarketingEmail's buildCtaRow is what HTML-escapes it for the
  // button itself. See the comment above buildCtaRow in lib/emails/layout.ts.
  const possessiveChild = possessive(childName);

  const preCtaLines = [
    greet,
    "Quick note from me, Natalie. It's a new month, which means your free Packet Day packet is back!",
    `Last time ${safeChildName} got a packet all about ${safeTheme}. What are they into this week? Dinosaurs, space, a new video game, that one book they won't put down? Tell us, and we'll turn it into a full day of learning in a minute or two.`,
  ];
  const preCtaTextLines = [
    greet,
    "Quick note from me, Natalie. It's a new month, which means your free Packet Day packet is back!",
    `Last time ${childName} got a packet all about ${theme}. What are they into this week? Dinosaurs, space, a new video game, that one book they won't put down? Tell us, and we'll turn it into a full day of learning in a minute or two.`,
  ];

  const postCtaHtml = [
    p("Thanks so much for giving Packet Day a try. It means the world to our little family."),
    p("Natalie"),
    `            <p style="margin:0 0 14px 0;font-size:14px;color:#6B6B7A;">Co-founder, Packet Day</p>`,
    `            <p style="margin:0;font-size:14px;">P.S. If one packet a month isn't enough, Unlimited is just $9 a month billed yearly, and covers every kid in your house. <a href="${upgradeUrl}" style="color:#4A7C59;font-weight:700;text-decoration:underline;">See Unlimited</a></p>`,
  ].join("\n");

  const postCtaText = textBlock([
    "Thanks so much for giving Packet Day a try. It means the world to our little family.",
    "Natalie\nCo-founder, Packet Day",
    `P.S. If one packet a month isn't enough, Unlimited is just $9 a month billed yearly, and covers every kid in your house. See Unlimited: ${upgradeUrl}`,
  ]);

  const { html, text } = renderMarketingEmail({
    userId,
    emailSendKey,
    preview: "It's a new month. Your free packet is waiting.",
    preCtaHtml: htmlBlock(preCtaLines),
    preCtaText: textBlock(preCtaTextLines),
    cta: { label: `Make ${possessiveChild} packet`, url: generateUrl },
    postCtaHtml,
    postCtaText,
  });

  return {
    subject: "Your free packet is back \u{1F389}",
    preview: "It's a new month. Your free packet is waiting.",
    html,
    text,
  };
}
