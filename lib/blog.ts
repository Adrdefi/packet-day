import fs from "fs";
import path from "path";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

const SPEC_FIELDS = [
  "Slug",
  "Meta description",
  "Primary keyword",
  "Internal links",
  "Publish date",
] as const;

type SpecField = (typeof SPEC_FIELDS)[number];

export interface BlogFaq {
  question: string;
  answer: string;
}

export interface BlogPost {
  title: string;
  slug: string;
  metaDescription: string;
  primaryKeyword: string;
  internalLinks: string;
  publishDate: string;
  content: string;
  faqs: BlogFaq[];
  readingTime: number;
}

const WORDS_PER_MINUTE = 220;

function fail(fileName: string, message: string): never {
  throw new Error(`Blog post "${fileName}": ${message}`);
}

function parsePost(fileName: string, raw: string): BlogPost {
  const lines = raw.split("\n");

  // Title: the first non-empty line must be the H1.
  const titleLineIndex = lines.findIndex((line) => line.trim().length > 0);
  const titleLine = titleLineIndex === -1 ? "" : lines[titleLineIndex];
  if (!titleLine.startsWith("# ")) {
    fail(fileName, "missing H1 title on the first non-empty line");
  }
  const title = titleLine.slice(2).trim();
  if (!title) {
    fail(fileName, "H1 title is empty");
  }

  // Spec block: every line between the title and the first "---" fence.
  const fenceIndex = lines.findIndex(
    (line, i) => i > titleLineIndex && line.trim() === "---"
  );
  if (fenceIndex === -1) {
    fail(fileName, "no closing `---` fence found after the spec block");
  }

  const specLines = lines.slice(titleLineIndex + 1, fenceIndex);
  const specValues: Partial<Record<SpecField, string>> = {};
  const fieldPattern = /^\*\*([^:]+):\*\*\s*(.*)$/;

  for (const line of specLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(fieldPattern);
    if (!match) continue;
    const [, rawField, value] = match;
    const field = SPEC_FIELDS.find((f) => f === rawField.trim());
    if (field) {
      specValues[field] = value.trim();
    }
  }

  for (const field of SPEC_FIELDS) {
    if (!specValues[field]) {
      fail(fileName, `missing "${field}" in the spec block`);
    }
  }

  const slugField = specValues["Slug"]!;
  const slugMatch = slugField.match(/`?\/blog\/([a-z0-9-]+)`?/i);
  if (!slugMatch) {
    fail(fileName, `Slug field "${slugField}" is not in the expected \`/blog/<slug>\` format`);
  }
  const slug = slugMatch[1];

  const publishDate = specValues["Publish date"]!;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishDate)) {
    fail(fileName, `Publish date "${publishDate}" is not in YYYY-MM-DD format`);
  }

  // Body: everything after the spec-block fence.
  let content = lines.slice(fenceIndex + 1).join("\n").trim();

  if (!content) {
    fail(fileName, "post body is empty after the spec block");
  }

  // Strip the trailing "*Word count: ... *" footer line (and the `---`
  // fence immediately before it, which exists only to set the footer off).
  const footerPattern = /\n*---\s*\n+\*Word count:.*\*\s*$/s;
  if (!footerPattern.test(content)) {
    fail(fileName, "missing the trailing `*Word count: ...*` footer line");
  }
  content = content.replace(footerPattern, "").trimEnd();

  // Sanity check: the spec block must never leak into content.
  for (const field of SPEC_FIELDS) {
    if (content.includes(`**${field}:**`)) {
      fail(fileName, `spec field "${field}" leaked into the post content`);
    }
  }

  // FAQs: parse the "## Frequently asked questions" section, which stays
  // in `content` for rendering but is also extracted structurally here.
  const faqHeadingPattern = /^## Frequently asked questions\s*$/m;
  const faqHeadingMatch = content.match(faqHeadingPattern);
  if (!faqHeadingMatch || faqHeadingMatch.index === undefined) {
    fail(fileName, "missing the `## Frequently asked questions` section");
  }
  const faqSection = content.slice(
    faqHeadingMatch.index + faqHeadingMatch[0].length
  );

  const faqPattern = /\*\*(.+?)\*\*\n([^\n]+)/g;
  const faqs: BlogFaq[] = [];
  let faqMatch: RegExpExecArray | null;
  while ((faqMatch = faqPattern.exec(faqSection)) !== null) {
    faqs.push({
      question: faqMatch[1].trim(),
      answer: faqMatch[2].trim(),
    });
  }

  if (faqs.length === 0) {
    fail(fileName, "found the FAQ heading but parsed zero question/answer pairs");
  }

  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));

  return {
    title,
    slug,
    metaDescription: specValues["Meta description"]!,
    primaryKeyword: specValues["Primary keyword"]!,
    internalLinks: specValues["Internal links"]!,
    publishDate,
    content,
    faqs,
    readingTime,
  };
}

let cachedPosts: BlogPost[] | null = null;

function loadAllPosts(): BlogPost[] {
  if (cachedPosts) return cachedPosts;

  const fileNames = fs
    .readdirSync(BLOG_DIR)
    .filter((name) => name.endsWith(".md"));

  const posts = fileNames.map((fileName) => {
    const raw = fs.readFileSync(path.join(BLOG_DIR, fileName), "utf-8");
    return parsePost(fileName, raw);
  });

  cachedPosts = posts;
  return posts;
}

export function getAllPosts(): BlogPost[] {
  return [...loadAllPosts()].sort((a, b) =>
    a.publishDate < b.publishDate ? 1 : a.publishDate > b.publishDate ? -1 : 0
  );
}

export function getPostBySlug(slug: string): BlogPost | null {
  return loadAllPosts().find((post) => post.slug === slug) ?? null;
}
