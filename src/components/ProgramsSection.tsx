import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, RectangleVertical, Lightbulb, Table2, Layers, Bed, Archive, Boxes } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Program = {
  icon: typeof Lightbulb;
  title: string;
  desc: string;
  badge: string;
  cta: string;
  path: string;
  accent: string;
  external?: boolean;
  dark?: boolean;
};

const programs: Program[] = [
  {
    icon: Layers,
    title: "Rug Program",
    desc: "High quality, new rugs — curated and delivered on your schedule.",
    badge: "Curated Rugs",
    cta: "Explore the Program",
    path: "https://www.comebackrugs.com?from=b2b",
    accent: "from-accent via-accent to-amber-600",
    external: true,
    dark: true,
  },
  {
    icon: Lightbulb,
    title: "Lighting",
    desc: "Table lamps, floor lamps, sconces, pendants, and chandeliers.",
    badge: "Lamps · Sconces · Pendants",
    cta: "Shop Lighting",
    path: "/lighting",
    accent: "from-accent via-accent to-amber-600",
  },
  {
    icon: RectangleVertical,
    title: "Mirrors",
    desc: "Wall mirrors, floor mirrors, and statement pieces.",
    badge: "Wall · Floor · Accent",
    cta: "Shop Mirrors",
    path: "/mirrors",
    accent: "from-slate-300 via-slate-400 to-slate-500",
  },
  {
    icon: Table2,
    title: "Tables",
    desc: "Coffee tables, side tables, dining tables, and consoles.",
    badge: "Coffee · Side · Dining",
    cta: "Shop Tables",
    path: "/tables",
    accent: "from-slate-300 via-slate-400 to-slate-500",
  },
  {
    icon: Bed,
    title: "Beds",
    desc: "Beds and headboards in twin, queen, and king sizes.",
    badge: "Queen · King · Headboards",
    cta: "Shop Beds",
    path: "/beds",
    accent: "from-slate-300 via-slate-400 to-slate-500",
  },
  {
    icon: Archive,
    title: "Dressers",
    desc: "Dressers, chests, and storage cabinets.",
    badge: "Chests · Cabinets · Storage",
    cta: "Shop Dressers",
    path: "/dressers",
    accent: "from-slate-300 via-slate-400 to-slate-500",
  },
  {
    icon: Boxes,
    title: "Storage",
    desc: "Shelving, bookcases, sideboards, and storage cabinets.",
    badge: "Shelving · Bookcases · Cabinets",
    cta: "Shop Storage",
    path: "/storage",
    accent: "from-slate-300 via-slate-400 to-slate-500",
  },
];


const ProgramsSection = () => {
  const navigate = useNavigate();

  const go = (p: Program) => {
    if (p.external) {
      window.open(p.path, "_blank", "noopener,noreferrer");
    } else {
      navigate(p.path);
    }
  };

  return (
    <section id="programs" className="pt-2 md:pt-4 pb-12 md:pb-20 bg-background scroll-mt-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 md:mb-12 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Shop By Category
          </h2>
        </div>


        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {programs.map((p) => (
            <Card
              key={p.title}
              role="link"
              tabIndex={0}
              onClick={() => go(p)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  go(p);
                }
              }}
              className={`relative overflow-hidden flex flex-col p-6 cursor-pointer hover:shadow-hover hover:-translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                p.dark ? "border-transparent text-primary-foreground" : ""
              }`}
              style={p.dark ? { backgroundColor: "#1e2d4a" } : undefined}
            >
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${p.accent}`} />
              <div className={`p-3 rounded-full w-fit mb-4 ${p.dark ? "bg-accent/20" : "bg-accent/10"}`}>
                <p.icon className="h-7 w-7 text-accent" />
              </div>
              <h3 className={`text-xl md:text-2xl font-bold mb-2 ${p.dark ? "text-primary-foreground" : "text-foreground"}`}>{p.title}</h3>
              <p className={`text-base mb-4 flex-1 ${p.dark ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{p.desc}</p>
              <span className={`inline-block self-start text-xs font-semibold px-3 py-1 rounded-full mb-5 ${
                p.dark ? "bg-accent/20 text-accent" : "bg-accent/15 text-accent-foreground"
              }`}>
                {p.badge}
              </span>
              <Button
                variant="accent"
                className="w-full gap-2"
                onClick={(e) => { e.stopPropagation(); go(p); }}
              >
                {p.cta}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProgramsSection;
