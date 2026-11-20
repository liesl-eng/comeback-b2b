import { Helmet } from "react-helmet-async";
import { ArrowRight, Package } from "lucide-react";
import comebackLogo from "@/assets/comeback-goods-logo.png";

const Restocking = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Restocking — Comeback Goods B2B</title>
        <meta name="description" content="Comeback Goods B2B is restocking. Check back soon." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <a
        href="https://www.comebackrugs.com?from=b2b"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full bg-primary text-primary-foreground px-6 py-6 md:py-10 flex items-center justify-center gap-3 md:gap-5 text-xl md:text-4xl font-semibold tracking-wide hover:bg-primary/90 transition-colors"
      >
        <span className="text-center leading-snug">
          For our <span className="text-accent font-bold">Rug Program</span> click here
        </span>
        <ArrowRight className="w-6 h-6 md:w-9 md:h-9 shrink-0" strokeWidth={2.5} />
      </a>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <img
          src={comebackLogo}
          alt="Comeback Goods"
          className="h-16 md:h-20 w-auto mb-12"
        />

        <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-primary/10 flex items-center justify-center mb-8">
          <Package className="w-10 h-10 md:w-12 md:h-12 text-primary" strokeWidth={1.5} />
        </div>

        <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight text-foreground">
          Restocking
        </h1>

        <a
          href="mailto:hello@comebackgoods.com"
          className="mt-12 text-sm md:text-base text-muted-foreground hover:text-foreground transition-colors"
        >
          hello@comebackgoods.com
        </a>
      </div>
    </div>
  );
};

export default Restocking;
