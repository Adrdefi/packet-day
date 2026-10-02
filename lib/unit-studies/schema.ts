import { z } from "zod";

/**
 * Shape of one content/unit-studies/[slug].json file. The drafting rules
 * for every field live in docs/unit-study-page-style-guide.md.
 *
 * Objects are strict, so a misspelled field fails the build instead of
 * being silently dropped.
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be a YYYY-MM-DD date");
const text = z.string().trim().min(1, "must not be empty");

export const GALLERY_KINDS = [
  "cover",
  "reading",
  "math",
  "science",
  "puzzle",
  "movement",
  "coloring",
  "certificate",
  "other",
] as const;

export const GRADE_BANDS = ["K-2", "3-5", "6-8"] as const;

export const unitStudyPageSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be lowercase words joined by hyphens"),
    status: z.enum(["draft", "live"]),
    theme: z
      .object({
        name: text,
        keyword: text,
        inputUsed: text,
        season: z.enum(["fall", "winter", "spring", "summer", "evergreen"]),
        /** True for a name that keeps its capitals mid sentence ("Thanksgiving", "Ancient Egypt"). */
        properNoun: z.boolean().optional(),
        /** The theme as a label before "packet" or "day" when it differs from the name ("dinosaur" for Dinosaurs). */
        packetLabel: text.optional(),
      })
      .strict(),
    meta: z
      .object({
        title: text.max(60, "must be 60 characters or fewer"),
        description: text.max(155, "must be 155 characters or fewer"),
      })
      .strict(),
    h1: text,
    answerCapsule: text,
    sample: z
      .object({
        childFirstName: text,
        /** 0 is kindergarten. */
        grade: z.number().int().min(0).max(8),
        /** Child pages only, as the packet's own "1 of N" footer counts them. The parent answer key is not included. */
        pageCount: z.number().int().positive(),
        characterName: text,
        characterDescription: text,
        generatedOn: isoDate,
      })
      .strict(),
    gallery: z
      .array(
        z
          .object({
            /** A file name inside public/unit-studies/[slug]/, or a site path starting with "/". */
            file: text,
            alt: text,
            caption: text,
            width: z.number().int().positive(),
            height: z.number().int().positive(),
            kind: z.enum(GALLERY_KINDS),
          })
          .strict()
      )
      .min(1)
      .refine((items) => items.filter((item) => item.kind === "cover").length === 1, {
        message: 'must have exactly one item with kind "cover"',
      }),
    inside: z
      .array(z.object({ subject: text, activity: text, detail: text }).strict())
      .min(1),
    characterSection: z.object({ heading: text, body: text }).strict(),
    learning: z.object({ heading: text, body: text }).strict(),
    gradeBands: z
      .array(z.object({ band: z.enum(GRADE_BANDS), body: text }).strict())
      .length(3)
      .refine((bands) => GRADE_BANDS.every((band, i) => bands[i]?.band === band), {
        message: 'must list "K-2", "3-5" and "6-8" once each, in that order',
      }),
    natalieNote: z
      .object({ body: text, basedOn: z.enum(["site", "natalie-supplied"]) })
      .strict(),
    faqs: z.array(z.object({ q: text, a: text }).strict()).length(6),
    related: z.array(z.string()).max(3),
    useCaseLinks: z.array(z.string()).min(2).max(3),
    testimonialId: z.string().optional(),
    factsToVerify: z.array(
      z.object({ claim: text, source: z.string().optional(), verified: z.boolean() }).strict()
    ),
    natalieReviewedOn: isoDate.optional(),
    datePublished: isoDate.optional(),
    dateModified: isoDate.optional(),
  })
  .strict();

export type UnitStudyPage = z.infer<typeof unitStudyPageSchema>;
export type GalleryItem = UnitStudyPage["gallery"][number];
