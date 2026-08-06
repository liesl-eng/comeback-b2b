import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShieldAlert, CheckCircle2, XCircle, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";

type RunStatus = "pending_review" | "approved" | "rejected" | "applied" | "failed";

interface ImportRun {
  id: string;
  brand: string;
  status: RunStatus;
  started_at: string;
  finished_at: string | null;
  fetched_count: number;
  new_count: number;
  changed_count: number;
  removed_count: number;
  unchanged_count: number;
  skipped_missing_price: number;
  error_message: string | null;
  applied_at: string | null;
}

interface StagingRow {
  id: string;
  diff_type: "new" | "changed" | "removed" | "unchanged";
  name: string;
  brand: string;
  category: string | null;
  image_url: string | null;
  price: number | null;
  msrp: number | null;
  units_available: number;
  previous_price: number | null;
  previous_msrp: number | null;
  previous_units_available: number | null;
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return `$${Number(n).toFixed(2)}`;
}
function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  return new Date(s).toLocaleString();
}
function statusVariant(s: RunStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (s) {
    case "pending_review": return "default";
    case "applied": return "secondary";
    case "rejected": return "outline";
    case "failed": return "destructive";
    case "approved": return "default";
  }
}

const AdminImports = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const [runs, setRuns] = useState<ImportRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [staging, setStaging] = useState<Record<string, StagingRow[]>>({});
  const [stagingLoading, setStagingLoading] = useState<Record<string, boolean>>({});
  const [acting, setActing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function check() {
      if (!user) { setIsAdmin(false); setCheckingRole(false); return; }
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(data === true);
      setCheckingRole(false);
    }
    check();
  }, [user]);

  async function loadRuns() {
    setLoading(true);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from("product_import_runs")
      .select("*")
      .not("status", "in", "(applied,rejected)")
      .gte("started_at", startOfToday.toISOString())
      .order("started_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load runs", description: error.message, variant: "destructive" });
    } else {
      // Keep only the most recent run per brand (data is ordered desc by started_at)
      const seen = new Set<string>();
      const latestPerBrand = ((data ?? []) as ImportRun[]).filter((r) => {
        if (seen.has(r.brand)) return false;
        seen.add(r.brand);
        return true;
      });
      setRuns(latestPerBrand);
    }
    setLoading(false);
  }
  useEffect(() => { if (isAdmin) loadRuns(); }, [isAdmin]);

  async function toggleRun(runId: string) {
    const open = !expanded[runId];
    setExpanded((e) => ({ ...e, [runId]: open }));
    if (open && !staging[runId]) {
      setStagingLoading((s) => ({ ...s, [runId]: true }));
      const { data, error } = await supabase
        .from("product_import_staging")
        .select("id, diff_type, name, brand, category, image_url, price, msrp, units_available, previous_price, previous_msrp, previous_units_available")
        .eq("run_id", runId)
        .order("diff_type")
        .order("name");
      if (error) {
        toast({ title: "Failed to load diff", description: error.message, variant: "destructive" });
      } else {
        setStaging((s) => ({ ...s, [runId]: (data ?? []) as StagingRow[] }));
      }
      setStagingLoading((s) => ({ ...s, [runId]: false }));
    }
  }

  async function act(runId: string, action: "approve" | "reject") {
    setActing((a) => ({ ...a, [runId]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("apply-product-import", {
        body: { run_id: runId, action },
      });
      if (error) throw error;
      toast({
        title: action === "approve" ? "Applied to live" : "Rejected",
        description: action === "approve"
          ? `Inserted ${(data as { inserted?: number })?.inserted ?? 0} products.`
          : "Run discarded — live products untouched.",
      });
      await loadRuns();
    } catch (e) {
      toast({ title: "Action failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setActing((a) => ({ ...a, [runId]: false }));
    }
  }

  async function purgePendingRuns() {
    const { data: stale, error } = await supabase
      .from("product_import_runs")
      .select("id")
      .not("status", "in", "(applied,rejected)");
    if (error) throw error;
    const ids = (stale ?? []).map((r) => r.id);
    if (ids.length === 0) return;
    const { error: sErr } = await supabase.from("product_import_staging").delete().in("run_id", ids);
    if (sErr) throw sErr;
    const { error: rErr } = await supabase.from("product_import_runs").delete().in("id", ids);
    if (rErr) throw rErr;
  }

  async function triggerSync() {
    setLoading(true);
    try {
      // Clear any older un-reviewed runs so only the newest sync shows
      await purgePendingRuns();
      setRuns([]);
      setStaging({});
      setExpanded({});
      const { error } = await supabase.functions.invoke("sync-products-from-sheet", {});
      if (error) throw error;
      toast({ title: "Sync started", description: "Refreshing runs…" });
      await loadRuns();
    } catch (e) {
      toast({ title: "Sync failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }


  const pendingCount = useMemo(() => runs.filter((r) => r.status === "pending_review").length, [runs]);

  if (checkingRole) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="h-6 w-6" /> Access Denied
              </CardTitle>
              <CardDescription>Admin privileges are required.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/")} variant="outline" className="w-full">Return to Home</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Product import review</h1>
            <p className="text-sm text-muted-foreground">
              Daily sync stages each brand here. Approve to replace live products for that brand. Front-page restocking stays live until you approve.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && <Badge>{pendingCount} pending</Badge>}
            <Button variant="outline" size="sm" onClick={loadRuns} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={triggerSync} disabled={loading}>Run sync now</Button>
          </div>
        </div>

        {loading && runs.length === 0 ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : runs.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No import runs yet.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {runs.map((r) => {
              const isOpen = !!expanded[r.id];
              const canAct = r.status === "pending_review" || r.status === "failed";
              return (
                <Card key={r.id}>
                  <CardHeader className="py-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <button
                        onClick={() => toggleRun(r.id)}
                        className="flex items-start gap-3 text-left flex-1 min-w-0"
                      >
                        {isOpen ? <ChevronDown className="h-5 w-5 mt-0.5 shrink-0" /> : <ChevronRight className="h-5 w-5 mt-0.5 shrink-0" />}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-base">{r.brand}</CardTitle>
                            <Badge variant={statusVariant(r.status)}>{r.status.replace("_", " ")}</Badge>
                          </div>
                          <CardDescription className="mt-1">
                            {fmtDate(r.started_at)} · {r.fetched_count} fetched ·{" "}
                            <span className="text-foreground">+{r.new_count} new</span> ·{" "}
                            <span className="text-foreground">{r.changed_count} changed</span> ·{" "}
                            <span className="text-foreground">{r.removed_count} removed</span> ·{" "}
                            {r.unchanged_count} unchanged
                            {r.skipped_missing_price ? ` · ${r.skipped_missing_price} skipped (no price)` : ""}
                          </CardDescription>
                          {r.error_message && (
                            <p className="text-xs text-destructive mt-1 break-all">{r.error_message}</p>
                          )}
                        </div>
                      </button>
                      {canAct && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline" size="sm"
                            disabled={acting[r.id]}
                            onClick={() => act(r.id, "reject")}
                          >
                            <XCircle className="h-4 w-4 mr-1.5" /> Reject
                          </Button>
                          <Button
                            size="sm"
                            disabled={acting[r.id]}
                            onClick={() => act(r.id, "approve")}
                          >
                            {acting[r.id] ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                            Approve & apply
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  {isOpen && (
                    <CardContent className="pt-0">
                      {stagingLoading[r.id] ? (
                        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                      ) : (
                        <DiffTable rows={staging[r.id] ?? []} />
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

function DiffTable({ rows }: { rows: StagingRow[] }) {
  const groups: Record<StagingRow["diff_type"], StagingRow[]> = {
    new: [], changed: [], removed: [], unchanged: [],
  };
  for (const r of rows) groups[r.diff_type].push(r);
  const sections: Array<{ key: StagingRow["diff_type"]; label: string }> = [
    { key: "new", label: "New" },
    { key: "changed", label: "Changed" },
    { key: "removed", label: "Removed from sheet" },
    { key: "unchanged", label: "Unchanged" },
  ];
  return (
    <div className="space-y-6">
      {sections.map((s) => {
        const list = groups[s.key];
        if (!list.length) return null;
        return (
          <div key={s.key}>
            <h4 className="text-sm font-semibold mb-2">{s.label} <span className="text-muted-foreground font-normal">({list.length})</span></h4>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2 w-12"></th>
                    <th className="text-left px-3 py-2">Name</th>
                    <th className="text-right px-3 py-2 w-32">Price</th>
                    <th className="text-right px-3 py-2 w-32">MSRP</th>
                    <th className="text-right px-3 py-2 w-24">Units</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2">
                        {r.image_url ? (
                          <img src={r.image_url} alt="" className="h-10 w-10 object-cover rounded" loading="lazy" />
                        ) : <div className="h-10 w-10 bg-muted rounded" />}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.category ?? "—"}</div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {s.key === "changed" && !sameMoney(r.previous_price, r.price) ? (
                          <span><span className="text-muted-foreground line-through">{fmtMoney(r.previous_price)}</span> → {fmtMoney(r.price)}</span>
                        ) : s.key === "removed" ? fmtMoney(r.previous_price) : fmtMoney(r.price)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {s.key === "changed" && !sameMoney(r.previous_msrp, r.msrp) ? (
                          <span><span className="text-muted-foreground line-through">{fmtMoney(r.previous_msrp)}</span> → {fmtMoney(r.msrp)}</span>
                        ) : s.key === "removed" ? fmtMoney(r.previous_msrp) : fmtMoney(r.msrp)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {s.key === "changed" && (r.previous_units_available ?? 0) !== r.units_available ? (
                          <span><span className="text-muted-foreground line-through">{r.previous_units_available ?? 0}</span> → {r.units_available}</span>
                        ) : s.key === "removed" ? (r.previous_units_available ?? 0) : r.units_available}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function sameMoney(a: number | null | undefined, b: number | null | undefined): boolean {
  const na = a == null ? null : Number(a);
  const nb = b == null ? null : Number(b);
  if (na == null && nb == null) return true;
  if (na == null || nb == null) return false;
  return Math.abs(na - nb) < 0.005;
}

export default AdminImports;
