export interface Testimonial {
  id: string;
  quote: string;
  /** Shorter version for tight spaces (auth panel). Falls back to `quote` if omitted. */
  abridgedQuote?: string;
  name: string;
  credential: string;
  verified: boolean;
  /** If true, renders in the full-width highlighted slot instead of the grid. */
  featured?: boolean;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "jessica-r",
    quote:
      "I was sick and couldn't get off the couch. I made two packets from my phone, one for each of my kids, and they were busy for about five hours with breaks. I got to rest and they were happy. That was the day I got it.",
    abridgedQuote:
      "I was sick and couldn't get off the couch. I made two packets from my phone, one for each kid, and they were busy about five hours while I rested.",
    name: "Jessica R.",
    credential: "Mom of 2, ages 11 and 9",
    verified: true,
  },
  {
    id: "barbara-r",
    quote:
      "I watch my grandkids during the week and I was curious whether the AI could really do it. It can. I've been using it to fill in around what their moms are already teaching, and the kids ask for it.",
    abridgedQuote:
      "I watch my grandkids during the week. I've been using Packet Day to fill in around what their moms are already teaching — the kids ask for it.",
    name: "Barbara R.",
    credential: "Grandmother of 6 school-age grandchildren",
    verified: true,
    featured: true,
  },
  {
    id: "bridget-j",
    quote:
      "My 7-year-old wants rainbows and unicorns. My 10-year-old wants military history and nothing else. They each get exactly what they want and I'm not planning two different school days anymore.",
    abridgedQuote:
      "My 7-year-old wants rainbows and unicorns. My 10-year-old wants military history. They each get exactly what they want and I'm not planning two different school days anymore.",
    name: "Bridget J.",
    credential: "Mom of 2, ages 7 and 10",
    verified: true,
  },
];
