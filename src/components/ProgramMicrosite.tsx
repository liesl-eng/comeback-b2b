import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowRight, CheckCircle2, Sparkles, ClipboardList, PackageSearch, CalendarClock, ChevronRight, LucideIcon } from "lucide-react";
import ProgramProductGrid, { ProgramProductGridConfig } from "@/components/ProgramProductGrid";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";

export interface ProgramConfig {
  programName: string;            // e.g. "Lighting Program"
  shortName: string;              // e.g. "Lighting"
  slug: string;                   // e.g. "lighting-program" (used as source tag)
  seo: {
    title: string;
    description: string;
  };
  hero: {
    badgeText: string;            // e.g. "Comeback Lighting Program"
    titleLine1: string;           // e.g. "Curated Lighting, "
    titleLine2: string;           // e.g. "Big Savings"
    subhead: string;
    bullets: Array<[string, string]>; // [label, description]
  };
  emailCapture: {
    heading: string;
    subheading: string;
    italicLine: string;
  };
  whoItsFor: {
    heading: string;
    subheading: string;
    cards: Array<{ icon: string; title: string; desc: string }>;
  };
  howItWorks: Array<{
    step: string;
    title: string;
    desc: string;
    Icon: LucideIcon;
  }>;
  /** Optional CSS background for the hero section. Defaults to the rug program gradient. */
  heroBackground?: string;
  /** Set to false to hide the default warm overlay (use when a custom heroBackground is set). */
  heroOverlay?: boolean;
  /** Set to true to add a mirror-like diagonal sheen + soft highlights over the hero. */
  heroSheen?: boolean;
  faqs: Array<{ q: string; a: string }>;
  /** Minimum order quantity, in dollars. Used in FAQ copy and merch hooks. */
  moq: number;
  /** Optional product grid rendered between hero and email capture. */
  productGrid?: ProgramProductGridConfig;
  /** Show "← All Programs" back link in the navbar. */
  showBackLink?: boolean;
  /** Hide the top hero section entirely. */
  hideHero?: boolean;
}

