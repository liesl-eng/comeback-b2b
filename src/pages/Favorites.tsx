import Navbar from "@/components/Navbar";
import { useFavorites } from "@/contexts/FavoritesContext";
import { Button } from "@/components/ui/button";
import { Heart, ArrowRight, ImageOff, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

function formatUsd(n: number | null | undefined): string | null {
  if (n == null || isNaN(n as number)) return null;
  return `$${Math.round(n as number).toLocaleString("en-US")}`;
}

const Favorites = () => {
  const { favorites, itemsData, removeFavorite } = useFavorites();
  const navigate = useNavigate();

  const items = favorites
    .map((id) => ({ id, data: itemsData[id] }))
    .filter((x) => !!x.data);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold mb-2 flex items-center gap-3">
            <Heart className="h-8 w-8 text-accent fill-accent" />
            My Favorites
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {items.length} saved {items.length === 1 ? "item" : "items"}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No favorites yet</h2>
            <p className="text-muted-foreground mb-6">
              Start saving products you love by clicking the heart icon.
            </p>
            <Button variant="accent" onClick={() => navigate("/#programs")} className="gap-2">
              Build Your Spaces
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map(({ id, data }) => {
              const price = formatUsd(data.price);
              const msrp = formatUsd(data.msrp);
              return (
                <div key={id} className="border rounded-lg overflow-hidden bg-card flex flex-col group relative">
                  <button
                    type="button"
                    aria-label="Remove from favorites"
                    onClick={() => removeFavorite(id)}
                    className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-background/90 border flex items-center justify-center hover:bg-background"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    {data.imageUrl ? (
                      <img src={data.imageUrl} alt={data.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <ImageOff className="h-10 w-10 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="p-3 flex flex-col gap-1 flex-1">
                    {data.brand && (
                      <div className="text-[10px] font-bold tracking-widest text-accent uppercase">{data.brand}</div>
                    )}
                    <div className="font-medium leading-tight line-clamp-2">{data.name}</div>
                    {(price || msrp) && (
                      <div className="mt-auto pt-2 flex items-baseline gap-2">
                        {msrp && price && (
                          <span className="text-xs text-muted-foreground line-through">{msrp}</span>
                        )}
                        {price && <span className="text-sm font-bold text-foreground">{price}</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Favorites;
