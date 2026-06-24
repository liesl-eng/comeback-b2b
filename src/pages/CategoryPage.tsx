import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "react-router-dom";
import { Heart } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useCatalogProducts } from "@/hooks/useCatalogProducts";
import { SheetRow } from "@/lib/productSheet";
import { useFavorites } from "@/contexts/FavoritesContext";
import { cn } from "@/lib/utils";
import AddToOrderButton from "@/components/AddToOrderButton";
import { useInventoryRefreshedAt, formatInventoryRefreshed } from "@/hooks/useInventoryRefreshedAt";
import { useAuth } from "@/contexts/AuthContext";

type SortKey = "default" | "price-asc" | "price-desc" | "qty-asc" | "qty-desc" | "name-asc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "default", label: "Featured" },
  { value: "name-asc", label: "Name: A-Z" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "qty-asc", label: "Quantity: Low to High" },
  { value: "qty-desc", label: "Quantity: High to Low" },
];


const CATEGORY_NAV: { name: "All" | "Lighting" | "Mirrors" | "Tables"; path: string }[] = [
  { name: "All", path: "/all" },
  { name: "Lighting", path: "/lighting" },
  { name: "Mirrors", path: "/mirrors" },
  { name: "Tables", path: "/tables" },
];

interface CategoryPageProps {
  category: "All" | "Lighting" | "Mirrors" | "Tables";
  title: string;
  subtitle?: string;
}

