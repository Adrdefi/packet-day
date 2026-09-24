import { PLANS } from "@/lib/stripe";
import { SITE_URL } from "@/lib/site";
import { getAllPosts } from "@/lib/blog";
import { SITUATIONS } from "@/lib/situations/registry";
import { PAGE_RANGE_TEXT, HOURS_RANGE_TEXT } from "@/lib/situations/figures";

// Built once at build time from the same sources the site uses (plan prices,
// figures, situation registry, blog posts), so it can't drift from the pages.
export const dynamic = "force-static";

const PAGES = [
  { path: "/", name: "Home", description: "What Packet Day is and how it works." },
  {
    path: "/sample",
    name: "Sample packet",
    description: "A real, full length packet made for a real 3rd grader, answer key included.",
  },
  { path: "/pricing", name: "Pricing", description: "The Free and Unlimited plans." },
  { path: "/about", name: "About", description: "The homeschool family who built Packet Day." },
  { path: "/blog", name: "Blog", description: "Homeschool ideas for the good days and the hard ones." },
];

function link(name: string, path: string, description: string): string {
  return `- [${name}](${SITE_URL}${path}): ${description}`;
}

// Post titles end in a decorative emoji that's noise in a plain-text index.
function stripTrailingEmoji(title: string): string {
  return title.replace(/(\s*\p{Extended_Pictographic}️?)+\s*$/u, "");
}

function buildLlmsTxt(): string {
  const monthly = PLANS.unlimited.monthly.price;
  const yearly = PLANS.unlimited.yearly.price;

  return [
    "# Packet Day",
    "",
    "> Packet Day makes personalized, printable learning packets for kids in K-8, each one built around whatever the child is obsessed with right now.",
    "",
    "Packet Day was built by a homeschool family. A parent enters their child's grade and current obsession, and Packet Day creates a full school day for them.",
    "",
    `- Each packet is ${PAGE_RANGE_TEXT}, built around the kid's current obsession, with an invented character who shows up through every subject.`,
    "- Packets include math, reading, science, art and movement breaks.",
    `- A packet is a full school day, roughly ${HOURS_RANGE_TEXT} with breaks.`,
    "- A packet is generated in a minute or two. The parent downloads the PDF, and it is emailed to them too.",
    "- Answer keys are included.",
    "- One free packet a month, no card required.",
    `- Unlimited is $${monthly}/month or $${yearly}/year for unlimited packets and unlimited kids.`,
    "",
    "## Pages",
    "",
    ...PAGES.map((page) => link(page.name, page.path, page.description)),
    "",
    "## Situations",
    "",
    ...SITUATIONS.map((situation) => link(situation.label, situation.href, situation.teaser)),
    "",
    "## Blog",
    "",
    ...getAllPosts().map((post) =>
      link(stripTrailingEmoji(post.title), `/blog/${post.slug}`, post.metaDescription)
    ),
    "",
  ].join("\n");
}

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
