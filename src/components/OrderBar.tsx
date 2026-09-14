import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Trash2, Plus, Minus, X, Check, ArrowRight, ArrowLeft, AlertCircle } from "lucide-react";
import { useBuildOrder } from "@/contexts/BuildOrderContext";
import { supabase } from "@/integrations/supabase/client";

const fmtMoney = (value: number) => `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
type FlowStep = "form" | "review" | "submitting" | "done" | "error";

function ItemList() {
  const { state, updateQty, removeItem } = useBuildOrder();
  return (
    <div className="space-y-2">
      {state.items.map((item) => (
        <div key={item.id} className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
          <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded bg-muted">
            {item.imageUrl && <img src={item.imageUrl} alt={item.productName} className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-accent">{item.brand}</p>
            <p className="truncate text-sm font-semibold text-foreground">{item.productName}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.id, item.quantity - 1)} disabled={item.quantity <= 1}>
                <Minus className="h-3 w-3" />
              </Button>
              <Input
                type="number"
                value={item.quantity}
                min={1}
                max={item.unitsAvailable || undefined}
                onChange={(event) => updateQty(item.id, parseInt(event.target.value, 10) || 1)}
                className="h-7 w-14 text-center text-xs"
              />
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.id, item.quantity + 1)} disabled={item.unitsAvailable > 0 && item.quantity >= item.unitsAvailable}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-sm font-bold">{fmtMoney(item.quantity * item.yourPrice)}</p>
            <p className="text-[11px] text-muted-foreground line-through">{fmtMoney(item.quantity * item.msrp)}</p>
            <Button variant="ghost" size="icon" className="mt-1 h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeItem(item.id)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OrderBar() {
  const { state, totals, clearOrder, setBuyerInfo } = useBuildOrder();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [step, setStep] = useState<FlowStep>("form");
  const [buyer, setBuyer] = useState(state.buyerInfo);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => { setBuyer(state.buyerInfo); }, [state.buyerInfo]);
  if (totals.items === 0) return null;

  const openSubmit = () => { setStep("form"); setSubmitOpen(true); };
  const validateBuyer = () => buyer.companyName.trim() && buyer.contactName.trim() && /^\S+@\S+\.\S+$/.test(buyer.email.trim());

  const submitOrder = async () => {
    setStep("submitting");
    setBuyerInfo(buyer);
    const orderItems = state.items.map((item) => ({
      brand: item.brand,
      productName: item.productName,
      quantity: item.quantity,
      yourPrice: item.yourPrice,
      msrp: item.msrp,
      lineTotal: item.quantity * item.yourPrice,
      lineMSRP: item.quantity * item.msrp,
    }));
    const payload = {
      timestamp: new Date().toISOString(),
      status: "New",
      companyName: buyer.companyName,
      contactName: buyer.contactName,
      email: buyer.email,
      phone: buyer.phone,
      notes: buyer.notes,
      totalItems: totals.items,
      orderTotal: totals.grandTotal,
      orderTotalMSRP: totals.grandMsrp,
      totalSavings: totals.savings,
      items: orderItems,
      brandSummary: totals.brandSummary,
      orderItemsFormatted: orderItems.map((item) => `[${item.brand}] ${item.productName} x${item.quantity} — ${fmtMoney(item.lineTotal)}`).join("\n"),
    };

    try {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData.user?.id;
        if (userId) {
          const { data: order, error: orderError } = await supabase.from("orders").insert({
            user_id: userId,
            company_name: buyer.companyName,
            contact_name: buyer.contactName,
            email: buyer.email,
            phone: buyer.phone || null,
            notes: buyer.notes || null,
            total_items: totals.items,
            order_total: totals.grandTotal,
            order_total_msrp: totals.grandMsrp,
            total_savings: totals.savings,
            payload,
          }).select("id").single();
          if (orderError) console.error("[OrderBar] order insert error", orderError);
          if (order) {
            const { error: itemsError } = await supabase.from("order_items").insert(orderItems.map((item) => ({
              order_id: order.id,
              space_name: null,
              brand: item.brand,
              product_name: item.productName,
              quantity: item.quantity,
              unit_price: item.yourPrice,
              unit_msrp: item.msrp,
              line_total: item.lineTotal,
            })));
            if (itemsError) console.error("[OrderBar] items insert error", itemsError);
          }
        }
      } catch (databaseError) {
        console.error("[OrderBar] db save failed", databaseError);
      }

      const url = (import.meta.env.VITE_MAKE_WEBHOOK_URL as string | undefined) || "";
      if (url) {
        const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      }
      setStep("done");
    } catch (error) {
      console.error("[OrderBar] submit error", error);
      setErrorMsg(error instanceof Error ? error.message : "Unknown error");
      setStep("error");
    }
  };

  const startNewOrder = () => {
    clearOrder();
    setSubmitOpen(false);
    setDrawerOpen(false);
    setStep("form");
    window.location.href = "/";
  };

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
        <div className="pointer-events-auto border-t border-primary-foreground/10 bg-primary text-primary-foreground shadow-2xl">
          <div className="container mx-auto px-4 py-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
              <div className="flex min-w-0 items-center gap-3">
                <Sparkles className="h-5 w-5 flex-shrink-0 text-accent" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight">Your Request</p>
                  <p className="text-xs leading-tight text-primary-foreground/70">{totals.items} item{totals.items === 1 ? "" : "s"} · {fmtMoney(totals.grandTotal)}</p>
                </div>
              </div>
              <div className="flex-1" />
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={() => setDrawerOpen(true)}>View Request</Button>
                <Button size="sm" onClick={openSubmit} className="bg-accent font-semibold text-accent-foreground hover:bg-accent/90">Submit Request</Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="bottom" className="flex h-[92vh] max-h-[92vh] flex-col p-0">
          <SheetHeader className="border-b p-5">
            <SheetTitle className="text-2xl font-bold">Your Request</SheetTitle>
            <p className="text-sm text-muted-foreground">{totals.items} item{totals.items === 1 ? "" : "s"} · <span className="font-semibold text-foreground">{fmtMoney(totals.grandTotal)} total</span></p>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-5"><ItemList /></div>
          <div className="space-y-2 border-t bg-card p-5">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold">{fmtMoney(totals.grandTotal)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total MSRP</span><span className="text-muted-foreground line-through">{fmtMoney(totals.grandMsrp)}</span></div>
            <div className="flex justify-between pb-2 text-sm"><span className="text-muted-foreground">Total Savings</span><span className="font-semibold text-accent">{fmtMoney(totals.savings)}</span></div>
            <Button size="lg" onClick={() => { setDrawerOpen(false); openSubmit(); }} className="w-full bg-accent font-semibold text-accent-foreground hover:bg-accent/90">Submit Request <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={submitOpen} onOpenChange={(open) => { setSubmitOpen(open); if (!open) setStep("form"); }}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          {step === "form" && <>
            <DialogHeader><DialogTitle>Your Information</DialogTitle><DialogDescription>{totals.items} items · {fmtMoney(totals.grandTotal)} total</DialogDescription></DialogHeader>
            <div className="mt-1 space-y-3">
              <div className="space-y-1.5"><Label>Company Name *</Label><Input maxLength={200} value={buyer.companyName} onChange={(event) => setBuyer((previous) => ({ ...previous, companyName: event.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Contact Name *</Label><Input maxLength={200} value={buyer.contactName} onChange={(event) => setBuyer((previous) => ({ ...previous, contactName: event.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Email *</Label><Input type="email" maxLength={255} value={buyer.email} onChange={(event) => setBuyer((previous) => ({ ...previous, email: event.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input type="tel" maxLength={40} value={buyer.phone} onChange={(event) => setBuyer((previous) => ({ ...previous, phone: event.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Notes / Special Instructions</Label><Textarea rows={3} maxLength={2000} value={buyer.notes} onChange={(event) => setBuyer((previous) => ({ ...previous, notes: event.target.value }))} /></div>
              <Button className="w-full bg-accent font-semibold text-accent-foreground hover:bg-accent/90" disabled={!validateBuyer()} onClick={() => { setBuyerInfo(buyer); setStep("review"); }}>Review Request <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </>}

          {step === "review" && <>
            <DialogHeader><DialogTitle>Review Your Request</DialogTitle><DialogDescription>Confirm the details below before submitting.</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg border p-3 text-sm">
                <div className="mb-1 flex items-center justify-between"><span className="font-semibold">Buyer Info</span><Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs text-accent" onClick={() => setStep("form")}>Edit</Button></div>
                <p>{buyer.companyName}</p><p className="text-muted-foreground">{buyer.contactName} · {buyer.email}{buyer.phone && ` · ${buyer.phone}`}</p>{buyer.notes && <p className="mt-1 text-muted-foreground italic">“{buyer.notes}”</p>}
              </div>
              <ItemList />
              <div className="flex items-center justify-between rounded-lg bg-muted p-3"><span className="font-semibold">Total</span><span className="text-xl font-bold">{fmtMoney(totals.grandTotal)}</span></div>
              <div className="flex items-center gap-2"><Button variant="ghost" onClick={() => setStep("form")}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Button><Button className="flex-1 bg-accent font-semibold text-accent-foreground hover:bg-accent/90" onClick={submitOrder}>Confirm &amp; Submit <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
            </div>
          </>}

          {step === "submitting" && <div className="py-10 text-center"><DialogTitle className="mb-2 text-lg">Submitting your request…</DialogTitle><p className="text-sm text-muted-foreground">One moment please.</p></div>}
          {step === "done" && <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/20"><Check className="h-9 w-9 text-accent" /></div>
            <DialogTitle className="mb-2 text-2xl">Request Submitted!</DialogTitle>
            <p className="mb-4 text-sm text-muted-foreground">Thanks {buyer.contactName || "for your request"}. We’ll review it and be in touch within 1 business day.</p>
            <div className="mb-5 space-y-1 rounded-lg border p-3 text-left text-xs"><div className="flex justify-between"><span>Items</span><span className="font-semibold">{totals.items}</span></div><div className="flex justify-between"><span>Request Total</span><span className="font-semibold">{fmtMoney(totals.grandTotal)}</span></div></div>
            <div className="flex flex-col gap-2 sm:flex-row"><Button variant="outline" className="flex-1" onClick={startNewOrder}>Start a New Request</Button><Button className="flex-1 bg-accent font-semibold text-accent-foreground hover:bg-accent/90" onClick={() => setSubmitOpen(false)}>Browse More Products <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
          </div>}
          {step === "error" && <div className="py-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15"><AlertCircle className="h-8 w-8 text-destructive" /></div>
            <DialogTitle className="mb-2 text-xl">Something went wrong</DialogTitle><p className="mb-2 text-sm text-muted-foreground">Please try again or contact us directly.</p>{errorMsg && <p className="mb-4 text-xs text-muted-foreground">{errorMsg}</p>}
            <div className="flex flex-col gap-2 sm:flex-row"><Button variant="outline" className="flex-1" asChild><a href="mailto:hello@comebackgoods.com">Contact Us</a></Button><Button className="flex-1 bg-accent font-semibold text-accent-foreground hover:bg-accent/90" onClick={submitOrder}>Try Again</Button></div>
          </div>}
        </DialogContent>
      </Dialog>
    </>
  );
}