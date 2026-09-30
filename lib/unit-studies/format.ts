import { PLANS } from "@/lib/stripe";
import { PLAN_PRICE } from "@/lib/plans";
import type { UnitStudyPage } from "./schema";

/** "grade 3", or "kindergarten" for grade 0. */
export function gradePhrase(grade: number): string {
  return grade === 0 ? "kindergarten" : `grade ${grade}`;
}

/** "A sample packet made for a grade 3 learner named Ava" */
export function sampleLabel(page: UnitStudyPage): string {
  return `A sample packet made for a ${gradePhrase(page.sample.grade)} learner named ${page.sample.childFirstName}`;
}

/** The theme name as it reads mid sentence: "a bats packet", but "a Thanksgiving packet". */
export function themeInSentence(page: UnitStudyPage): string {
  return page.theme.properNoun ? page.theme.name : page.theme.name.toLowerCase();
}

export function signupHref(page: UnitStudyPage): string {
  return `/signup?from=unit-studies-${page.slug}`;
}

export function primaryCtaLabel(page: UnitStudyPage): string {
  return `Make your own ${themeInSentence(page)} packet free`;
}

/** The date shown as "Updated": dateModified, else datePublished. */
export function updatedDate(page: UnitStudyPage): string | undefined {
  return page.dateModified ?? page.datePublished;
}

/** "2026-09-29" -> "September 2026". Read as UTC so the month never shifts. */
export function monthYear(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Splits a body field into paragraphs on blank lines. */
export function paragraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/** The settled pricing claims, built from the plan definitions so a price change carries over. */
export function pricingLine(): string {
  const annualMonthlyRate = Math.round(PLAN_PRICE.yearly / 12);
  const freeCount = PLANS.free.packetsPerMonth;
  return (
    `Free is ${freeCount} packet${freeCount === 1 ? "" : "s"} a month, no card needed. ` +
    `Unlimited is $${annualMonthlyRate} a month billed annually ($${PLAN_PRICE.yearly} a year) ` +
    `or $${PLAN_PRICE.monthly} month to month.`
  );
}

/** "a" or "an" for the word that follows, by its first letter ("an owls packet"). */
export function indefiniteArticle(word: string): "a" | "an" {
  return /^[aeiou]/i.test(word.trim()) ? "an" : "a";
}
