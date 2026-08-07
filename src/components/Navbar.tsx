import { Search, Menu, X, Heart, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import comebackLogo from "@/assets/comeback-goods-logo.png";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface NavbarProps {
  cartItemCount?: number;
}

const Navbar = ({ cartItemCount }: NavbarProps) => {
  const navigate = useNavigate();
  const { totalFavorites } = useFavorites();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
    setMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-16 md:h-20 items-center justify-between gap-2 md:gap-4">
          {/* Left: Logo + Tagline */}
          <Link to="/" className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <img 
              src={comebackLogo} 
              alt="Comeback Goods" 
              className="h-10 w-10 md:h-12 md:w-12 rounded-full object-cover"
            />
            <div className="flex flex-col">
              <span className="text-lg md:text-2xl font-bold text-foreground tracking-tight">
                Comeback Goods
              </span>
              <span className="text-xs sm:text-sm md:text-base text-muted-foreground font-medium">
                Almost Perfect.
              </span>
            </div>
          </Link>




          <div className="hidden md:flex items-center gap-1 lg:gap-2 flex-shrink-0">
            {[
              { to: "/lighting", label: "Lighting", match: ["/lighting", "/lighting-program"] },
              { to: "/mirrors", label: "Mirrors", match: ["/mirrors", "/mirror-program"] },
              { to: "/tables", label: "Tables", match: ["/tables"] },
              { to: "/beds", label: "Beds", match: ["/beds"] },
              { to: "/dressers", label: "Dressers", match: ["/dressers"] },
              { to: "/storage", label: "Storage", match: ["/storage"] },
            ].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => {
                  const active = isActive || item.match.some((p) => window.location.pathname.startsWith(p));
                  return `px-2 lg:px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    active ? "text-accent" : "text-muted-foreground hover:text-foreground"
                  }`;
                }}
              >
                {item.label}
              </NavLink>
            ))}
            <Link to="/favorites">
              <Button
                variant="ghost"
                size="sm"
                className="relative p-2"
              >
                <Heart className={`h-5 w-5 ${totalFavorites > 0 ? "fill-accent text-accent" : ""}`} />
                {totalFavorites > 0 && (
                  <Badge
                    variant="accent"
                    className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {totalFavorites}
                  </Badge>
                )}
              </Button>
            </Link>
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            ) : (
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile: Favorites + Menu */}
          <div className="flex md:hidden items-center gap-1">
            <Link to="/favorites">
              <Button
                variant="ghost"
                size="sm"
                className="relative p-2"
              >
                <Heart className={`h-5 w-5 ${totalFavorites > 0 ? "fill-accent text-accent" : ""}`} />
                {totalFavorites > 0 && (
                  <Badge
                    variant="accent"
                    className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {totalFavorites}
                  </Badge>
                )}
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>


        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t py-4 space-y-4">
            <div className="flex flex-col gap-2">
              {[
                { to: "/lighting", label: "Lighting" },
                { to: "/mirrors", label: "Mirrors" },
                { to: "/tables", label: "Tables" },
                { to: "/beds", label: "Beds" },
                { to: "/dressers", label: "Dressers" },
                { to: "/storage", label: "Storage" },
              ].map((item) => (
                <Link key={item.to} to={item.to} onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">
                    {item.label}
                  </Button>
                </Link>
              ))}
              <Link to="/about" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full">
                  About
                </Button>
              </Link>
              {user ? (
                <Button variant="outline" className="w-full gap-2" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              ) : (
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full gap-2">
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
