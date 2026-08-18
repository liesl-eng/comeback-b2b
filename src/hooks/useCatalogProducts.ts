import { useEffect, useState } from "react";
import { fetchAllProducts, SheetRow } from "@/lib/productSheet";
import meridianBlack from "@/assets/meridian-black.webp.asset.json";
import meridianBrushedSteel from "@/assets/meridian-brushed-steel.webp.asset.json";
import raidenConsole from "@/assets/raiden-console-bassett.jpg.asset.json";
import odeliaCounterStool from "@/assets/odelia-counter-stool.webp.asset.json";
import odeliaCounterStoolPearlWhite from "@/assets/odelia-counter-stool-pearl-white.webp.asset.json";
import caracoleSavoy from "@/assets/Caracole_Savoy.webp.asset.json";
import architraveQueenPanelBed from "@/assets/ART_Home_Architrave_Queen_Panel_Bed.webp.asset.json";
import grantQueenPillowBackBed from "@/assets/ART_Home_Grant_Queen_Pillow_Back_Uph_Bed-Alum.webp.asset.json";
import coveCalKingBed from "@/assets/ART_Home_Cove_Cal_King_Upholstered_Beds.webp.asset.json";
import eaveUphQueenBed from "@/assets/Eave_Uph_Queen_Bed.webp.asset.json";
import eavePanelBed from "@/assets/Eave_Panel_Bed.webp.asset.json";
import cotiereQueenUphPanelBed from "@/assets/Cotiere_Queen_Upholstered_Panel_Bed.webp.asset.json";

// Manual image overrides for specific products (matched by name substring).
const IMAGE_OVERRIDES: { match: RegExp; url: string }[] = [
  { match: /meridian.*brushed\s*steel/i, url: meridianBrushedSteel.url },
  { match: /meridian.*black/i, url: meridianBlack.url },
  { match: /raiden.*console/i, url: raidenConsole.url },
  // Mopio products — Google Sheet is missing image URLs.
  { match: /^blake chest coffee table,\s*black oak/i, url: "https://mopio.com/cdn/shop/files/01b_Main_Image_PNG__dotcom.png" },
  { match: /^blake chest coffee table,\s*white oak/i, url: "https://mopio.com/cdn/shop/files/01b_Main_Image_PNG__dotcom_d65099d8-d8b9-4c45-aec8-a3d9fdbc3818.png" },
  { match: /^hannah floating nightstand/i, url: "https://mopio.com/cdn/shop/files/01-Main_Image_HannahFloatingNightstand_88041e74-8477-42a1-9c90-e94d20c76e00.png" },
  { match: /^logan 45.*console table/i, url: "https://mopio.com/cdn/shop/files/08_Lifestyle_Image_1c2e46d8-fe12-47ea-a304-35b947e9febc.jpg" },
  { match: /^logan 72.*extendable dining table/i, url: "https://mopio.com/cdn/shop/files/01a_Main_Image_59_Inch_PNG_ee26ba7c-4f6a-4190-a40e-814beb53d11d.png" },
  { match: /^logan rectangle solid wood coffee table/i, url: "https://mopio.com/cdn/shop/files/01a_MainImage_Rectangle_PNG.png" },
  { match: /^logan round solid wood coffee table/i, url: "https://mopio.com/cdn/shop/files/01a_MainImage_Round_PNG.png" },
  { match: /^odelia bistro dining table/i, url: "https://mopio.com/cdn/shop/files/01b-MainImage_PNG.jpg" },
  { match: /^odelia counter stool.*pearl white/i, url: odeliaCounterStoolPearlWhite.url },
  { match: /^odelia counter stool/i, url: odeliaCounterStool.url },
  { match: /^odelia dining chair set of 2,\s*olive green velvet/i, url: "https://mopio.com/cdn/shop/files/01.2a-MainImage_x2PNG_OliveGreen.jpg" },
  { match: /^odelia dining chair set of 2,\s*pearl white boucle/i, url: "https://mopio.com/cdn/shop/files/01.2c_-_Main_Image_x2_PNG_PWB.jpg" },
  { match: /^quin 59.*tv stand,\s*black/i, url: "https://mopio.com/cdn/shop/files/Quinn-TV-Stand-Black-Angle.png" },
  { match: /^quin 59.*tv stand,\s*walnut/i, url: "https://mopio.com/cdn/shop/files/Quinn-TV-Stand-Walnut-Angle.png" },
  { match: /^quin coffee table,\s*black/i, url: "https://mopio.com/cdn/shop/files/Quinn-Coffee-Table-Black-Angle_1.png" },
  { match: /^quin coffee table,\s*light oak/i, url: "https://mopio.com/cdn/shop/files/01a-MainImage_de8d744b-0a0e-4acd-a5b6-64f8e5e0ddee.jpg" },
  { match: /^quin side table,\s*black/i, url: "https://mopio.com/cdn/shop/files/01a-MainImage_7fbd583b-fb43-4eac-8dc4-a16c2097f296.jpg?v=1716199941&width=320" },
  { match: /^quin side table,\s*light oak/i, url: "https://mopio.com/cdn/shop/files/01a-MainImage_3d34e815-9381-41e3-a0e4-011620f47e57.jpg" },
  { match: /^sterling table top/i, url: "https://mopio.com/cdn/shop/files/Oak_PNG.jpg" },
  { match: /caracole.*savoy.*sofa/i, url: caracoleSavoy.url },
  // ART Home / Eave / Cotiere beds — supplied photos.
  { match: /architrave.*queen.*panel bed/i, url: architraveQueenPanelBed.url },
  { match: /grant.*queen.*pillow\s*back/i, url: grantQueenPillowBackBed.url },
  { match: /cove.*cal(ifornia)?[\s-]*king.*(upholstered|uph)/i, url: coveCalKingBed.url },
  { match: /eave.*(uph|upholstered).*queen.*bed/i, url: eaveUphQueenBed.url },
  { match: /eave.*panel bed/i, url: eavePanelBed.url },
  { match: /cotiere.*queen.*(upholstered|uph).*panel bed/i, url: cotiereQueenUphPanelBed.url },
];

