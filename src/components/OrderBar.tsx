import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sparkles, Trash2, Plus, Minus, X, ChevronDown, Check, Pencil, ArrowRight, ArrowLeft, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useBuildOrder, ORDER_MOQ, OrderSpace } from "@/contexts/BuildOrderContext";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const fmtMoney = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

type FlowStep = "form" | "review" | "submitting" | "done" | "error";

function MoqProgress({ value, total, met, compact }: { value: number; total: number; met: boolean; compact?: boolean }) {
  const pct = Math.min(100, (value / total) * 100);
  return (
    <div className={cn("w-full", compact ? "" : "")}>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className={cn("font-semibold", met ? "text-accent" : "text-white/80")}>
          {met ? "✓ Minimum Order Reached" : "Progress to Minimum Order"}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full bg-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-white/70">
        {fmtMoney(value)} of {fmtMoney(total)} minimum
      </p>
    </div>
  );
}

function MoqProgressLight({ value, total, met }: { value: number; total: number; met: boolean }) {
  const pct = Math.min(100, (value / total) * 100);
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className={cn("font-semibold", met ? "text-accent" : "text-foreground/80")}>
          {met ? "✓ Minimum Order Reached" : "Progress to Minimum Order"}
        </span>
        <span className="text-xs text-muted-foreground">
          {fmtMoney(value)} of {fmtMoney(total)}
        </span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}

