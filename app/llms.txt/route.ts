import { PLANS } from "@/lib/stripe";
import { SITE_URL } from "@/lib/site";
import { getAllPosts } from "@/lib/blog";
import { SITUATIONS } from "@/lib/situations/registry";
import { PAGE_RANGE_TEXT, HOURS_RANGE_TEXT } from "@/lib/situations/figures";
import { getLiveUnitStudies } from "@/lib/unit-studies/loader";

// Built once at build time from the same sources the site uses (plan prices,
// figures, situation registry, blog posts), so it can't drift from the pages.
export const dynamic = "force-static";

const PAGES = [
  { path: "/", name: "Home", description: "What Packet Day is and how it works." },
  {
    path: "/sample",
    name: "Sample packet",
    description: "Every page of a real outer space packet made for a grade 4 learner named Kai, answer key included, plus the same theme at grades 1 and 7.",
  },
  { path: "/pricing", name: "Pricing", description: "The Free and Unlimited plans." },
  {
    path: "/free-worksheets",
    name: "Free worksheets vs Packet Day",
    description: "Comparison of free printable worksheets vs Packet Day's custom, theme based school days.",
  },
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

function unitStudySection(): string[] {
  const pages = getLiveUnitStudies();
  if (pages.length === 0) return [];
  return [
    "## Unit studies",
    "",
    link("Unit studies", "/unit-studies", "Themed sample packets, with real pages from each one."),
    ...pages.map((page) => link(page.h1, `/unit-studies/${page.slug}`, page.meta.description)),
    "",
  ];
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
    "- Every packet, half day or full day, has a puzzle break that rotates between a word search, maze, mini sudoku and crossword, harder for older grades (a shape sudoku for a kindergartner, a 9 by 9 for a seventh grader), plus a joke of the day.",
    `- A full day packet is a full school day, roughly ${HOURS_RANGE_TEXT} with breaks. A half day packet runs about 1 to 2 hours.`,
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
    // Live pages only, and the section only once there is one.
    ...unitStudySection(),
  ].join("\n");
}

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
