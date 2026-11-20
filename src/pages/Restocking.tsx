import { Helmet } from "react-helmet-async";
import { Package } from "lucide-react";
import comebackLogo from "@/assets/comeback-goods-logo.png";

const Restocking = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <Helmet>
        <title>Restocking — Comeback Goods B2B</title>
        <meta name="description" content="Comeback Goods B2B is restocking. Check back soon." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

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
  );
};

export default Restocking;
