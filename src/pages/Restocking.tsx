import { Link, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { PackageOpen } from "lucide-react";

const titleFor = (path: string) => {
  if (path.startsWith("/mirrors")) return "Mirrors";
  if (path.startsWith("/lighting")) return "Lighting";
  if (path.startsWith("/tables")) return "Tables";
  return "This category";
};

const Restocking = () => {
  const { pathname } = useLocation();
  const category = titleFor(pathname);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{`${category} — Restocking | Comeback Goods`}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-xl w-full text-center border border-border rounded-2xl bg-card p-10 md:p-14 shadow-sm">
          <div className="mx-auto mb-8 h-24 w-24 md:h-28 md:w-28 rounded-full bg-accent/15 text-foreground flex items-center justify-center">
            <PackageOpen className="h-12 w-12 md:h-14 md:w-14" />
          </div>
          <h1 className="text-5xl md:text-6xl font-semibold text-foreground mb-8">
            Restocking
          </h1>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg">
              <a
                href="https://www.comebackrugs.com?from=b2b"
                target="_blank"
                rel="noopener noreferrer"
              >
                Browse Rug Program
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Restocking;
