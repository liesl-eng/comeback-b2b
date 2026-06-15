import Navbar from "@/components/Navbar";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, TrendingDown, BadgeCheck, Leaf, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

const About = () => {
  const { totalItems } = useCart();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar cartItemCount={totalItems} />
      
      <main className="container mx-auto px-4 py-8 md:py-12">
        <Button
          variant="ghost"
          className="mb-6 md:mb-8 gap-2 -ml-2"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>

        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl md:text-4xl font-bold mb-6 md:mb-8">About <span className="text-accent">Comeback Goods</span></h1>

          <div className="space-y-4 md:space-y-6 mb-8 md:mb-12 text-base md:text-lg text-muted-foreground">
            <p>
              We connect serious buyers with name-brand home goods that didn't make it to retail — not because something's wrong with them, but because that's how supply chains work.
            </p>
            <p>
              Overstock happens. Closeouts happen. A warehouse run of rugs with a minor weave variation gets pulled from a brand's catalog. That inventory doesn't disappear — it comes to us.
            </p>
          </div>

          <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6">What we do differently</h2>

          <div className="space-y-4 md:space-y-6 mb-8 md:mb-12 text-base md:text-lg text-muted-foreground">
            <p>
              Comeback Goods was founded by a team who came up through e-commerce and logistics - so we're able to plug directly into brand warehouses and authorized suppliers. That means consistent sourcing, real documentation, and no mystery about where the inventory came from.
            </p>
            <p>
              Every item is inspected and condition-graded before it reaches your quote. You know exactly what you're getting — and so do your customers.
            </p>
          </div>

          {/* Benefits Section */}
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
            <Card className="border-none shadow-card">
              <CardContent className="p-4 md:p-6 text-center">
                <div className="mx-auto mb-3 md:mb-4 flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-accent/10">
                  <BadgeCheck className="h-5 w-5 md:h-6 md:w-6 text-accent" />
                </div>
                <h3 className="mb-2 text-lg md:text-xl font-bold">Curated, Top-Notch Home Goods</h3>
                <p className="text-sm md:text-base text-muted-foreground">
                  Verified and ready-to-ship direct from brand warehouses
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-card">
              <CardContent className="p-4 md:p-6 text-center">
                <div className="mx-auto mb-3 md:mb-4 flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-success/10">
                  <TrendingDown className="h-5 w-5 md:h-6 md:w-6 text-success" />
                </div>
                <h3 className="mb-2 text-lg md:text-xl font-bold">Less-Than-Wholesale Pricing</h3>
                <p className="text-sm md:text-base text-muted-foreground">
                  Save up to 90% off retail
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-card sm:col-span-2 md:col-span-1">
              <CardContent className="p-4 md:p-6 text-center">
                <div className="mx-auto mb-3 md:mb-4 flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-primary/10">
                  <Leaf className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg md:text-xl font-bold">Sustainable Sourcing</h3>
                <p className="text-sm md:text-base text-muted-foreground">
                  Furnish responsibly while lowering costs
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Contact Us Section */}
          <div className="mb-8 md:mb-12 text-center">
            <h2 className="text-xl md:text-2xl font-semibold mb-4">Contact Us</h2>
            <p className="text-muted-foreground mb-4">Have questions? We love email.</p>
            <a 
              href="mailto:hello@comebackgoods.com" 
              className="inline-flex items-center gap-2 text-accent hover:underline font-medium"
            >
              <Mail className="h-5 w-5" />
              hello@comebackgoods.com
            </a>
          </div>

          <div className="text-center">
            <Button variant="accent" size="lg" onClick={() => navigate("/products")}>
              Browse Products
            </Button>
          </div>
        </div>
      </main>

      <footer className="border-t bg-card py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 Comeback Goods</p>
          <p className="mt-1">Almost Perfect. Always Loved.</p>
        </div>
      </footer>
    </div>
  );
};

export default About;