const EmailCaptureSection = ({ source, heading, subheading, italicLine }: {
  source: string; heading: string; subheading: string; italicLine: string;
}) => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || submitting) return;
    // Lightweight client-side email check; server re-validates with zod.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) || trimmed.length > 255) {
      setSubmitting(false);
      return;
    }
    setSubmitting(true);
    try {
      await supabase.functions.invoke("submit-webhook", {
        body: {
          kind: "email_capture",
          email: trimmed,
          timestamp: new Date().toISOString(),
          source: `${source}-email-capture`.slice(0, 120),
        },
      });
    } catch {
      /* swallow — confirmation still shown */
    } finally {
      setDone(true);
      setSubmitting(false);
    }
  };

  return (
    <section id="email-capture" className="py-8 md:py-12 bg-accent/10 border-y border-accent/20 scroll-mt-20">
      <div className="container mx-auto px-4 max-w-3xl text-center">
        <h2 className="text-2xl md:text-4xl font-bold mb-3">{heading}</h2>
        <p className="text-muted-foreground text-base md:text-lg mb-2 max-w-xl mx-auto">{subheading}</p>
        <p className="text-sm text-muted-foreground/80 italic mb-8">{italicLine}</p>
        {done ? (
          <div className="inline-flex items-center gap-2 text-lg md:text-xl font-semibold text-foreground">
            <CheckCircle2 className="h-6 w-6 text-accent" />
            Thanks! We'll be in touch shortly.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
            <Input
              type="email"
              required
              placeholder="you@business.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
              className="flex-1 h-11 bg-background"
            />
            <Button
              type="submit"
              disabled={submitting}
              className="h-11 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold px-6"
            >
              {submitting ? "Sending..." : "Get in Touch"}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
};

const ProgramMicrosite = ({ config }: { config: ProgramConfig }) => {
  const hasPushedState = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      const pastHero = window.scrollY > 200;
      if (pastHero && !hasPushedState.current) {
        window.history.pushState({ programScrolled: true }, "");
        hasPushedState.current = true;
      }
    };
    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.programScrolled || hasPushedState.current) {
        if (window.scrollY > 50) {
          window.scrollTo({ top: 0, behavior: "smooth" });
          hasPushedState.current = false;
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{config.seo.title}</title>
        <meta name="description" content={config.seo.description} />
        <meta property="og:title" content={config.seo.title} />
        <meta property="og:description" content={config.seo.description} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={config.seo.title} />
        <meta name="twitter:description" content={config.seo.description} />
      </Helmet>

      <Navbar />

      <main>
        {/* ── HERO ── */}
        {!config.hideHero && (
        <section
          className="relative overflow-hidden"
          style={{ background: config.heroBackground ?? 'var(--gradient-rug-hero)' }}
        >
          {config.heroOverlay !== false && (
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[hsl(30_50%_55%/0.08)]" />
          )}
          {config.heroSheen && (
            <>
              <div
                className="absolute inset-0 pointer-events-none opacity-60 mix-blend-screen"
                style={{
                  background:
                    'linear-gradient(115deg, hsl(0 0% 100% / 0) 30%, hsl(0 0% 100% / 0.18) 48%, hsl(0 0% 100% / 0.32) 50%, hsl(0 0% 100% / 0.18) 52%, hsl(0 0% 100% / 0) 70%)',
                }}
              />
              <div
                className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay"
                style={{
                  background:
                    'radial-gradient(ellipse at 20% 10%, hsl(0 0% 100% / 0.35), transparent 55%), radial-gradient(ellipse at 80% 90%, hsl(220 10% 20% / 0.4), transparent 60%)',
                }}
              />
            </>
          )}

          <div className="relative z-10 mx-auto px-6 md:px-12 lg:px-20 pt-6 pb-4 md:pt-10 md:pb-8 lg:pt-14 lg:pb-10">
            <div className="max-w-5xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 mb-4 bg-[hsl(30_50%_55%)] text-[hsl(210_55%_10%)] text-base font-bold px-6 py-2.5 rounded-full">
                <Sparkles className="h-5 w-5" />
                {config.hero.badgeText}
              </div>
              <h1 className="mb-4 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight leading-[1.1] sm:leading-[0.95]">
                <span className="text-[hsl(0_0%_98%)]">{config.hero.titleLine1}</span>
                <br className="sm:hidden" />
                <span className="bg-gradient-to-r from-[hsl(43_65%_55%)] to-[hsl(30_50%_65%)] bg-clip-text text-transparent">
                  {config.hero.titleLine2}
                </span>
              </h1>
              <p className="mb-6 text-lg md:text-xl text-[hsl(0_0%_98%/0.75)] max-w-2xl mx-auto leading-relaxed">
                {config.hero.subhead}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                <Button
                  size="lg"
                  onClick={() => scrollTo("email-capture")}
                  className="bg-[hsl(43_65%_55%)] text-[hsl(210_55%_10%)] hover:bg-[hsl(43_65%_50%)] font-semibold text-base px-8"
                >
                  Get In Contact <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-[hsl(0_0%_98%/0.4)] text-[hsl(0_0%_98%)] bg-transparent hover:bg-[hsl(0_0%_98%/0.1)] hover:text-[hsl(0_0%_98%)] font-medium text-base px-8"
                  onClick={() => scrollTo("how-it-works")}
                >
                  How It Works
                </Button>
              </div>

              <ul className="flex flex-col gap-2 max-w-xl mx-auto text-left">
                {config.hero.bullets.map(([label, desc]) => (
                  <li key={label} className="flex items-start gap-3 text-[hsl(0_0%_98%/0.85)] text-base md:text-lg">
                    <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0 text-[hsl(43_65%_55%)]" />
                    <span><span className="font-bold text-[hsl(0_0%_98%)] whitespace-nowrap">{label}</span> — {desc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
        )}


        {/* ── PRODUCT GRID (optional) ── */}
        {config.productGrid && <ProgramProductGrid config={config.productGrid} />}

        {/* ── EMAIL CAPTURE ── */}
        <EmailCaptureSection
          source={config.slug}
          heading={config.emailCapture.heading}
          subheading={config.emailCapture.subheading}
          italicLine={config.emailCapture.italicLine}
        />

      </main>

      <footer className="py-12 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center space-y-3">
          <p className="text-sm text-primary-foreground/60">© 2026 Comeback Goods</p>
          <p className="text-sm text-primary-foreground/60">Almost Perfect. Always Loved.</p>
        </div>
      </footer>
    </div>
  );
};

export default ProgramMicrosite;
