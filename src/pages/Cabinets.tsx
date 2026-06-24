import ProgramMicrosite, { ProgramConfig } from "@/components/ProgramMicrosite";

const CABINETS_MOQ = 10000;
const CABINETS_NAME_RE = /(cabinet|chest|bookshelf|bookcase|credenza|sideboard|hutch|armoire|étagère|etagere|shelving)/i;

const config: ProgramConfig = {
  programName: "Cabinets",
  shortName: "Cabinets",
  slug: "cabinets",
  moq: CABINETS_MOQ,
  seo: {
    title: "Shop Cabinets & Storage — Comeback Goods",
    description:
      "Cabinets, chests, bookshelves, and storage pieces from Arteriors Home and Modus Furniture. Priced 75% below retail.",
  },
  hero: {
    badgeText: "Cabinets",
    titleLine1: "Curated Cabinets, ",
    titleLine2: "Big Savings",
    subhead: "",
    bullets: [],
  },
  emailCapture: {
    heading: "Interested? Let's Talk Cabinets.",
    subheading: "Drop in your email and we'll reach out with pricing and availability.",
    italicLine: "(No spam. Just storage.)",
  },
  whoItsFor: { heading: "", subheading: "", cards: [] },
  howItWorks: [],
  faqs: [],
  hideHero: true,
  productGrid: {
    eyebrow: "CABINETS",
    heading: "Shop Cabinets & Storage",
    hideEyebrow: true,
    stickyHeader: true,
    subtext:
      "Cabinets, chests, and bookshelves from Arteriors Home and Modus Furniture. Priced 75% below retail.",
    brands: [
      {
        label: "Arteriors Home",
        displayBrand: "ARTERIORS HOME",
        tab: "Arteriors Home",
        filterName: (n) => CABINETS_NAME_RE.test(n),
      },
      {
        label: "Modus Furniture",
        displayBrand: "MODUS FURNITURE",
        tab: "Modus Furniture",
        filterName: (n) => CABINETS_NAME_RE.test(n),
      },
    ],
  },
};

const Cabinets = () => <ProgramMicrosite config={config} />;
export default Cabinets;
