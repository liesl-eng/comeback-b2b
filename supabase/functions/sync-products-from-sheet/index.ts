// Fetches each brand tab from the public Google Sheet and writes results into
// the import staging tables for admin review. Does NOT touch the live
// `products` table — that only happens when an admin approves the run via the
// `apply-product-import` function.
//
// Mercana is intentionally excluded because it requires uploaded images
// managed via the admin UI.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SHEET_ID = "1ItM29QVpYh85ESpMLWVJjg13RP-ACHkSPRcGtL21yl8";

// Tabs are addressed by gid so renaming a tab in the sheet doesn't break sync.
const SHEET_GIDS: Record<string, string> = {
  "Modus Furniture": "2113198924",
  "Ferm Living": "1687042732",
  "Arteriors Home": "585735142",
  "Havenly": "919282075",
  "Hem": "494759443",
  "ART Home Furnishings": "1126365801",
  "Hews Home": "1322353551",
  "Bassett Mirror": "681217923",
  "SEI": "810215814",
  "Mopio": "1731915112",
};

const DEFAULT_BRANDS = Object.keys(SHEET_GIDS);


// --- categorize (mirrors src/lib/productCategory.ts) ---
const FURNITURE = ["nightstand","bench","console","ottoman","stool","side table","end table","accent table","coffee table","dresser","cabinet","sideboard","armoire","wardrobe","credenza","buffet","bookcase","hutch","table","desk"];
const BEDS = ["bed","headboard"];
const SOFAS = ["sofa","loveseat","settee","sectional"];
const CHAIRS = ["chair","armchair","recliner"];
const LIGHTING = ["lamp","chandelier","sconce","pendant","light","lantern"];
function categorize(name: string): string {
  const n = (name || "").toLowerCase();
  if (n.includes("candle") || n.includes("clock") || n.includes("pillow")) return "Accessories";
  if (n.includes("mirror")) return "Mirrors";
  if (LIGHTING.some(k=>n.includes(k))) return "Lighting";
  if (SOFAS.some(k=>n.includes(k))) return "Sofas";
  if (CHAIRS.some(k=>n.includes(k))) return "Chairs";
  if (BEDS.some(k=>n.includes(k))) return "Beds";
  if (FURNITURE.some(k=>n.includes(k))) return "Furniture";
  return "Accessories";
}
function normalizeName(name: string): string {
  return (name || "").toLowerCase()
    .replace(/\s*\(#\d+\)\s*$/g, "")
    .replace(/[()[\]]/g, " ")
    .replace(/[-–—_/\\,.]/g, " ")
    .replace(/['"`’]/g, "")
    .replace(/\s+/g, " ").trim();
}

// --- CSV ---
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i+1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (c === "\r") {}
      else cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
function cleanMoney(s?: string): number | null {
  if (!s) return null;
  const t = s.trim();
  if (!t || t.toUpperCase() === "N/A") return null;
  const n = parseFloat(t.replace(/[$,]/g, "").replace(/each/i, "").trim());
  return Number.isFinite(n) ? n : null;
}
function cleanInt(s?: string): number {
  if (!s) return 0;
  const t = s.trim();
  if (!t || t.toUpperCase() === "N/A") return 0;
  const n = parseInt(t.replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}
function cleanStr(s?: string): string | null {
  if (!s) return null;
  const t = s.trim();
  if (!t || t.toUpperCase() === "N/A") return null;
  return t;
}

interface SheetRow {
  name: string; brand: string; image_url: string | null;
  image_filename: string | null; price: number | null; msrp: number | null;
  units_available: number; source_last_updated: string | null;
  category: string | null;
}

async function fetchTab(tab: string): Promise<SheetRow[]> {
  const gid = SHEET_GIDS[tab];
  const selector = gid ? `gid=${gid}` : `sheet=${encodeURIComponent(tab)}`;
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&${selector}&_=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch ${tab} failed: HTTP ${res.status}`);
  const text = await res.text();
  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const header = rows[0].map(h => h.trim().toLowerCase());
  const idx = (k: string) => header.findIndex(h => h === k.toLowerCase());
  const iName = idx("Name"), iBrand = idx("Brand"), iImg = idx("Image URL"),
        iFile = idx("Image Filename"), iPrice = idx("Price"), iMsrp = idx("MSRP"),
        iUnits = idx("Units Available"), iUpd = idx("Last Updated"),
        iCat = idx("Category");
  const out: SheetRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every(c => !c || !c.trim())) continue;
    const name = cleanStr(r[iName]);
    if (!name) continue;
    out.push({
      name,
      brand: cleanStr(r[iBrand]) ?? tab,
      image_url: iImg >= 0 ? cleanStr(r[iImg]) : null,
      image_filename: iFile >= 0 ? cleanStr(r[iFile]) : null,
      price: iPrice >= 0 ? cleanMoney(r[iPrice]) : null,
      msrp: iMsrp >= 0 ? cleanMoney(r[iMsrp]) : null,
      units_available: iUnits >= 0 ? cleanInt(r[iUnits]) : 0,
      source_last_updated: iUpd >= 0 ? cleanStr(r[iUpd]) : null,
      category: iCat >= 0 ? cleanStr(r[iCat]) : null,
    });
  }
  return out;
}

function moneyEq(a: number | null | undefined, b: number | null | undefined): boolean {
  const na = a == null ? null : Number(a);
  const nb = b == null ? null : Number(b);
  if (na == null && nb == null) return true;
  if (na == null || nb == null) return false;
  return Math.abs(na - nb) < 0.005;
}
function strEq(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? null) === (b ?? null);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Optional shared-secret protection. If CRON_SECRET is set, require it.
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret) {
    const provided = req.headers.get("x-cron-secret") ||
      (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (provided !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const url = new URL(req.url);
  const brandsParam = url.searchParams.get("brands");
  const brands = brandsParam ? brandsParam.split(",").map(s => s.trim()).filter(Boolean) : DEFAULT_BRANDS;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const summary: Record<string, unknown> = { startedAt: new Date().toISOString(), brands: {} };

  for (const brand of brands) {
    const brandReport: Record<string, unknown> = {};
    // Create run row up-front so failures are visible in the admin
    const { data: runRow, error: runErr } = await supabase
      .from("product_import_runs")
      .insert({ brand, status: "pending_review" })
      .select("id").single();
    if (runErr || !runRow) {
      brandReport.error = `run insert failed: ${runErr?.message ?? "unknown"}`;
      (summary.brands as Record<string, unknown>)[brand] = brandReport;
      continue;
    }
    const runId = runRow.id;
    brandReport.runId = runId;

    try {
      const rows = await fetchTab(brand);
      brandReport.fetched = rows.length;

      // Dedupe names within the brand so we don't insert duplicate staging rows
      const records: SheetRow[] = [];
      let skippedMissingPrice = 0;
      const nameCounts = new Map<string, number>();
      for (const r of rows) {
        if (r.price == null) { skippedMissingPrice++; continue; }
        const key = normalizeName(r.name);
        const count = (nameCounts.get(key) ?? 0) + 1;
        nameCounts.set(key, count);
        const displayName = count === 1 ? r.name : `${r.name} (#${count})`;
        records.push({ ...r, name: displayName });
      }

      // Load current live products for this brand to diff against
      const { data: liveRows, error: liveErr } = await supabase
        .from("products")
        .select("name, category, image_url, image_filename, price, msrp, units_available")
        .eq("brand", brand);
      if (liveErr) throw new Error(`load live failed: ${liveErr.message}`);
      const liveByKey = new Map<string, typeof liveRows[number]>();
      for (const l of liveRows ?? []) liveByKey.set(normalizeName(l.name), l);

      const stagingRows: Record<string, unknown>[] = [];
      const seenKeys = new Set<string>();
      let newCount = 0, changedCount = 0, unchangedCount = 0;

      for (const r of records) {
        const key = normalizeName(r.name);
        seenKeys.add(key);
        const category = r.category ?? categorize(r.name);
        const sourceTs = r.source_last_updated
          ? new Date(r.source_last_updated.replace(" ", "T")).toISOString() : null;
        const live = liveByKey.get(key);
        let diff_type: "new" | "changed" | "unchanged";
        if (!live) { diff_type = "new"; newCount++; }
        else if (
          moneyEq(live.price, r.price) &&
          moneyEq(live.msrp, r.msrp) &&
          (live.units_available ?? 0) === r.units_available &&
          strEq(live.image_url, r.image_url) &&
          strEq(live.image_filename, r.image_filename) &&
          strEq(live.category, category)
        ) { diff_type = "unchanged"; unchangedCount++; }
        else { diff_type = "changed"; changedCount++; }

        stagingRows.push({
          run_id: runId,
          diff_type,
          name: r.name,
          brand,
          category,
          image_url: r.image_url,
          image_filename: r.image_filename,
          price: r.price,
          msrp: r.msrp,
          units_available: r.units_available,
          source_last_updated: sourceTs,
          previous_price: live?.price ?? null,
          previous_msrp: live?.msrp ?? null,
          previous_units_available: live?.units_available ?? null,
          previous_image_url: live?.image_url ?? null,
        });
      }

      // Removed: live rows not present in fetched set
      let removedCount = 0;
      for (const l of liveRows ?? []) {
        const key = normalizeName(l.name);
        if (seenKeys.has(key)) continue;
        removedCount++;
        stagingRows.push({
          run_id: runId,
          diff_type: "removed",
          name: l.name,
          brand,
          category: l.category,
          image_url: l.image_url,
          image_filename: l.image_filename,
          price: l.price,
          msrp: l.msrp,
          units_available: 0,
          source_last_updated: null,
          previous_price: l.price,
          previous_msrp: l.msrp,
          previous_units_available: l.units_available,
          previous_image_url: l.image_url,
        });
      }

      // Insert staging in chunks
      const chunkSize = 200;
      for (let i = 0; i < stagingRows.length; i += chunkSize) {
        const chunk = stagingRows.slice(i, i + chunkSize);
        const { error } = await supabase.from("product_import_staging").insert(chunk);
        if (error) throw new Error(`staging insert failed: ${error.message}`);
      }

      await supabase.from("product_import_runs").update({
        status: "pending_review",
        finished_at: new Date().toISOString(),
        fetched_count: records.length,
        new_count: newCount,
        changed_count: changedCount,
        removed_count: removedCount,
        unchanged_count: unchangedCount,
        skipped_missing_price: skippedMissingPrice,
      }).eq("id", runId);

      brandReport.new = newCount;
      brandReport.changed = changedCount;
      brandReport.removed = removedCount;
      brandReport.unchanged = unchangedCount;
      brandReport.skippedMissingPrice = skippedMissingPrice;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      brandReport.error = msg;
      await supabase.from("product_import_runs").update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: msg,
      }).eq("id", runId);
    }
    (summary.brands as Record<string, unknown>)[brand] = brandReport;
  }

  summary.finishedAt = new Date().toISOString();
  return new Response(JSON.stringify(summary, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
