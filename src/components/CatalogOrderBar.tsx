import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { ShoppingCart, Trash2, CheckCircle2, AlertCircle, Minus, Plus, LogIn } from "lucide-react";
import { useCatalogOrder, BRAND_MOQ } from "@/contexts/CatalogOrderContext";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default function CatalogOrderBar() {
  const { lines, totals, increment, decrement, setQuantity, remove, clear } = useCatalogOrder();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [signupPromptOpen, setSignupPromptOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [contact, setContact] = useState({ companyName: "", contactName: "", email: "", phone: "", notes: "" });

  const list = Object.values(lines);
  if (list.length === 0) return null;

  const topBrand = totals.byBrand[0];
  const progressPct = topBrand ? Math.min((topBrand.total / BRAND_MOQ) * 100, 100) : 0;
  const isContactValid = contact.companyName.trim() && contact.email.trim();

  async function handleSubmit() {
    setSubmitting(true);
    const orderItems = list
      .map((l) => `${l.quantity} x ${l.name} (${l.brand}) @ ${fmt(l.unitPrice)} = ${fmt(l.quantity * l.unitPrice)}`)
      .join("\n");
    const payload = {
      kind: "catalog_order" as const,
      timestamp: new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
      company_name: contact.companyName.trim().slice(0, 200),
      contact_name: contact.contactName.trim().slice(0, 200),
      email: contact.email.trim().slice(0, 255),
      phone: contact.phone.trim().slice(0, 40),
      notes: contact.notes.trim().slice(0, 2000),
      order_items: orderItems.slice(0, 20000),
      total_items: String(totals.items),
      order_total: fmt(totals.grandTotal),
    };
    try {
      await supabase.functions.invoke("submit-webhook", { body: payload });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 px-3 pb-3 pointer-events-none">
        <div className="container mx-auto pointer-events-auto">
          <Card className="border-2 border-accent/40 shadow-xl bg-card/95 backdrop-blur-sm">
            <CardContent className="p-3 md:p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Items</p>
                    <p className="text-lg font-bold leading-tight">{totals.items}</p>
                  </div>
                  <div className="flex-1 min-w-0 hidden md:block">
                    {topBrand && (
                      <div className="flex items-center text-xs">
                        <span className="truncate font-medium">{topBrand.brand}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm">
                        <ShoppingCart className="h-4 w-4 mr-1.5" /> Review
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle>Your Order</SheetTitle>
                      </SheetHeader>
                      <div className="mt-4 space-y-3">
                        {totals.byBrand.map((b) => (
                          <div key={b.brand} className="rounded-lg border p-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-semibold text-sm">{b.brand}</span>
                            </div>
                            <div className="space-y-2">
                              {list.filter((l) => l.brand === b.brand).map((l) => (
                                <div key={l.productId} className="flex items-center gap-2">
                                  <div className="h-12 w-12 rounded bg-muted overflow-hidden flex-shrink-0">
                                    {l.imageUrl && <img src={l.imageUrl} alt={l.name} className="h-full w-full object-cover" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{l.name}</p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => decrement(l.productId)}>
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <input
                                      type="number"
                                      value={l.quantity}
                                      min={0}
                                      max={l.unitsAvailable || undefined}
                                      onChange={(e) => {
                                        const n = parseInt(e.target.value) || 0;
                                        setQuantity(l.productId, n, {
                                          name: l.name, brand: l.brand, imageUrl: l.imageUrl,
                                          unitPrice: l.unitPrice, unitsAvailable: l.unitsAvailable,
                                        });
                                      }}
                                      className="h-7 w-12 text-center text-xs rounded border border-input bg-background"
                                    />
                                    <Button variant="outline" size="icon" className="h-7 w-7"
                                      onClick={() => increment(l.productId, {
                                        name: l.name, brand: l.brand, imageUrl: l.imageUrl,
                                        unitPrice: l.unitPrice, unitsAvailable: l.unitsAvailable,
                                      })}>
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                                      onClick={() => remove(l.productId)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Button variant="ghost" size="sm" onClick={clear}>Clear order</Button>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                  <Button
                    size="sm"
                    onClick={() => setSubmitOpen(true)}
                    className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
                  >
                    Request Quote
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Submit dialog */}
      <Dialog open={submitOpen} onOpenChange={(o) => { setSubmitOpen(o); if (!o) setSubmitted(false); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {submitted ? (
            <div className="text-center py-6">
              <CheckCircle2 className="h-14 w-14 text-accent mx-auto mb-3" />
              <DialogTitle className="text-xl mb-2">Quote Request Submitted!</DialogTitle>
              <p className="text-muted-foreground text-sm">We'll review your order and get back within 1–2 business days.</p>
              <Button className="mt-5" onClick={() => { setSubmitOpen(false); setSubmitted(false); clear(); setContact({ companyName: "", contactName: "", email: "", phone: "", notes: "" }); }}>Done</Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Request Quote</DialogTitle>
                <DialogDescription>
                  {totals.items} items · {totals.byBrand.length} brand{totals.byBrand.length === 1 ? "" : "s"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 mt-1">
                <div className="space-y-1.5">
                  <Label>Company Name *</Label>
                  <Input value={contact.companyName} onChange={(e) => setContact((p) => ({ ...p, companyName: e.target.value }))} placeholder="Your company" />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Name</Label>
                  <Input value={contact.contactName} onChange={(e) => setContact((p) => ({ ...p, contactName: e.target.value }))} placeholder="Your name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email *</Label>
                  <Input type="email" value={contact.email} onChange={(e) => setContact((p) => ({ ...p, email: e.target.value }))} placeholder="you@company.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input type="tel" value={contact.phone} onChange={(e) => setContact((p) => ({ ...p, phone: e.target.value }))} placeholder="(555) 555-5555" />
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea value={contact.notes} onChange={(e) => setContact((p) => ({ ...p, notes: e.target.value }))} placeholder="Any special requests..." rows={3} />
                </div>
                <Button
                  className="w-full font-semibold bg-accent text-accent-foreground hover:bg-accent/90"
                  size="lg"
                  disabled={!isContactValid || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? "Submitting…" : "Submit Quote Request"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
