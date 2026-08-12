import Navbar from "@/components/Navbar";
import StatsSection from "@/components/StatsSection";
import ProgramsSection from "@/components/ProgramsSection";
import { Link } from "react-router-dom";
import ValuePropSection from "@/components/ValuePropSection";
import BuyerSegmentSection from "@/components/BuyerSegmentSection";
import HomepageFaqs from "@/components/HomepageFaqs";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-marketplace.jpg";


const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-hero">
          <div className="absolute inset-0 opacity-10">
            <img
              src={heroImage}
              alt="Warehouse"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="container relative mx-auto px-4 md:px-6 pt-8 pb-6 md:pt-10 md:pb-8 lg:pt-12 lg:pb-10">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="mb-3 md:mb-4 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase text-primary-foreground tracking-tight leading-[0.95] text-center" style={{ textShadow: "3px 3px 0 hsl(0 0% 0% / 0.55)" }}>
                Tiny Imperfections.{" "}
                <span className="relative inline-block">
                  <span className="relative z-10">Huge</span>
                  <span aria-hidden className="absolute left-0 right-0 bottom-1 h-3 md:h-4 bg-[hsl(15_75%_70%)] z-0" />
                </span>{" "}
                Savings.
              </h1>
              <p className="mb-2 text-lg md:text-xl lg:text-2xl text-primary-foreground/90 font-medium max-w-3xl mx-auto text-center">
                Sustainable sourcing. At a fraction of wholesale.
              </p>


              {/* Primary: Shop Programs + Get In Contact */}
              <div className="mt-5 md:mt-6 flex flex-wrap gap-3 md:gap-4 justify-center">
                <Button
                  variant="accent"
                  size="lg"
                  className="gap-2"
                  onClick={() => {
                    document.getElementById("programs")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Shop Catalog
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2 bg-transparent border-white text-white hover:bg-white/10 hover:text-white"
                  asChild
                >
                  <a href="mailto:hello@comebackgoods.com?subject=Comeback%20Goods%20Inquiry">
                    Get In Contact
                    <ArrowRight className="h-5 w-5" />
                  </a>
                </Button>
              </div>

              {/* Secondary: How It Works */}
              <div className="mt-3 md:mt-4 flex flex-wrap gap-3 justify-center items-center">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate("/about")}
                >
                  About Us
                </Button>
              </div>
            </div>
          </div>


        </section>

        {/* Stats Banner */}
        <StatsSection />

        {/* Programs Section */}
        <ProgramsSection />


        {/* Stretch Your Budget headline */}
        <section className="pt-0 pb-1 md:pt-0 md:pb-2 bg-muted/30">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-4xl font-bold mb-3">Stretch Your Budget, Not Your Standards.</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Reliable, affordable inventory — without the sourcing headaches.
            </p>
          </div>
        </section>


        {/* Value Prop Section */}
        <ValuePropSection />

        {/* Who It's For */}
        <BuyerSegmentSection />

        {/* FAQ */}
        <HomepageFaqs />

      </main>

      {/* Footer */}
      <footer className="border-t bg-card py-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm mb-8">
            <div>
              <p className="font-bold text-foreground mb-3">Comeback Goods</p>
              <p className="text-muted-foreground">Almost Perfect.</p>
            </div>
            <div>
              <p className="font-bold text-foreground mb-3">Categories</p>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/lighting" className="hover:text-accent transition-colors">Lighting</Link></li>
                <li><Link to="/mirrors" className="hover:text-accent transition-colors">Mirrors</Link></li>
                <li><Link to="/tables" className="hover:text-accent transition-colors">Tables</Link></li>
                <li><Link to="/beds" className="hover:text-accent transition-colors">Beds</Link></li>
                <li><Link to="/dressers" className="hover:text-accent transition-colors">Dressers</Link></li>
                <li><Link to="/storage" className="hover:text-accent transition-colors">Storage</Link></li>
                <li><Link to="/seating" className="hover:text-accent transition-colors">Seating</Link></li>

              </ul>
            </div>
            <div>
              <p className="font-bold text-foreground mb-3">Connect</p>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/about" className="hover:text-accent transition-colors">About / How It Works</Link></li>
                <li><a href="mailto:hello@comebackgoods.com" className="hover:text-accent transition-colors">hello@comebackgoods.com</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-6 text-center text-sm text-muted-foreground">
            <p>© 2026 Comeback Goods</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
