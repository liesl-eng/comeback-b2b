import { useEffect, useState } from "react";
import { fetchAllProducts, SheetRow } from "@/lib/productSheet";
import meridianBlack from "@/assets/meridian-black.webp.asset.json";
import meridianBrushedSteel from "@/assets/meridian-brushed-steel.webp.asset.json";

// Manual image overrides for specific products (matched by name substring).
const IMAGE_OVERRIDES: { match: RegExp; url: string }[] = [
  { match: /meridian.*brushed\s*steel/i, url: meridianBrushedSteel.url },
  { match: /meridian.*black/i, url: meridianBlack.url },
  // Mopio products — Google Sheet is missing image URLs.
  { match: /^blake chest coffee table,\s*black oak/i, url: "https://mopio.com/cdn/shop/files/01b_Main_Image_PNG__dotcom.png" },
  { match: /^blake chest coffee table,\s*white oak/i, url: "https://mopio.com/cdn/shop/files/01b_Main_Image_PNG__dotcom_d65099d8-d8b9-4c45-aec8-a3d9fdbc3818.png" },
  { match: /^hannah floating nightstand/i, url: "https://mopio.com/cdn/shop/files/01-Main_Image_HannahFloatingNightstand_88041e74-8477-42a1-9c90-e94d20c76e00.png" },
  { match: /^logan 45.*console table/i, url: "https://mopio.com/cdn/shop/files/08_Lifestyle_Image_1c2e46d8-fe12-47ea-a304-35b947e9febc.jpg" },
  { match: /^logan 72.*extendable dining table/i, url: "https://mopio.com/cdn/shop/files/01a_Main_Image_59_Inch_PNG_ee26ba7c-4f6a-4190-a40e-814beb53d11d.png" },
  { match: /^logan rectangle solid wood coffee table/i, url: "https://mopio.com/cdn/shop/files/01a_MainImage_Rectangle_PNG.png" },
  { match: /^logan round solid wood coffee table/i, url: "https://mopio.com/cdn/shop/files/01a_MainImage_Round_PNG.png" },
  { match: /^odelia bistro dining table/i, url: "https://mopio.com/cdn/shop/files/01b-MainImage_PNG.jpg" },
  { match: /^odelia counter stool set of 2,\s*outdoor beige/i, url: "https://mopio.com/cdn/shop/files/01.2b-MainImage_PNG_Beige_fbfeda1f-dbab-4560-812a-ff7d07795463.jpg" },
  { match: /^odelia counter stool set of 2,\s*pearl white boucle/i, url: "https://mopio.com/cdn/shop/files/01.2c-MainImage_PNG_PWB.jpg" },
  { match: /^odelia dining chair set of 2,\s*olive green velvet/i, url: "https://mopio.com/cdn/shop/files/01.2a-MainImage_x2PNG_OliveGreen.jpg" },
  { match: /^odelia dining chair set of 2,\s*pearl white boucle/i, url: "https://mopio.com/cdn/shop/files/01.2c_-_Main_Image_x2_PNG_PWB.jpg" },
  { match: /^quin 59.*tv stand,\s*black/i, url: "https://mopio.com/cdn/shop/files/Quinn-TV-Stand-Black-Angle.png" },
  { match: /^quin 59.*tv stand,\s*walnut/i, url: "https://mopio.com/cdn/shop/files/Quinn-TV-Stand-Walnut-Angle.png" },
  { match: /^quin coffee table,\s*black/i, url: "https://mopio.com/cdn/shop/files/Quinn-Coffee-Table-Black-Angle_1.png" },
  { match: /^quin coffee table,\s*light oak/i, url: "https://mopio.com/cdn/shop/files/01a-MainImage_de8d744b-0a0e-4acd-a5b6-64f8e5e0ddee.jpg" },
  { match: /^quin side table,\s*black/i, url: "https://mopio.com/cdn/shop/files/01a-MainImage_7fbd583b-fb43-4eac-8dc4-a16c2097f296.jpg?v=1716199941&width=320" },
  { match: /^quin side table,\s*light oak/i, url: "https://mopio.com/cdn/shop/files/01a-MainImage_3d34e815-9381-41e3-a0e4-011620f47e57.jpg" },
  { match: /^sterling table top/i, url: "https://mopio.com/cdn/shop/files/Oak_PNG.jpg" },
];

// Category overrides — fix miscategorized products from the sheet.
const CATEGORY_OVERRIDES: { match: RegExp; category: string }[] = [
  // Mopio products that are tables but got auto-classified as Lighting.
  { match: /^quin (coffee|side) table/i, category: "Tables" },
];

function applyOverrides(rows: SheetRow[]): SheetRow[] {
  return rows
    .map((r) => {
      const imgOv = IMAGE_OVERRIDES.find((o) => o.match.test(r.name));
      const catOv = CATEGORY_OVERRIDES.find((o) => o.match.test(r.name));
      let out = r;
      if (imgOv) out = { ...out, imageUrl: imgOv.url };
      if (catOv) out = { ...out, category: catOv.category };
      return out;
    })
    // Accessories are excluded from all site views and filters.
    .filter((r) => (r.category ?? "").trim().toLowerCase() !== "accessories");
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
