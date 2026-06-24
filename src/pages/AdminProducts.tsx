import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShieldAlert, Download, Upload, Eye, CheckCircle, XCircle } from "lucide-react";
import { BRAND_TABS, BrandTab, SheetRow, fetchSheetTab } from "@/lib/productSheet";
import { categorizeProduct } from "@/lib/productCategory";
import { findDuplicates, normalizeProductName } from "@/lib/duplicateDetection";


interface BrandState {
  loading: boolean;
  rows: SheetRow[] | null;
  error: string | null;
  // Mercana image upload state
  uploadedFiles: Map<string, string>; // lowercase filename -> public url
  uploading: boolean;
  uploadProgress: { done: number; total: number };
  // Import
  importing: boolean;
  importProgress: { done: number; total: number };
  importReport: { ok: number; skipped: { name: string; reason: string }[]; deleted?: number } | null;
  preview: boolean;
  replaceMode: boolean;
}

const emptyState: BrandState = {
  loading: false,
  rows: null,
  error: null,
  uploadedFiles: new Map(),
  uploading: false,
  uploadProgress: { done: 0, total: 0 },
  importing: false,
  importProgress: { done: 0, total: 0 },
  importReport: null,
  preview: false,
  replaceMode: false,
};

interface DupRow {
  id: string;
  name: string;
  brand: string;
  units_available: number;
  price: number | null;
  msrp: number | null;
  image_url: string | null;
}

interface ProductImportRecord {
  name: string;
  brand: BrandTab;
  category: string;
  image_url: string | null;
  image_filename: string | null;
  price: number;
  msrp: number | null;
  units_available: number;
  source_last_updated: string | null;
}