// Only these categories are surfaced anywhere on the site.
const ALLOWED_CATEGORIES = new Set(["lighting", "mirrors", "tables", "beds", "dressers", "storage", "seating"]);

// Category overrides — fix miscategorized products from the sheet.
const CATEGORY_OVERRIDES: { match: RegExp; category: string }[] = [
  // Mopio products that are tables but got auto-classified as Lighting.
  { match: /^quin (coffee|side) table/i, category: "Tables" },
];

// Permanently hidden products (matched by name substring, case-insensitive).
const HIDDEN_PRODUCTS: RegExp[] = [
  /pomme\s+(light|dark)\s+cork/i,
];

// Brands hidden from the storefront (still synced/imported on the admin side).
const HIDDEN_BRANDS = new Set(["sei"]);

// Shorter display labels for brand names that are too long to fit on one line.
const BRAND_DISPLAY_LABELS: Record<string, string> = {
  "ART Home Furnishings": "ART Home",
  "Modus Furniture": "Modus",
};

function applyOverrides(rows: SheetRow[]): SheetRow[] {
  return rows
    .map((r) => {
      const imgOv = IMAGE_OVERRIDES.find((o) => o.match.test(r.name));
      const catOv = CATEGORY_OVERRIDES.find((o) => o.match.test(r.name));
      const labelOv = BRAND_DISPLAY_LABELS[r.brand ?? ""];
      let out = r;
      if (imgOv) out = { ...out, imageUrl: imgOv.url };
      if (catOv) out = { ...out, category: catOv.category };
      if (labelOv) out = { ...out, brand: labelOv };
      return out;
    })
    // Only Lighting, Mirrors, and Tables are shown across the site.
    .filter((r) => ALLOWED_CATEGORIES.has((r.category ?? "").trim().toLowerCase()))
    // Exclude permanently hidden products.
    .filter((r) => !HIDDEN_PRODUCTS.some((re) => re.test(r.name)))
    // Exclude hidden brands from the front end.
    .filter((r) => !HIDDEN_BRANDS.has((r.brand ?? "").trim().toLowerCase()));

}


type State = {
  products: SheetRow[];
  loading: boolean;
  error: string | null;
};

// Module-level cache so all category pages share one fetch per session.
let cache: SheetRow[] | null = null;
let inflight: Promise<SheetRow[]> | null = null;

export function useCatalogProducts(): State {
  const [state, setState] = useState<State>({
    products: cache ?? [],
    loading: !cache,
    error: null,
  });

  useEffect(() => {
    if (cache) return;
    let cancelled = false;
    if (!inflight) inflight = fetchAllProducts().then(applyOverrides);
    inflight
      .then((rows) => {
        cache = rows;
        if (!cancelled) setState({ products: rows, loading: false, error: null });
      })
      .catch((e) => {
        if (!cancelled)
          setState({
            products: [],
            loading: false,
            error: e instanceof Error ? e.message : "Failed to load products",
          });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
