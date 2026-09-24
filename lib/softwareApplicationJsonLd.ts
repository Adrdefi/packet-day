import { PLANS } from "@/lib/stripe";
import { SITE_URL } from "@/lib/site";

const ORG_ID = `${SITE_URL}/#organization`;

function subscriptionOffer(name: string, price: number, unitText: "MONTH" | "YEAR") {
  return {
    "@type": "Offer",
    name,
    price: String(price),
    priceCurrency: "USD",
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: String(price),
      priceCurrency: "USD",
      unitText,
    },
  };
}

/**
 * SoftwareApplication node shared by / (inside its @graph) and /pricing.
 * Prices come from lib/stripe.ts's PLANS, so a price change updates the
 * schema too. No aggregateRating or review markup on purpose.
 */
export const softwareApplicationNode = {
  "@type": "SoftwareApplication",
  "@id": `${SITE_URL}/#software`,
  name: "Packet Day",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  description:
    "Packet Day makes personalized, printable full-day learning packets for kids in K-8, built around whatever your child loves right now.",
  publisher: { "@id": ORG_ID },
  offers: [
    {
      "@type": "Offer",
      name: PLANS.free.name,
      price: String(PLANS.free.price),
      priceCurrency: "USD",
    },
    subscriptionOffer("Unlimited monthly", PLANS.unlimited.monthly.price, "MONTH"),
    subscriptionOffer("Unlimited yearly", PLANS.unlimited.yearly.price, "YEAR"),
  ],
};
