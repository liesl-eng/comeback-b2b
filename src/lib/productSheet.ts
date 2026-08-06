// Utilities for fetching & parsing the product Google Sheet (per-tab CSV).

export const PRODUCT_SHEET_ID = "1ItM29QVpYh85ESpMLWVJjg13RP-ACHkSPRcGtL21yl8";

// Tabs are addressed by gid so renaming a tab in the sheet doesn't break sync.
export const SHEET_GIDS: Record<string, string> = {
  "Modus Furniture": "2113198924",
  "Ferm Living": "1687042732",
  "Arteriors Home": "585735142",
  "Havenly": "919282075",
  "Hem": "494759443",
  "ART Home Furnishings": "1126365801",
  "Hews Home": "1322353551",
  "Bassett Mirror": "681217923",
  "SEI": "810215814",
};

export type BrandTab = keyof typeof SHEET_GIDS & string;

export const BRAND_TABS: BrandTab[] = Object.keys(SHEET_GIDS);


export interface SheetRow {
  name: string;
  brand: string;
  imageUrl: string | null;
  imageFilename: string | null;
  price: number | null;
  msrp: number | null;
  wholesale: number | null;
  discountPct: number | null;
  unitsAvailable: number;
  category: string | null;
  sourceLastUpdated: string | null;
}

// Robust CSV line parser supporting quoted fields with embedded commas/quotes.
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        row.push(cur);
        cur = "";
      } else if (c === "\n") {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = "";
      } else if (c === "\r") {
        // ignore
      } else {
        cur += c;
      }
    }
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

function cleanMoney(raw: string | undefined): number | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s || s.toUpperCase() === "N/A") return null;
  const cleaned = s.replace(/[$,]/g, "").replace(/each/i, "").trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function cleanPct(raw: string | undefined): number | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s || s.toUpperCase() === "N/A") return null;
  const n = parseFloat(s.replace(/[%\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function cleanInt(raw: string | undefined): number {
  if (!raw) return 0;
  const s = raw.trim();
  if (!s || s.toUpperCase() === "N/A") return 0;
  const n = parseInt(s.replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function cleanStr(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s || s.toUpperCase() === "N/A") return null;
  return s;
}

export async function fetchSheetTab(tab: BrandTab): Promise<SheetRow[]> {
  const url = `https://docs.google.com/spreadsheets/d/${PRODUCT_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
    tab,
  )}&_=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch sheet "${tab}" (HTTP ${res.status})`);
  const text = await res.text();
  const rows = parseCSV(text);
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (key: string) => header.findIndex((h) => h === key.toLowerCase());

  const iName = idx("Name");
  const iBrand = idx("Brand");
  const iImageUrl = idx("Image URL");
  const iImageFile = idx("Image Filename");
  const iPrice = idx("Price");
  const iMsrp = idx("MSRP");
  const iWholesale = idx("Wholesale");
  const iDiscount = idx("Discount %");
  const iUnits = idx("Units Available");
  const iCategory = idx("Category");
  const iUpdated = idx("Last Updated");

  const out: SheetRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every((c) => !c || !c.trim())) continue;
    const name = cleanStr(r[iName]);
    if (!name) continue;
    out.push({
      name,
      brand: ((cleanStr(r[iBrand]) ?? tab) === "Castlery" ? "Mopio" : (cleanStr(r[iBrand]) ?? tab)),
      imageUrl: (() => {
        const u = iImageUrl >= 0 ? cleanStr(r[iImageUrl]) : null;
        if (!u) return null;
        if (/defaultImage\.png/i.test(u)) return null;
        return u;
      })(),
      imageFilename: iImageFile >= 0 ? cleanStr(r[iImageFile]) : null,
      price: iPrice >= 0 ? cleanMoney(r[iPrice]) : null,
      msrp: iMsrp >= 0 ? cleanMoney(r[iMsrp]) : null,
      wholesale: iWholesale >= 0 ? cleanMoney(r[iWholesale]) : null,
      discountPct: iDiscount >= 0 ? cleanPct(r[iDiscount]) : null,
      unitsAvailable: iUnits >= 0 ? cleanInt(r[iUnits]) : 0,
      category: iCategory >= 0 ? cleanStr(r[iCategory]) : null,
      sourceLastUpdated: iUpdated >= 0 ? cleanStr(r[iUpdated]) : null,
    });
  }
  return out;
}

// Fetch all brand tabs in parallel and return a single merged product list.
export async function fetchAllProducts(): Promise<SheetRow[]> {
  const results = await Promise.allSettled(BRAND_TABS.map((t) => fetchSheetTab(t)));
  const out: SheetRow[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") out.push(...r.value);
  }
  return out;
}