function formatMoney(n: number | null): string {
  if (n == null) return "—";
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function computeDiscountPct(row: SheetRow): number | null {
  if (row.discountPct != null) return Math.round(row.discountPct);
  if (row.price != null && row.msrp && row.msrp > 0) {
    return Math.round((1 - row.price / row.msrp) * 100);
  }
  return null;
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const CategoryPage = ({ category, title, subtitle }: CategoryPageProps) => {
  const { products, loading, error } = useCatalogProducts();
  const refreshedAt = useInventoryRefreshedAt();
  const { user, isApproved } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const location = useLocation();
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("qty-desc");

  useEffect(() => {
    if (loading) return;
    const hash = location.hash;
    if (!hash) return;
    const id = hash.replace(/^#/, "");
    // Defer to allow grid to render
    const t = window.setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-accent");
        window.setTimeout(() => el.classList.remove("ring-2", "ring-accent"), 2000);
      }
    }, 100);
    return () => window.clearTimeout(t);
  }, [loading, location.hash]);


  const inCategory = useMemo(
    () =>
      category === "All"
        ? products
        : products.filter(
            (p) => (p.category ?? "").trim().toLowerCase() === category.toLowerCase(),
          ),
    [products, category],
  );

  const brands = useMemo(() => {
    const set = new Set<string>();
    for (const p of inCategory) if (p.brand) set.add(p.brand);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [inCategory]);

  const visible = useMemo(() => {
    const base = activeBrand ? inCategory.filter((p) => p.brand === activeBrand) : inCategory;
    const arr = [...base];
    const num = (v: number | null | undefined, fallback: number) =>
      v == null || !Number.isFinite(v) ? fallback : v;
    if (sortKey === "default") {
      // Default lead brand varies by category.
      // Note: Mopio products are stored under the "Castlery" brand in the sheet.
      const leadBrand =
        category === "Mirrors" ? "modus furniture"
        : category === "Tables" ? "castlery"
        : "arteriors home";
      const isLead = (p: SheetRow) =>
        (p.brand ?? "").toLowerCase().includes(leadBrand.split(" ")[0]);
      // Within Hem, lead with Dusk lamps, then Kuu.
      const hemRank = (p: SheetRow) => {
        if ((p.brand ?? "").toLowerCase() !== "hem") return 99;
        const n = p.name.toLowerCase();
        if (n.includes("dusk")) return 0;
        if (n.includes("kuu")) return 1;
        return 2;
      };
      arr.sort((a, b) => {
        const score = (p: SheetRow) => {
          const lead = isLead(p);
          const hasImage = !!p.imageUrl;
          if (lead && hasImage) return 0;
          if (lead) return 1;
          if (hasImage) return 2;
          return 3;
        };
        // For Lighting + Arteriors, lead with chandeliers within the lead group.
        // For Tables + Arteriors, push stools to the end of the lead group.
        const leadTypeRank = (p: SheetRow) => {
          if (!isLead(p)) return 0;
          if (category === "Lighting") return /chandelier/i.test(p.name) ? 0 : 1;
          if (category === "Tables") return /stool/i.test(p.name) ? 1 : 0;
          return 0;
        };
        const sa = score(a);
        const sb = score(b);
        if (sa !== sb) return sa - sb;
        const la = leadTypeRank(a);
        const lb = leadTypeRank(b);
        if (la !== lb) return la - lb;
        const ha = hemRank(a);
        const hb = hemRank(b);
        if (ha !== hb) return ha - hb;
        return num(a.price, Infinity) - num(b.price, Infinity);

      });
      return arr;
    }



    arr.sort((a, b) => {
      switch (sortKey) {
        case "price-asc":
          return num(a.price, Infinity) - num(b.price, Infinity);
        case "price-desc":
          return num(b.price, -Infinity) - num(a.price, -Infinity);
        case "qty-asc":
          return num(a.unitsAvailable, Infinity) - num(b.unitsAvailable, Infinity);
        case "qty-desc":
          return num(b.unitsAvailable, -Infinity) - num(a.unitsAvailable, -Infinity);
        case "name-asc":
          return (a.name ?? "").localeCompare(b.name ?? "");
        default:
          return 0;
      }
    });
    return arr;
  }, [inCategory, activeBrand, sortKey]);



  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title} — Comeback Goods</title>
        {subtitle ? <meta name="description" content={subtitle} /> : null}
      </Helmet>
      <Navbar />

      <div className="sticky top-16 md:top-20 z-40 shadow-sm">
        {/* Dark navy category bar */}
        <div className="bg-[hsl(var(--primary))] text-primary-foreground">
          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            <nav className="flex items-center gap-6 md:gap-10 h-12">
              {CATEGORY_NAV.map((c) => {
                const active = c.name === category;
                return (
                  <Link
                    key={c.name}
                    to={c.path}
                    className={cn(
                      "text-sm md:text-base font-bold tracking-wide uppercase transition-colors",
                      active
                        ? "text-accent border-b-2 border-accent pb-1"
                        : "text-primary-foreground/80 hover:text-primary-foreground",
                    )}
                  >
                    {c.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Light gray brand filter band */}
        {brands.length > 0 && (
          <div className="bg-muted/95 backdrop-blur border-b border-border">
            <div className="container mx-auto px-4 md:px-6 max-w-7xl py-2 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground mr-1">
                Filter by Brand:
              </span>
              <button
                type="button"
                onClick={() => setActiveBrand(null)}
                className={cn(
                  "px-3 py-1 rounded-md text-sm font-medium border transition-colors",
                  activeBrand === null
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-background text-foreground border-border hover:border-accent/60",
                )}
              >
                All Brands
              </button>
              {brands.map((b) => {
                const active = activeBrand === b;
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setActiveBrand(active ? null : b)}
                    className={cn(
                      "px-3 py-1 rounded-md text-sm font-medium border transition-colors",
                      active
                        ? "bg-accent text-accent-foreground border-accent"
                        : "bg-background text-foreground border-border hover:border-accent/60",
                    )}
                  >
                    {b}
                  </button>
                );
              })}
              <div className="ml-auto flex items-center gap-2">
                <label htmlFor="sort" className="text-sm text-muted-foreground whitespace-nowrap">
                  Sort by:
                </label>
                <select
                  id="sort"
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="border border-border bg-background text-foreground rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

      </div>


      <main className="container mx-auto px-4 md:px-6 py-8 md:py-12 max-w-7xl">
        <header className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {refreshedAt ? (
            <p className="mt-2 text-sm uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-2">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              {formatInventoryRefreshed(refreshedAt)}
            </p>
          ) : null}
        </header>


        {loading ? (
          <div className="container mx-auto px-4 md:px-6 py-20 text-center">
            <p className="font-display text-2xl text-primary">Loading live inventory…</p>
          </div>
        ) : error ? (
          <div className="py-24 text-center text-destructive">{error}</div>
        ) : visible.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground">
            No {category.toLowerCase()} available right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {visible.map((p, i) => {
              // Force 75% off MSRP across the catalog UI
              const msrpForDisplay = p.msrp ?? p.price ?? null;
              const displayPrice =
                msrpForDisplay != null ? Math.round(msrpForDisplay * 0.25 * 100) / 100 : p.price;
              const pct = msrpForDisplay != null ? 75 : computeDiscountPct(p);
              const isMeridian = /meridian/i.test(p.name);
              const productId = `${p.brand}::${p.name}`;
              const cardId = `p-${slugify(productId)}`;
              const fav = isFavorite(productId);
              return (
                <article
                  id={cardId}
                  key={`${p.brand}-${p.name}-${i}`}
                  className="group flex flex-col bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow scroll-mt-24"
                >
                  <div
                    className={cn(
                      "relative aspect-square overflow-hidden",
                      category === "Lighting"
                        ? "bg-gradient-to-br from-muted/40 via-background to-muted/60 p-6"
                        : isMeridian
                          ? "bg-white p-6"
                          : "bg-muted",
                    )}
                  >
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        loading="lazy"
                        className={cn(
                          "w-full h-full group-hover:scale-[1.02] transition-transform duration-300",
                          category === "Lighting" || isMeridian ? "object-contain" : "object-cover",
                        )}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-base md:text-lg font-medium text-muted-foreground text-center px-4">
                        Image Coming Soon
                      </div>
                    )}
                    <button
                      type="button"
                      aria-label={fav ? "Remove from favorites" : "Add to favorites"}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleFavorite(productId, {
                          name: p.name,
                          brand: p.brand,
                          imageUrl: p.imageUrl,
                          msrp: p.msrp,
                          price: p.price,
                        });
                      }}
                      className="absolute top-3 right-3 h-9 w-9 rounded-full bg-background/90 backdrop-blur border border-border shadow-sm flex items-center justify-center hover:bg-background transition-colors"
                    >
                      <Heart
                        className={cn(
                          "h-5 w-5 transition-colors",
                          fav ? "fill-accent text-accent" : "text-foreground",
                        )}
                      />
                    </button>
                  </div>

                  <div className="p-5 flex flex-col gap-2 flex-1">
                    <div className="text-sm uppercase tracking-widest text-accent font-bold">
                      {p.brand}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground line-clamp-2 min-h-[3.5rem] leading-snug">
                      {p.name}
                    </h3>
                    {user && isApproved ? (
                      <div className="flex items-baseline gap-2 mt-auto pt-2">
                        <span className="text-xl font-bold text-foreground">
                          {formatMoney(displayPrice)}
                        </span>
                        {msrpForDisplay != null && displayPrice != null && msrpForDisplay > displayPrice && (
                          <span className="text-sm text-muted-foreground line-through">
                            {formatMoney(msrpForDisplay)}
                          </span>
                        )}
                      </div>
                    ) : user && !isApproved ? (
                      <div className="mt-auto pt-2">
                        <Link
                          to={`/unlock?redirect=${encodeURIComponent((typeof window !== "undefined" ? window.location.pathname + window.location.search : "/") + `#${cardId}`)}`}
                          className="text-sm font-semibold text-accent underline underline-offset-4 hover:no-underline"
                        >
                          Enter your access code to unlock pricing
                        </Link>
                      </div>
                    ) : (
                      <div className="mt-auto pt-2">
                        <Link
                          to={`/auth?redirect=${encodeURIComponent((typeof window !== "undefined" ? window.location.pathname + window.location.search : "/") + `#${cardId}`)}`}
                          className="text-sm font-semibold text-accent underline underline-offset-4 hover:no-underline"
                        >
                          Sign in to see pricing
                        </Link>
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground">
                      {p.unitsAvailable > 25 ? "25+" : p.unitsAvailable} {p.unitsAvailable === 1 ? "unit" : "units"} available

                    </div>
                    {user && isApproved && p.unitsAvailable > 0 && displayPrice != null && (
                      <AddToOrderButton
                        item={{
                          id: productId,
                          productName: p.name,
                          brand: p.brand,
                          imageUrl: p.imageUrl ?? null,
                          msrp: msrpForDisplay ?? displayPrice,
                          yourPrice: displayPrice,
                          unitsAvailable: p.unitsAvailable,
                        }}
                      />
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default CategoryPage;
