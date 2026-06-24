import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { CatalogOrderProvider } from "@/contexts/CatalogOrderContext";
import { BuildOrderProvider } from "@/contexts/BuildOrderContext";
import OrderBar from "@/components/OrderBar";
import ProtectedRoute from "@/components/ProtectedRoute";

import Index from "./pages/Index";

import Favorites from "./pages/Favorites";
import About from "./pages/About";
import AdminImport from "./pages/AdminImport";
import AdminProducts from "./pages/AdminProducts";
import AdminImports from "./pages/AdminImports";
import AdminAccessCodes from "./pages/AdminAccessCodes";
import AdminOrders from "./pages/AdminOrders";
import UnlockAccess from "./pages/UnlockAccess";

import Auth from "./pages/Auth";
const ExternalRedirect = ({ to }: { to: string }) => {
  if (typeof window !== "undefined") window.location.replace(to);
  return null;
};
import LightingProgram from "./pages/LightingProgram";
import MirrorProgram from "./pages/MirrorProgram";
import MeridianLamp from "./pages/MeridianLamp";

import Seating from "./pages/Seating";
import Tables from "./pages/Tables";
import All from "./pages/All";
import Beds from "./pages/Beds";
import Cabinets from "./pages/Cabinets";
import NotFound from "./pages/NotFound";
import ScrollToTop from "./components/ScrollToTop";

const queryClient = new QueryClient();

const App = () => {
  return (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          
            <FavoritesProvider>
              <CatalogOrderProvider>
              <BuildOrderProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ScrollToTop />
                <OrderBar />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/unlock" element={<UnlockAccess />} />
                  <Route path="/admin/access-codes" element={<ProtectedRoute><AdminAccessCodes /></ProtectedRoute>} />
                  <Route path="/admin/orders" element={<ProtectedRoute><AdminOrders /></ProtectedRoute>} />
                  <Route path="/about" element={<About />} />
                  <Route path="/catalog" element={<Navigate to="/" replace />} />
                  <Route path="/products" element={<Navigate to="/" replace />} />
                  <Route path="/product/:id" element={<Navigate to="/" replace />} />
                  <Route path="/pallets" element={<Navigate to="/" replace />} />
                  <Route path="/pallets/:palletId" element={<Navigate to="/" replace />} />
                  <Route path="/pallet" element={<Navigate to="/" replace />} />
                  <Route path="/cart" element={<Navigate to="/" replace />} />
                  <Route path="/lighting" element={<LightingProgram />} />
                  <Route path="/lighting-program" element={<Navigate to="/lighting" replace />} />
                  <Route path="/Lighting-Program" element={<Navigate to="/lighting" replace />} />
                  <Route path="/mirrors" element={<MirrorProgram />} />
                  <Route path="/mirror-program" element={<Navigate to="/mirrors" replace />} />
                  <Route path="/Mirror-Program" element={<Navigate to="/mirrors" replace />} />
                  <Route path="/rechargeable-table-lamps" element={<MeridianLamp />} />
                  <Route path="/seating" element={<Seating />} />
                  <Route path="/tables" element={<Tables />} />
                  <Route path="/all" element={<All />} />
                  <Route path="/beds" element={<Beds />} />
                  <Route path="/cabinets" element={<Cabinets />} />

                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/admin/products" element={<Navigate to="/admin" replace />} />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute>
                        <AdminProducts />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/import"
                    element={
                      <ProtectedRoute>
                        <AdminImport />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/imports"
                    element={
                      <ProtectedRoute>
                        <AdminImports />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>

                
              </BrowserRouter>
              </BuildOrderProvider>
              </CatalogOrderProvider>
            </FavoritesProvider>
          
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </HelmetProvider>
  );
};

export default App;
