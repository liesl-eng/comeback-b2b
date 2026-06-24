import ProgramMicrosite, { ProgramConfig } from "@/components/ProgramMicrosite";

const SEATING_MOQ = 10000;

const SEATING_NAME_RE_MODUS = /(chair|stool|bench|sofa|loveseat|settee|ottoman|sectional|chaise|lounge)/i;
const SEATING_NAME_RE_ARTERIORS = /(chair|stool|bench|sofa|loveseat|settee|ottoman|sectional|chaise|lounge)/i;

const config: ProgramConfig = {
  programName: "Seating",
  shortName: "Seating",
  slug: "seating",
  moq: SEATING_MOQ,
  seo: {
    title: "Shop Seating — Comeback Goods",
    description:
      "Dining chairs, accent chairs, lounge seating and more from Modus Furniture, Arteriors Home, and Havenly. Priced 75% below retail.",
  },
  hero: {
    badgeText: "Seating",
    titleLine1: "Curated Seating, ",
    titleLine2: "Big Savings",
    subhead: "",
    bullets: [],
  },
  emailCapture: {
    heading: "Interested? Let's Talk Seating.",
    subheading: "Drop in your email and we'll reach out with pricing and availability.",
    italicLine: "(No spam. Just seating.)",
  },
  whoItsFor: { heading: "", subheading: "", cards: [] },
  howItWorks: [],
  faqs: [],
  hideHero: true,
  productGrid: {
    eyebrow: "SEATING",
    heading: "Shop Seating",
    hideEyebrow: true,
    stickyHeader: true,
    subtext:
      "Dining chairs, accent chairs, lounge seating and more from Modus Furniture, Arteriors Home, and Havenly. Priced 75% below retail.",
    brands: [
      {
        label: "Modus Furniture",
        displayBrand: "MODUS FURNITURE",
        tab: "Modus Furniture",
        filterName: (n) => SEATING_NAME_RE_MODUS.test(n),
      },
      {
        label: "Arteriors Home",
        displayBrand: "ARTERIORS HOME",
        tab: "Arteriors Home",
        filterName: (n) => SEATING_NAME_RE_ARTERIORS.test(n),
      },
      {
        label: "Havenly",
        displayBrand: "HAVENLY",
        tab: "Havenly",
      },
    ],
  },
};

const Seating = () => <ProgramMicrosite config={config} />;
export default Seating;
