import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShieldAlert, Eye, RefreshCw } from "lucide-react";

interface OrderRow {
  id: string;
  user_id: string | null;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  total_items: number;
  order_total: number;
  order_total_msrp: number;
  total_savings: number;
  status: string;
  created_at: string;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  space_name: string | null;
  brand: string | null;
  product_name: string | null;
  quantity: number;
  unit_price: number;
  unit_msrp: number;
  line_total: number;
}

const fmtMoney = (n: number) =>
  `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (s: string) =>
  new Date(s).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

export default function AdminOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openOrder, setOpenOrder] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) { setChecking(false); setIsAdmin(false); return; }
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(data === true);
      setChecking(false);
    })();
  }, [user]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load orders", description: error.message, variant: "destructive" });
    } else {
      setOrders((data as OrderRow[]) || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { if (isAdmin) loadOrders(); }, [isAdmin, loadOrders]);

  const openDetails = async (o: OrderRow) => {
    setOpenOrder(o);
    setLoadingItems(true);
    const { data, error } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", o.id)
      .order("created_at", { ascending: true });
    if (error) {
      toast({ title: "Failed to load items", description: error.message, variant: "destructive" });
    } else {
      setItems((data as OrderItemRow[]) || []);
    }
    setLoadingItems(false);
  };

  const markStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Updated" });
      loadOrders();
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32"><Loader2 className="animate-spin" /></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto max-w-2xl px-6 py-16">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <ShieldAlert className="text-destructive" />
                <CardTitle>Admin access required</CardTitle>
              </div>
              <CardDescription>You don't have permission to view this page.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/")}>Go home</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Group items by space for the detail view
  const itemsBySpace = items.reduce<Record<string, OrderItemRow[]>>((acc, it) => {
    const k = it.space_name || "Space";
    (acc[k] ||= []).push(it);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-semibold">Orders</h1>
            <p className="text-muted-foreground text-sm">All buyer order submissions</p>
          </div>
          <Button variant="outline" onClick={loadOrders} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <Card>
          <CardContent className="overflow-x-auto p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin" /></div>
            ) : orders.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">No orders yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="whitespace-nowrap text-sm">{fmtDate(o.created_at)}</TableCell>
                      <TableCell className="font-medium">{o.company_name}</TableCell>
                      <TableCell>{o.contact_name}</TableCell>
                      <TableCell><a href={`mailto:${o.email}`} className="underline">{o.email}</a></TableCell>
                      <TableCell className="text-right">{o.total_items}</TableCell>
                      <TableCell className="text-right">{fmtMoney(o.order_total)}</TableCell>
                      <TableCell><Badge variant={o.status === "new" ? "default" : "secondary"}>{o.status}</Badge></TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => openDetails(o)}>
                          <Eye className="h-4 w-4 mr-1" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!openOrder} onOpenChange={(o) => { if (!o) { setOpenOrder(null); setItems([]); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {openOrder && (
            <>
              <DialogHeader>
                <DialogTitle>{openOrder.company_name}</DialogTitle>
                <DialogDescription>
                  {openOrder.contact_name} · {openOrder.email}{openOrder.phone ? ` · ${openOrder.phone}` : ""}
                  <br />Submitted {fmtDate(openOrder.created_at)}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-3 gap-4 py-2 text-sm">
                <div><div className="text-muted-foreground">Items</div><div className="font-semibold">{openOrder.total_items}</div></div>
                <div><div className="text-muted-foreground">Total</div><div className="font-semibold">{fmtMoney(openOrder.order_total)}</div></div>
                <div><div className="text-muted-foreground">MSRP Savings</div><div className="font-semibold">{fmtMoney(openOrder.total_savings)}</div></div>
              </div>

              {openOrder.notes && (
                <div className="bg-muted rounded p-3 text-sm">
                  <div className="font-medium mb-1">Notes</div>
                  <div className="whitespace-pre-wrap">{openOrder.notes}</div>
                </div>
              )}

              {loadingItems ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin" /></div>
              ) : (
                <div className="space-y-5 mt-2">
                  {Object.entries(itemsBySpace).map(([space, rows]) => (
                    <div key={space}>
                      <h4 className="font-semibold text-sm mb-2">{space}</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Brand</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Unit</TableHead>
                            <TableHead className="text-right">Line Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map((i) => (
                            <TableRow key={i.id}>
                              <TableCell>{i.brand}</TableCell>
                              <TableCell>{i.product_name}</TableCell>
                              <TableCell className="text-right">{i.quantity}</TableCell>
                              <TableCell className="text-right">{fmtMoney(i.unit_price)}</TableCell>
                              <TableCell className="text-right font-medium">{fmtMoney(i.line_total)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => markStatus(openOrder.id, "new")}>Mark New</Button>
                <Button variant="outline" onClick={() => markStatus(openOrder.id, "in_progress")}>In Progress</Button>
                <Button onClick={() => markStatus(openOrder.id, "fulfilled")}>Fulfilled</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