export default function AdminProducts() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const [activeTab, setActiveTab] = useState<BrandTab>(BRAND_TABS[0]);
  const [state, setState] = useState<Record<BrandTab, BrandState>>(() => {
    const init: Record<string, BrandState> = {};
    BRAND_TABS.forEach((b) => (init[b] = { ...emptyState, uploadedFiles: new Map() }));
    return init as Record<BrandTab, BrandState>;
  });

  // Duplicate scanner state
  const [dupScanning, setDupScanning] = useState(false);
  const [dupGroups, setDupGroups] = useState<{ key: string; items: DupRow[] }[] | null>(null);
  const [dupBusy, setDupBusy] = useState<string | null>(null);

  // Wipe catalog
  const [wiping, setWiping] = useState(false);
  const [wipeConfirm, setWipeConfirm] = useState("");


  useEffect(() => {
    async function checkAdminRole() {
      if (!user) {
        setCheckingRole(false);
        setIsAdmin(false);
        return;
      }
      try {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin',
        });
        if (error) {
          setIsAdmin(false);
        } else {
          setIsAdmin(data === true);
        }
      } catch {
        setIsAdmin(false);
      } finally {
        setCheckingRole(false);
      }
    }
    checkAdminRole();
  }, [user]);

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
                <ShieldAlert className="h-6 w-6" />
                Access Denied
              </CardTitle>
              <CardDescription>
                You do not have permission to access this page. Admin privileges are required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                Return to Home
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }




  async function wipeCatalog() {
    if (wipeConfirm !== "WIPE") {
      toast({ title: "Type WIPE to confirm", variant: "destructive" });
      return;
    }
    setWiping(true);
    const { error, count } = await supabase
      .from("products")
      .delete({ count: "exact" })
      .not("id", "is", null);
    setWiping(false);
    if (error) {
      toast({ title: "Wipe failed", description: error.message, variant: "destructive" });
      return;
    }
    setWipeConfirm("");
    toast({ title: `Deleted ${count ?? 0} products`, description: "Catalog is now empty." });
  }


  async function scanDuplicates() {
    setDupScanning(true);
    setDupGroups(null);
    const all: DupRow[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,brand,units_available,price,msrp,image_url")
        .range(from, from + pageSize - 1);
      if (error) {
        toast({ title: "Scan failed", description: error.message, variant: "destructive" });
        setDupScanning(false);
        return;
      }
      if (!data || data.length === 0) break;
      all.push(...(data as DupRow[]));
      if (data.length < pageSize) break;
      from += pageSize;
    }
    const groups = findDuplicates(all);
    setDupGroups(groups);
    setDupScanning(false);
    toast({
      title: `Scanned ${all.length} products`,
      description: `${groups.length} duplicate group(s) found`,
    });
  }

  async function mergeGroup(group: { key: string; items: DupRow[] }) {
    setDupBusy(group.key);
    // Pick keeper: prefer one with image, then highest units, then lowest id
    const sorted = [...group.items].sort((a, b) => {
      if (!!b.image_url !== !!a.image_url) return b.image_url ? 1 : -1;
      return b.units_available - a.units_available;
    });
    const keeper = sorted[0];
    const others = sorted.slice(1);
    const totalUnits = group.items.reduce((s, r) => s + (r.units_available ?? 0), 0);
    const bestImage = group.items.find((r) => r.image_url)?.image_url ?? null;
    const minPrice = group.items
      .map((r) => r.price)
      .filter((p): p is number => p != null)
      .reduce<number | null>((m, p) => (m == null || p < m ? p : m), null);
    const maxMsrp = group.items
      .map((r) => r.msrp)
      .filter((p): p is number => p != null)
      .reduce<number | null>((m, p) => (m == null || p > m ? p : m), null);

    const { error: updErr } = await supabase
      .from("products")
      .update({
        units_available: totalUnits,
        image_url: keeper.image_url ?? bestImage,
        price: minPrice ?? keeper.price,
        msrp: maxMsrp ?? keeper.msrp,
      })
      .eq("id", keeper.id);
    if (updErr) {
      toast({ title: "Merge failed", description: updErr.message, variant: "destructive" });
      setDupBusy(null);
      return;
    }
    const { error: delErr } = await supabase
      .from("products")
      .delete()
      .in("id", others.map((o) => o.id));
    if (delErr) {
      toast({ title: "Cleanup failed", description: delErr.message, variant: "destructive" });
      setDupBusy(null);
      return;
    }
    setDupGroups((prev) => (prev ? prev.filter((g) => g.key !== group.key) : prev));
    setDupBusy(null);
    toast({ title: `Merged ${others.length + 1} → 1`, description: keeper.name });
  }

  async function deleteDuplicate(group: { key: string; items: DupRow[] }, id: string) {
    setDupBusy(group.key + id);
    const { error } = await supabase.from("products").delete().eq("id", id);
    setDupBusy(null);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setDupGroups((prev) =>
      prev
        ? prev
            .map((g) =>
              g.key === group.key ? { ...g, items: g.items.filter((i) => i.id !== id) } : g,
            )
            .filter((g) => g.items.length > 1)
        : prev,
    );
  }

  function patch(brand: BrandTab, p: Partial<BrandState>) {
    setState((prev) => ({ ...prev, [brand]: { ...prev[brand], ...p } }));
  }

  async function handleFetch(brand: BrandTab) {
    patch(brand, { loading: true, error: null, importReport: null });
    try {
      const rows = await fetchSheetTab(brand);
      patch(brand, { loading: false, rows });
      toast({ title: `Loaded ${rows.length} rows from "${brand}"` });
    } catch (e: unknown) {
      patch(brand, { loading: false, error: e instanceof Error ? e.message : "Unable to load sheet" });
    }
  }

  async function handleUpload(brand: BrandTab, files: FileList) {
    const arr = Array.from(files);
    patch(brand, {
      uploading: true,
      uploadProgress: { done: 0, total: arr.length },
    });
    const uploaded = new Map(state[brand].uploadedFiles);
    let done = 0;
    for (const file of arr) {
      const path = `${brand.toLowerCase().replace(/\s+/g, "-")}/${file.name}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
      if (!error) {
        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        uploaded.set(file.name.toLowerCase(), data.publicUrl);
      }
      done++;
      patch(brand, { uploadProgress: { done, total: arr.length }, uploadedFiles: new Map(uploaded) });
    }
    patch(brand, { uploading: false });
    toast({ title: `Uploaded ${uploaded.size} images for ${brand}` });
  }

  async function handleImport(brand: BrandTab) {
    const s = state[brand];
    if (!s.rows) return;
    const isMercana = brand === "Mercana";
    const records: ProductImportRecord[] = [];
    const skipped: { name: string; reason: string }[] = [];

    // For Mercana, also include images already in the storage bucket from
    // previous upload/rehost sessions, so re-importing doesn't require re-uploading.
    const bucketFiles = new Map<string, string>();
    if (isMercana) {
      const folders = ["mercana", "mercana-rehost"];
      const pageSize = 1000;
      for (const folder of folders) {
        let offset = 0;
        while (true) {
          const { data, error } = await supabase.storage
            .from("product-images")
            .list(folder, { limit: pageSize, offset });
          if (error || !data || data.length === 0) break;
          for (const obj of data) {
            if (!obj.name) continue;
            const { data: pub } = supabase.storage
              .from("product-images")
              .getPublicUrl(`${folder}/${obj.name}`);
            bucketFiles.set(obj.name.toLowerCase(), pub.publicUrl);
          }
          if (data.length < pageSize) break;
          offset += pageSize;
        }
      }
    }

    for (const r of s.rows) {
      if (r.price == null) {
        skipped.push({ name: r.name, reason: "missing price" });
        continue;
      }
      let imageUrl: string | null = null;
      if (isMercana) {
        const sourceFilename = r.imageUrl?.split("/").pop()?.split("?")[0] ?? null;
        const key = (r.imageFilename ?? sourceFilename)?.toLowerCase();
        imageUrl = key ? s.uploadedFiles.get(key) ?? bucketFiles.get(key) ?? r.imageUrl : r.imageUrl;
      } else {
        imageUrl = r.imageUrl;
      }

      records.push({
        name: r.name,
        brand,
        category: categorizeProduct(r.name),
        image_url: imageUrl,
        image_filename: r.imageFilename,
        price: r.price,
        msrp: r.msrp,
        units_available: r.unitsAvailable,
        source_last_updated: r.sourceLastUpdated
          ? new Date(r.sourceLastUpdated.replace(" ", "T")).toISOString()
          : null,
      });
    }

    // Preserve duplicate product rows in a sheet. The database requires brand + name
    // to be unique for safe re-imports, so later same-name rows get a stable suffix
    // instead of being merged/skipped.
    const nameCounts = new Map<string, number>();
    const importRecords = records.map((rec) => {
      const key = `${rec.brand}|${normalizeProductName(rec.name)}`;
      const count = (nameCounts.get(key) ?? 0) + 1;
      nameCounts.set(key, count);
      return count === 1 ? rec : { ...rec, name: `${rec.name} (#${count})` };
    });

    patch(brand, {
      importing: true,
      importProgress: { done: 0, total: importRecords.length },
      importReport: null,
    });

    let deletedCount = 0;
    if (s.replaceMode) {
      const { error: delErr, count } = await supabase
        .from("products")
        .delete({ count: "exact" })
        .eq("brand", brand);
      if (delErr) {
        patch(brand, { importing: false });
        toast({ title: "Replace failed", description: delErr.message, variant: "destructive" });
        return;
      }
      deletedCount = count ?? 0;
    }

    const chunkSize = 100;
    let inserted = 0;
    for (let i = 0; i < importRecords.length; i += chunkSize) {
      const chunk = importRecords.slice(i, i + chunkSize);
      const { error } = await supabase
        .from("products")
        .upsert(chunk, { onConflict: "brand,name" });
      if (error) {
        chunk.forEach((c) => skipped.push({ name: c.name, reason: error.message }));
      } else {
        inserted += chunk.length;
      }
      patch(brand, { importProgress: { done: i + chunk.length, total: importRecords.length } });
    }

    patch(brand, {
      importing: false,
      importReport: { ok: inserted, skipped, deleted: deletedCount },
    });
    toast({
      title: `Imported ${inserted} ${brand} products`,
      description: s.replaceMode
        ? `${deletedCount} old rows deleted · ${skipped.length} skipped`
        : `${skipped.length} skipped`,
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold">Product Import</h1>
              <p className="text-muted-foreground">
                Import products from the Google Sheet. Mercana can use sheet image URLs or uploaded images.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate("/admin/imports")}>
              Review scheduled imports
            </Button>
          </div>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Wipe Catalog</CardTitle>
              <CardDescription>
                Permanently deletes <strong>all</strong> products from the catalog. Pallets are
                not affected. Type <code className="font-mono">WIPE</code> to confirm.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <Input
                placeholder="Type WIPE to confirm"
                value={wipeConfirm}
                onChange={(e) => setWipeConfirm(e.target.value)}
                className="max-w-xs"
                disabled={wiping}
              />
              <Button
                variant="destructive"
                onClick={wipeCatalog}
                disabled={wiping || wipeConfirm !== "WIPE"}
              >
                {wiping ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Delete all products
              </Button>
            </CardContent>
          </Card>

          <Card>

            <CardHeader>
              <CardTitle>Duplicate Scanner</CardTitle>
              <CardDescription>
                Finds products with the same brand + normalized name (ignores case, punctuation,
                and "(#N)" suffixes). Merge combines units, keeps the best image, lowest price,
                highest MSRP.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={scanDuplicates} disabled={dupScanning}>
                {dupScanning ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ShieldAlert className="h-4 w-4 mr-2" />
                )}
                Scan for duplicates
              </Button>
              {dupGroups && dupGroups.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  <CheckCircle className="inline h-4 w-4 text-primary mr-1" />
                  No duplicates found.
                </p>
              )}
              {dupGroups && dupGroups.length > 0 && (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {dupGroups.map((g) => (
                    <div key={g.key} className="border rounded p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">
                          {g.items[0].brand} — {normalizeProductName(g.items[0].name)}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => mergeGroup(g)}
                          disabled={dupBusy === g.key}
                        >
                          {dupBusy === g.key ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : null}
                          Merge ({g.items.length})
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {g.items.map((it) => (
                          <div
                            key={it.id}
                            className="flex items-center justify-between gap-2 text-xs border-t pt-1"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="truncate">{it.name}</div>
                              <div className="text-muted-foreground">
                                {it.units_available} units · ${it.price ?? "—"} ·{" "}
                                {it.image_url ? "image ✓" : "no image"}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteDuplicate(g, it.id)}
                              disabled={dupBusy === g.key + it.id}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BrandTab)}>
            <TabsList className="grid grid-cols-4 w-full">
              {BRAND_TABS.map((b) => (
                <TabsTrigger key={b} value={b}>
                  {b}
                </TabsTrigger>
              ))}
            </TabsList>

            {BRAND_TABS.map((brand) => {
              const s = state[brand];
              const isMercana = brand === "Mercana";
              const matched = isMercana && s.rows
                ? s.rows.filter((r) => r.imageFilename && s.uploadedFiles.has(r.imageFilename.toLowerCase())).length
                : 0;
              return (
                <TabsContent key={brand} value={brand} className="space-y-4 mt-6">
                  {/* Step 1: Fetch */}
                  <Card>
                    <CardHeader>
                      <CardTitle>1. Load from Google Sheet</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button onClick={() => handleFetch(brand)} disabled={s.loading}>
                        {s.loading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Fetch "{brand}" tab
                      </Button>
                      {s.error && <p className="text-destructive text-sm">{s.error}</p>}
                      {s.rows && (
                        <p className="text-sm text-muted-foreground">
                          Loaded <strong>{s.rows.length}</strong> rows.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Step 2: Mercana image upload */}
                  {isMercana && (
                    <Card>
                      <CardHeader>
                        <CardTitle>2. Upload Mercana images</CardTitle>
                        <CardDescription>
                          Optional when the sheet includes image URLs. Upload only if you need to replace missing or custom images.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Input
                          type="file"
                          multiple
                          accept="image/*"
                          disabled={s.uploading}
                          onChange={(e) => e.target.files && handleUpload(brand, e.target.files)}
                        />
                        {s.uploading && (
                          <div>
                            <Progress
                              value={(s.uploadProgress.done / Math.max(1, s.uploadProgress.total)) * 100}
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                              Uploading {s.uploadProgress.done}/{s.uploadProgress.total}…
                            </p>
                          </div>
                        )}
                        {s.uploadedFiles.size > 0 && (
                          <p className="text-sm">
                            <CheckCircle className="inline h-4 w-4 text-primary mr-1" />
                            {s.uploadedFiles.size} files uploaded
                            {s.rows && (
                              <>
                                {" "}
                                — <strong>{matched}</strong> of <strong>{s.rows.length}</strong> sheet rows
                                matched
                              </>
                            )}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Step 3: Preview */}
                  {s.rows && (
                    <Card>
                      <CardHeader>
                        <CardTitle>{isMercana ? "3" : "2"}. Preview</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Button variant="outline" onClick={() => patch(brand, { preview: !s.preview })}>
                          <Eye className="h-4 w-4 mr-2" />
                          {s.preview ? "Hide" : "Show"} first 5
                        </Button>
                        {s.preview && (
                          <div className="mt-3 space-y-2 text-sm">
                            {s.rows.slice(0, 5).map((r, i) => (
                              <div key={i} className="border rounded p-2">
                                <div className="font-medium">{r.name}</div>
                                <div className="text-muted-foreground">
                                  Price ${r.price ?? "—"} · MSRP ${r.msrp ?? "—"} · Units {r.unitsAvailable}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {isMercana ? r.imageFilename : r.imageUrl}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Step 4: Import */}
                  {s.rows && (
                    <Card>
                      <CardHeader>
                        <CardTitle>{isMercana ? "4" : "3"}. Import</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <label className="flex items-start gap-2 text-sm border rounded p-3 bg-muted/30 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={s.replaceMode}
                            onChange={(e) => patch(brand, { replaceMode: e.target.checked })}
                            disabled={s.importing}
                            className="mt-0.5"
                          />
                          <span>
                            <strong>Replace mode</strong> — delete all existing <em>{brand}</em> products
                            first, then import. Use this when the sheet is the source of truth and removed
                            rows should disappear from the catalog. Leave unchecked to upsert (update existing,
                            add new, keep removed rows).
                          </span>
                        </label>
                        <Button
                          onClick={() => handleImport(brand)}
                          disabled={s.importing}
                          variant={s.replaceMode ? "destructive" : "default"}
                        >
                          {s.importing ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          {s.replaceMode ? "Replace" : "Import"} all {s.rows.length} {brand} products
                        </Button>
                        {s.importing && (
                          <div>
                            <Progress
                              value={(s.importProgress.done / Math.max(1, s.importProgress.total)) * 100}
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                              Importing {s.importProgress.done}/{s.importProgress.total}…
                            </p>
                          </div>
                        )}
                        {s.importReport && (
                          <div className="text-sm space-y-2">
                            {s.importReport.deleted ? (
                              <p className="text-muted-foreground">
                                Deleted <strong>{s.importReport.deleted}</strong> existing {brand} rows
                              </p>
                            ) : null}
                            <p>
                              <CheckCircle className="inline h-4 w-4 text-primary mr-1" />
                              <strong>{s.importReport.ok}</strong> imported successfully
                            </p>
                            {s.importReport.skipped.length > 0 && (
                              <details className="border rounded p-2">
                                <summary className="cursor-pointer">
                                  <XCircle className="inline h-4 w-4 text-destructive mr-1" />
                                  {s.importReport.skipped.length} skipped
                                </summary>
                                <div className="mt-2 max-h-64 overflow-y-auto space-y-1">
                                  {s.importReport.skipped.map((sk, i) => (
                                    <div key={i} className="text-xs">
                                      <span className="font-medium">{sk.name}</span> — {sk.reason}
                                    </div>
                                  ))}
                                </div>
                              </details>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      </main>
    </div>
  );
}
