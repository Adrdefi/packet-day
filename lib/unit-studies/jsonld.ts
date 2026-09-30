import { NATALIE_ID, SITE_URL } from "@/lib/site";
import { buildFaqJsonLd } from "@/lib/situations/faq-schema";
import { coverOf, gallerySrc } from "./loader";
import { gradePhrase, sampleLabel } from "./format";
import type { UnitStudyPage } from "./schema";

const ORG_ID = `${SITE_URL}/#organization`;

export function unitStudyUrl(slug: string): string {
  return `${SITE_URL}/unit-studies/${slug}`;
}

/**
 * The @graph for one unit study page: WebPage, the sample packet as a
 * CreativeWork, breadcrumbs, and the Natalie and Packet Day nodes. The
 * Organization and Person details match app/about/page.tsx (same @ids), so
 * every page describes the same company and the same person.
 */
export function buildUnitStudyGraph(page: UnitStudyPage) {
  const url = unitStudyUrl(page.slug);
  const cover = coverOf(page);
  const coverUrl = `${SITE_URL}${gallerySrc(page, cover)}`;
  const dates = {
    ...(page.datePublished && { datePublished: page.datePublished }),
    ...((page.dateModified ?? page.datePublished) && {
      dateModified: page.dateModified ?? page.datePublished,
    }),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: page.meta.title,
        description: page.meta.description,
        inLanguage: "en-US",
        primaryImageOfPage: { "@type": "ImageObject", url: coverUrl },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        mainEntity: { "@id": `${url}#sample` },
        author: { "@id": NATALIE_ID },
        publisher: { "@id": ORG_ID },
        ...(page.natalieReviewedOn && {
          reviewedBy: { "@id": NATALIE_ID },
          lastReviewed: page.natalieReviewedOn,
        }),
        ...dates,
      },
      {
        "@type": "CreativeWork",
        "@id": `${url}#sample`,
        name: `${page.theme.name} sample packet`,
        description: `${sampleLabel(page)}. A ${page.sample.pageCount} page printable packet shown as a sample of what Packet Day makes.`,
        educationalLevel: gradePhrase(page.sample.grade),
        learningResourceType: "Printable learning packet",
        about: page.theme.name,
        image: coverUrl,
        dateCreated: page.sample.generatedOn,
        creator: { "@id": ORG_ID },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Unit Studies", item: `${SITE_URL}/unit-studies` },
          { "@type": "ListItem", position: 3, name: page.theme.name, item: url },
        ],
      },
      {
        "@type": "Person",
        "@id": NATALIE_ID,
        name: "Natalie Riggs",
        jobTitle: "Co-Founder",
        url: NATALIE_ID,
        worksFor: { "@id": ORG_ID },
      },
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: "Packet Day",
        url: SITE_URL,
        email: "hello@packetday.com",
        foundingDate: "2026",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Lodi",
          addressRegion: "CA",
          addressCountry: "US",
        },
        sameAs: ["https://www.pinterest.com/packetday"],
      },
    ],
  };
}

/** FAQPage, built by the same helper the situation pages use. */
export function buildUnitStudyFaqJsonLd(page: UnitStudyPage) {
  return buildFaqJsonLd({
    heading: "Questions parents ask",
    faqs: page.faqs.map((faq) => ({ question: faq.q, answer: faq.a })),
  });
}