function SpaceRow({ space }: { space: OrderSpace }) {
  const { totals, updateQty, removeItem, renameSpace, deleteSpace } = useBuildOrder();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(space.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const subtotal = totals.spaceSubtotal(space.id);

  useEffect(() => {
    if (!editing) setDraftName(space.name);
  }, [space.name, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    renameSpace(space.id, draftName);
    setEditing(false);
  };

  const cancel = () => {
    setDraftName(space.name);
    setEditing(false);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 p-3">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <ChevronDown className={cn("h-4 w-4 transition-transform", !open && "-rotate-90")} />
          </Button>
        </CollapsibleTrigger>

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Input
                ref={inputRef}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); commit(); }
                  if (e.key === "Escape") { e.preventDefault(); cancel(); }
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-8 text-sm"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onMouseDown={(e) => e.preventDefault()}
                onClick={commit}
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              className="flex items-center gap-1.5 text-left group w-full"
              title="Click to rename"
            >
              <span className="font-semibold text-sm truncate">{space.name}</span>
              <Pencil className="h-3 w-3 text-muted-foreground opacity-60 group-hover:opacity-100 flex-shrink-0" />
            </button>
          )}
          <p className="text-xs text-muted-foreground">
            {space.items.length} item{space.items.length === 1 ? "" : "s"} · {fmtMoney(subtotal)}
          </p>
        </div>


        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {space.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                {space.items.length > 0
                  ? `This will remove ${space.items.length} item${space.items.length === 1 ? "" : "s"} from your order.`
                  : "This space is empty."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteSpace(space.id)}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <CollapsibleContent>
        <div className="px-3 pb-3 space-y-2">
          {space.items.length === 0 ? (
            <p className="text-xs text-muted-foreground italic px-1 pb-2">No items yet. Add from the product grid.</p>
          ) : space.items.map((i) => {
            const lineTotal = i.quantity * i.yourPrice;
            const lineMsrp = i.quantity * i.msrp;
            return (
              <div key={i.id} className="flex items-start gap-3 rounded-md border border-border/60 p-2">
                <div className="h-12 w-12 rounded bg-muted overflow-hidden flex-shrink-0">
                  {i.imageUrl && <img src={i.imageUrl} alt={i.productName} className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold tracking-widest text-accent uppercase">{i.brand}</p>
                  <p className="text-sm font-semibold text-foreground truncate">{i.productName}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQty(space.id, i.id, i.quantity - 1)} disabled={i.quantity <= 1}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <input
                      type="number"
                      value={i.quantity}
                      min={1}
                      max={i.unitsAvailable || undefined}
                      onChange={(e) => updateQty(space.id, i.id, parseInt(e.target.value) || 1)}
                      className="h-6 w-12 text-center text-xs rounded border border-input bg-background"
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQty(space.id, i.id, i.quantity + 1)}
                          disabled={i.unitsAvailable > 0 && i.quantity >= i.unitsAvailable}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      {i.unitsAvailable > 0 && i.quantity >= i.unitsAvailable && (
                        <TooltipContent>Max: {i.unitsAvailable}</TooltipContent>
                      )}
                    </Tooltip>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold">{fmtMoney(lineTotal)}</p>
                  <p className="text-[11px] text-muted-foreground line-through">{fmtMoney(lineMsrp)}</p>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive mt-1" onClick={() => removeItem(space.id, i.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ReviewSpaceAccordion({ space, subtotal }: { space: OrderSpace; subtotal: number }) {
  const { removeItem, deleteSpace } = useBuildOrder();
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border">
      <div className="flex items-center gap-2 p-3">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <ChevronDown className={cn("h-4 w-4 transition-transform", !open && "-rotate-90")} />
          </Button>
        </CollapsibleTrigger>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{space.name}</p>
          <p className="text-xs text-muted-foreground">
            {space.items.length} item{space.items.length === 1 ? "" : "s"} · {fmtMoney(subtotal)}
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {space.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove {space.items.length} item{space.items.length === 1 ? "" : "s"} from your order.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteSpace(space.id)}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <CollapsibleContent>
        <ul className="px-3 pb-3 space-y-1.5 text-xs">
          {space.items.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-2 py-1.5">
              <span className="truncate flex-1 min-w-0">
                <span className="text-accent font-semibold">{i.brand}</span> · {i.productName} ×{i.quantity}
              </span>
              <span className="font-medium flex-shrink-0">{fmtMoney(i.quantity * i.yourPrice)}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                onClick={() => removeItem(space.id, i.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function OrderBar() {

  const { state, totals, addSpace, clearOrder, setBuyerInfo } = useBuildOrder();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [step, setStep] = useState<FlowStep>("form");
  const [buyer, setBuyer] = useState(state.buyerInfo);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => { setBuyer(state.buyerInfo); }, [state.buyerInfo]);

  if (totals.items === 0) return null;

  const moqMet = true; // MOQ requirement removed — communicated offline
  const remaining = 0;

  const openSubmit = () => {
    setStep("form");
    setSubmitOpen(true);
  };

  const validateBuyer = () =>
    buyer.companyName.trim() &&
    buyer.contactName.trim() &&
    /^\S+@\S+\.\S+$/.test(buyer.email.trim());

  const submitOrder = async () => {
    setStep("submitting");
    setBuyerInfo(buyer);

    const url = (import.meta.env.VITE_MAKE_WEBHOOK_URL as string | undefined) || "";

    const spacesPayload = state.spaces
      .filter((s) => s.items.length > 0)
      .map((s) => ({
        spaceName: s.name,
        items: s.items.map((i) => ({
          brand: i.brand,
          productName: i.productName,
          quantity: i.quantity,
          yourPrice: i.yourPrice,
          msrp: i.msrp,
          lineTotal: i.quantity * i.yourPrice,
          lineMSRP: i.quantity * i.msrp,
        })),
        spaceTotal: totals.spaceSubtotal(s.id),
      }));

    const orderItemsFormatted = spacesPayload
      .map((s, idx) => {
        const header = `Space ${idx + 1} — ${s.spaceName}:`;
        const lines = s.items
          .map((i) => `  [${i.brand}] ${i.productName} x${i.quantity} — ${fmtMoney(i.lineTotal)}`)
          .join("\n");
        return `${header}\n${lines}`;
      })
      .join("\n\n");

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
      spaces: spacesPayload,
      brandSummary: totals.brandSummary,
      orderItemsFormatted,
    };

    try {
      // Save order to database
      try {
        const { data: authData } = await supabase.auth.getUser();
        const uid = authData.user?.id;
        if (uid) {
          const { data: orderRow, error: orderErr } = await supabase
            .from("orders")
            .insert({
              user_id: uid,
              company_name: buyer.companyName,
              contact_name: buyer.contactName,
              email: buyer.email,
              phone: buyer.phone || null,
              notes: buyer.notes || null,
              total_items: totals.items,
              order_total: totals.grandTotal,
              order_total_msrp: totals.grandMsrp,
              total_savings: totals.savings,
              payload: payload as any,
            })
            .select("id")
            .single();
          if (orderErr) {
            console.error("[OrderBar] order insert error", orderErr);
          } else if (orderRow) {
            const itemRows = spacesPayload.flatMap((s) =>
              s.items.map((i) => ({
                order_id: orderRow.id,
                space_name: s.spaceName,
                brand: i.brand,
                product_name: i.productName,
                quantity: i.quantity,
                unit_price: i.yourPrice,
                unit_msrp: i.msrp,
                line_total: i.lineTotal,
              }))
            );
            if (itemRows.length > 0) {
              const { error: itemsErr } = await supabase.from("order_items").insert(itemRows);
              if (itemsErr) console.error("[OrderBar] items insert error", itemsErr);
            }
          }
        }
      } catch (dbErr) {
        console.error("[OrderBar] db save failed", dbErr);
      }

      if (!url) {
        console.warn("[OrderBar] VITE_MAKE_WEBHOOK_URL not set. Payload:", payload);
      } else {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }
      setStep("done");
    } catch (e) {
      console.error("[OrderBar] submit error", e);
      setErrorMsg(e instanceof Error ? e.message : "Unknown error");
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
    <TooltipProvider>
      {/* Persistent bottom bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
        <div className="bg-primary text-primary-foreground border-t border-white/10 shadow-2xl pointer-events-auto">
          <div className="container mx-auto px-4 py-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
              {/* Left: identity */}
              <div className="flex items-center gap-3 min-w-0">
                <Sparkles className="h-5 w-5 text-accent flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-sm leading-tight">Your Order</p>
                  <p className="text-xs text-white/70 leading-tight">
                    {totals.items} item{totals.items === 1 ? "" : "s"} · across {totals.spacesWithItems || 1} space{(totals.spacesWithItems || 1) === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <div className="flex-1 md:max-w-sm" />


              {/* Right: actions */}
              <div className="flex items-center gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  onClick={() => setDrawerOpen(true)}
                >
                  View Order
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        size="sm"
                        disabled={!moqMet}
                        onClick={openSubmit}
                        className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold disabled:opacity-50"
                      >
                        Submit Order
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!moqMet && (
                    <TooltipContent>Add {fmtMoney(remaining)} more to submit</TooltipContent>
                  )}
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="bottom" className="h-[92vh] max-h-[92vh] flex flex-col p-0">
          <SheetHeader className="p-5 border-b">
            <SheetTitle className="text-2xl font-bold">Your Order</SheetTitle>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{totals.items} item{totals.items === 1 ? "" : "s"}</span>
              <span>·</span>
              <span>{state.spaces.length} space{state.spaces.length === 1 ? "" : "s"}</span>
              <span>·</span>
              <span className="font-semibold text-foreground">{fmtMoney(totals.grandTotal)} total</span>
            </div>
            <div className="pt-2">
              <MoqProgressLight value={totals.grandTotal} total={ORDER_MOQ} met={moqMet} />
            </div>
          </SheetHeader>

          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-3">
            {state.spaces.map((s) => <SpaceRow key={s.id} space={s} />)}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => { addSpace(); }}
            >
              <Plus className="h-4 w-4 mr-1.5" /> Add New Space
            </Button>
          </div>


          <div className="border-t bg-card p-5 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold">{fmtMoney(totals.grandTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total MSRP</span>
              <span className="line-through text-muted-foreground">{fmtMoney(totals.grandMsrp)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Savings</span>
              <span className="font-semibold text-accent">{fmtMoney(totals.savings)}</span>
            </div>
            <div className="flex items-center justify-between text-sm pb-2">
              <span className="text-muted-foreground">Total Items</span>
              <span className="font-semibold">{totals.items}</span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block">
                  <Button
                    size="lg"
                    disabled={!moqMet}
                    onClick={() => { setDrawerOpen(false); openSubmit(); }}
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold disabled:opacity-50"
                  >
                    Submit Order <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </span>
              </TooltipTrigger>
              {!moqMet && (
                <TooltipContent>Add {fmtMoney(remaining)} more to submit</TooltipContent>
              )}
            </Tooltip>
          </div>
        </SheetContent>
      </Sheet>

      {/* Submit flow dialog */}
      <Dialog open={submitOpen} onOpenChange={(o) => { setSubmitOpen(o); if (!o) setStep("form"); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {step === "form" && (
            <>
              <DialogHeader>
                <DialogTitle>Your Information</DialogTitle>
                <DialogDescription>
                  {totals.items} items · {fmtMoney(totals.grandTotal)} total
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 mt-1">
                <div className="space-y-1.5">
                  <Label>Company Name *</Label>
                  <Input value={buyer.companyName} onChange={(e) => setBuyer((p) => ({ ...p, companyName: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Name *</Label>
                  <Input value={buyer.contactName} onChange={(e) => setBuyer((p) => ({ ...p, contactName: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email *</Label>
                  <Input type="email" value={buyer.email} onChange={(e) => setBuyer((p) => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input type="tel" value={buyer.phone} onChange={(e) => setBuyer((p) => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Notes / Special Instructions</Label>
                  <Textarea rows={3} value={buyer.notes} onChange={(e) => setBuyer((p) => ({ ...p, notes: e.target.value }))} />
                </div>
                <Button
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
                  disabled={!validateBuyer()}
                  onClick={() => { setBuyerInfo(buyer); setStep("review"); }}
                >
                  Review Order <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </>
          )}

          {step === "review" && (
            <>
              <DialogHeader>
                <DialogTitle>Review Your Order</DialogTitle>
                <DialogDescription>Confirm details below before submitting.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">Buyer Info</span>
                    <button className="text-xs text-accent hover:underline" onClick={() => setStep("form")}>Edit</button>
                  </div>
                  <p>{buyer.companyName}</p>
                  <p className="text-muted-foreground">{buyer.contactName} · {buyer.email}{buyer.phone && ` · ${buyer.phone}`}</p>
                  {buyer.notes && <p className="text-muted-foreground italic mt-1">"{buyer.notes}"</p>}
                </div>
                {state.spaces.filter((s) => s.items.length > 0).map((s) => (
                  <ReviewSpaceAccordion key={s.id} space={s} subtotal={totals.spaceSubtotal(s.id)} />
                ))}

                <div className="rounded-lg bg-muted p-3 flex items-center justify-between">
                  <span className="font-semibold">Grand Total</span>
                  <span className="text-xl font-bold">{fmtMoney(totals.grandTotal)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => setStep("form")}>
                    <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
                  </Button>
                  <Button
                    className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
                    onClick={submitOrder}
                  >
                    Confirm &amp; Submit <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {step === "submitting" && (
            <div className="py-10 text-center">
              <DialogTitle className="text-lg mb-2">Submitting your order…</DialogTitle>
              <p className="text-sm text-muted-foreground">One moment please.</p>
            </div>
          )}

          {step === "done" && (
            <div className="text-center py-6">
              <div className="mx-auto h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center mb-4">
                <Check className="h-9 w-9 text-accent" />
              </div>
              <DialogTitle className="text-2xl mb-2">Order Submitted!</DialogTitle>
              <p className="text-muted-foreground text-sm mb-4">
                Thanks {buyer.contactName || "for your order"}. We'll review your order and be in touch within 1 business day.
              </p>
              <div className="rounded-lg border p-3 text-left text-xs space-y-1 mb-5">
                <div className="flex justify-between"><span>Items</span><span className="font-semibold">{totals.items}</span></div>
                <div className="flex justify-between"><span>Spaces</span><span className="font-semibold">{totals.spacesWithItems}</span></div>
                <div className="flex justify-between"><span>Order Total</span><span className="font-semibold">{fmtMoney(totals.grandTotal)}</span></div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" className="flex-1" onClick={startNewOrder}>Start a New Order</Button>
                <Button
                  className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
                  onClick={() => { setSubmitOpen(false); }}
                >
                  Browse More Products <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === "error" && (
            <div className="text-center py-6">
              <div className="mx-auto h-14 w-14 rounded-full bg-destructive/15 flex items-center justify-center mb-3">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <DialogTitle className="text-xl mb-2">Something went wrong</DialogTitle>
              <p className="text-muted-foreground text-sm mb-2">
                Please try again or contact us directly.
              </p>
              {errorMsg && <p className="text-xs text-muted-foreground mb-4 font-mono">{errorMsg}</p>}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" className="flex-1" asChild>
                  <a href="mailto:hello@comebackgoods.com">Contact Us</a>
                </Button>
                <Button
                  className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
                  onClick={submitOrder}
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
