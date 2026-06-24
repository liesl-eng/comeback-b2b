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
          <div className="mx-auto mb-6 h-14 w-14 rounded-full bg-accent/15 text-accent flex items-center justify-center">
            <PackageOpen className="h-7 w-7" />
          </div>
          <p className="text-sm font-medium tracking-wide uppercase text-accent mb-3">
            Restocking
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold text-foreground mb-4">
            {category} is restocking
          </h1>
          <p className="text-muted-foreground text-base md:text-lg mb-8">
            We're refreshing inventory for our {category.toLowerCase()} program.
            Check back soon, or explore what's available now.
          </p>
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
