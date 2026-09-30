import fs from "fs";
import path from "path";
import { unitStudyPageSchema, type GalleryItem, type UnitStudyPage } from "./schema";
import { SITUATIONS } from "@/lib/situations/registry";
import { TESTIMONIALS } from "@/lib/testimonials";
import { THEME_SLUGS } from "./themes";

const CONTENT_DIR = path.join(process.cwd(), "content", "unit-studies");
const PUBLIC_DIR = path.join(process.cwd(), "public");

/** Placeholder page that proves the template renders. It must never go live. */
const FIXTURE_SLUG = "fixture-example";

/**
 * Only "live" pages exist on the production deployment. Local dev and Vercel
 * previews also get drafts, so they can be reviewed before going live.
 */
const isProduction = process.env.VERCEL_ENV === "production";

function fail(fileName: string, message: string): never {
  throw new Error(`Unit study content error in content/unit-studies/${fileName}: ${message}`);
}

/** Site path for a gallery image: a bare file name lives in public/unit-studies/[slug]/. */
export function gallerySrc(page: UnitStudyPage, item: GalleryItem): string {
  return item.file.startsWith("/") ? item.file : `/unit-studies/${page.slug}/${item.file}`;
}

/** The schema guarantees exactly one cover. */
export function coverOf(page: UnitStudyPage): GalleryItem {
  return page.gallery.find((item) => item.kind === "cover")!;
}

function parseFile(fileName: string): UnitStudyPage {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, fileName), "utf8");

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    fail(fileName, `not valid JSON (${error instanceof Error ? error.message : String(error)})`);
  }

  const result = unitStudyPageSchema.safeParse(json);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  field "${issue.path.join(".") || "(root)"}": ${issue.message}`)
      .join("\n");
    fail(fileName, `\n${problems}`);
  }
  const page = result.data;

  if (`${page.slug}.json` !== fileName) {
    fail(fileName, `field "slug" is "${page.slug}" but the file name says "${fileName.replace(/\.json$/, "")}"`);
  }

  page.gallery.forEach((item, i) => {
    const src = gallerySrc(page, item);
    if (!fs.existsSync(path.join(PUBLIC_DIR, src))) {
      fail(fileName, `field "gallery.${i}.file": public${src} does not exist`);
    }
  });

  const situationHrefs = new Set(SITUATIONS.map((situation) => situation.href));
  page.useCaseLinks.forEach((href, i) => {
    if (!situationHrefs.has(href)) {
      fail(fileName, `field "useCaseLinks.${i}": "${href}" is not a situation page (${[...situationHrefs].join(", ")})`);
    }
  });

  if (page.testimonialId) {
    const testimonial = TESTIMONIALS.find((entry) => entry.id === page.testimonialId);
    if (!testimonial?.verified) {
      fail(fileName, `field "testimonialId": "${page.testimonialId}" is not a verified testimonial in lib/testimonials.ts`);
    }
  }

  if (page.status === "live") {
    if (page.slug === FIXTURE_SLUG) {
      fail(fileName, `field "status": the fixture must never be "live"`);
    }
    if (raw.includes("[NATALIE:")) {
      fail(fileName, `field "status": a live page cannot contain a [NATALIE: ...] placeholder`);
    }
    if (!page.datePublished) {
      fail(fileName, `field "datePublished": a live page needs a publish date`);
    }
    page.factsToVerify.forEach((fact, i) => {
      if (!fact.verified) {
        fail(fileName, `field "factsToVerify.${i}": a live page cannot have an unverified claim ("${fact.claim}")`);
      }
    });
  }

  return page;
}

/**
 * Related slugs are checked against the theme registry (lib/unit-studies/
 * themes.ts), not against the content files that exist today, so a page can
 * name related themes whose pages aren't written yet. The page itself only
 * links to the ones visible on the current deployment.
 */
function checkRelated(pages: UnitStudyPage[]) {
  for (const page of pages) {
    const fileName = `${page.slug}.json`;
    page.related.forEach((slug, i) => {
      if (slug === page.slug) fail(fileName, `field "related.${i}": a page cannot list itself`);
      if (!THEME_SLUGS.has(slug)) fail(fileName, `field "related.${i}": "${slug}" is not a theme in lib/unit-studies/themes.ts`);
      if (page.related.indexOf(slug) !== i) fail(fileName, `field "related.${i}": "${slug}" is listed twice`);
    });
  }
}

let cachedPages: UnitStudyPage[] | null = null;

/** Every content file, drafts included, validated. Throws (failing the build) on any bad file. */
export function getAllUnitStudies(): UnitStudyPage[] {
  if (cachedPages) return cachedPages;

  const files = fs.existsSync(CONTENT_DIR)
    ? fs.readdirSync(CONTENT_DIR).filter((name) => name.endsWith(".json")).sort()
    : [];
  const pages = files.map(parseFile);
  checkRelated(pages);

  cachedPages = pages.sort((a, b) => a.theme.name.localeCompare(b.theme.name));
  return cachedPages;
}

/** Pages that exist on this deployment: live only in production, drafts too everywhere else. */
export function getVisibleUnitStudies(): UnitStudyPage[] {
  return getAllUnitStudies().filter((page) => !isProduction || page.status === "live");
}

/** One page by slug, only if it is visible on this deployment. */
export function getUnitStudy(slug: string): UnitStudyPage | undefined {
  return getVisibleUnitStudies().find((page) => page.slug === slug);
}
