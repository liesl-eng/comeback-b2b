import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";

export interface OrderItem {
  id: string;            // unique per (brand+name) line
  productName: string;
  brand: string;
  imageUrl: string | null;
  msrp: number;
  yourPrice: number;
  quantity: number;
  unitsAvailable: number;
}

export interface OrderSpace {
  id: string;
  name: string;
  items: OrderItem[];
}

export interface BuyerInfo {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  notes: string;
}

interface OrderState {
  spaces: OrderSpace[];
  buyerInfo: BuyerInfo;
}

const STORAGE_KEY = "comeback_order";
export const ORDER_MOQ = 10000;

const defaultBuyerInfo: BuyerInfo = {
  companyName: "", contactName: "", email: "", phone: "", notes: "",
};

const initialState = (): OrderState => ({
  spaces: [{ id: "space_1", name: "Collection 1", items: [] }],
  buyerInfo: { ...defaultBuyerInfo },
});

interface Ctx {
  state: OrderState;
  totals: {
    items: number;
    grandTotal: number;
    grandMsrp: number;
    savings: number;
    spacesWithItems: number;
    moqMet: boolean;
    moqRemaining: number;
    spaceSubtotal: (spaceId: string) => number;
    brandSummary: { brand: string; itemCount: number; brandTotal: number }[];
  };
  addItem: (spaceId: string, item: Omit<OrderItem, "quantity">, qty?: number) => void;
  updateQty: (spaceId: string, itemId: string, qty: number) => void;
  removeItem: (spaceId: string, itemId: string) => void;
  addSpace: (name?: string) => string;
  addSpaceWithItem: (name: string | undefined, item: Omit<OrderItem, "quantity">, qty?: number) => { id: string; name: string };
  renameSpace: (spaceId: string, name: string) => void;
  deleteSpace: (spaceId: string) => void;
  setBuyerInfo: (info: BuyerInfo) => void;
  clearOrder: () => void;
}

const OrderCtx = createContext<Ctx | null>(null);

export function BuildOrderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OrderState>(initialState);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.spaces?.length) setState({ ...initialState(), ...parsed });
      }
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }, [state]);

  const addItem: Ctx["addItem"] = useCallback((spaceId, item, qty = 1) => {
    setState((prev) => {
      const spaces = prev.spaces.map((s) => {
        if (s.id !== spaceId) return s;
        const existing = s.items.find((i) => i.id === item.id);
        if (existing) {
          const cap = item.unitsAvailable || existing.quantity + qty;
          return {
            ...s,
            items: s.items.map((i) =>
              i.id === item.id ? { ...i, quantity: Math.min(i.quantity + qty, cap) } : i,
            ),
          };
        }
        return { ...s, items: [...s.items, { ...item, quantity: Math.min(qty, item.unitsAvailable || qty) }] };
      });
      return { ...prev, spaces };
    });
  }, []);

  const updateQty: Ctx["updateQty"] = useCallback((spaceId, itemId, qty) => {
    setState((prev) => ({
      ...prev,
      spaces: prev.spaces.map((s) => {
        if (s.id !== spaceId) return s;
        return {
          ...s,
          items: s.items.map((i) => {
            if (i.id !== itemId) return i;
            const max = i.unitsAvailable || qty;
            return { ...i, quantity: Math.max(1, Math.min(qty, max)) };
          }),
        };
      }),
    }));
  }, []);

  const removeItem: Ctx["removeItem"] = useCallback((spaceId, itemId) => {
    setState((prev) => ({
      ...prev,
      spaces: prev.spaces.map((s) =>
        s.id === spaceId ? { ...s, items: s.items.filter((i) => i.id !== itemId) } : s,
      ),
    }));
  }, []);

  const addSpace: Ctx["addSpace"] = useCallback((name) => {
    const id = `space_${Date.now()}`;
    setState((prev) => {
      const n = name || `Collection ${prev.spaces.length + 1}`;
      return { ...prev, spaces: [...prev.spaces, { id, name: n, items: [] }] };
    });
    return id;
  }, []);

  const addSpaceWithItem: Ctx["addSpaceWithItem"] = useCallback((name, item, qty = 1) => {
    const id = `space_${Date.now()}`;
    let finalName = name?.trim() || "";
    setState((prev) => {
      const n = finalName || `Collection ${prev.spaces.length + 1}`;
      finalName = n;
      const q = Math.min(qty, item.unitsAvailable || qty);
      const newSpace: OrderSpace = { id, name: n, items: [{ ...item, quantity: q }] };
      return { ...prev, spaces: [...prev.spaces, newSpace] };
    });
    return { id, name: finalName };
  }, []);

  const renameSpace: Ctx["renameSpace"] = useCallback((spaceId, name) => {
    setState((prev) => ({
      ...prev,
      spaces: prev.spaces.map((s) => (s.id === spaceId ? { ...s, name: name.trim() || s.name } : s)),
    }));
  }, []);

  const deleteSpace: Ctx["deleteSpace"] = useCallback((spaceId) => {
    setState((prev) => {
      const remaining = prev.spaces.filter((s) => s.id !== spaceId);
      if (remaining.length === 0) {
        return { ...prev, spaces: [{ id: `space_${Date.now()}`, name: "Collection 1", items: [] }] };
      }
      return { ...prev, spaces: remaining };
    });
  }, []);

  const setBuyerInfo: Ctx["setBuyerInfo"] = useCallback((info) => {
    setState((prev) => ({ ...prev, buyerInfo: info }));
  }, []);

  const clearOrder = useCallback(() => {
    setState(initialState());
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  const totals = useMemo(() => {
    const allItems = state.spaces.flatMap((s) => s.items);
    const items = allItems.reduce((n, i) => n + i.quantity, 0);
    const grandTotal = allItems.reduce((n, i) => n + i.quantity * i.yourPrice, 0);
    const grandMsrp = allItems.reduce((n, i) => n + i.quantity * i.msrp, 0);
    const savings = grandMsrp - grandTotal;
    const spacesWithItems = state.spaces.filter((s) => s.items.length > 0).length;
    const moqMet = grandTotal >= ORDER_MOQ;
    const moqRemaining = Math.max(0, ORDER_MOQ - grandTotal);

    const brandMap = new Map<string, { itemCount: number; brandTotal: number }>();
    for (const i of allItems) {
      const cur = brandMap.get(i.brand) ?? { itemCount: 0, brandTotal: 0 };
      cur.itemCount += i.quantity;
      cur.brandTotal += i.quantity * i.yourPrice;
      brandMap.set(i.brand, cur);
    }
    const brandSummary = Array.from(brandMap.entries())
      .map(([brand, v]) => ({ brand, ...v }))
      .sort((a, b) => b.brandTotal - a.brandTotal);

    const spaceSubtotal = (spaceId: string) => {
      const sp = state.spaces.find((s) => s.id === spaceId);
      if (!sp) return 0;
      return sp.items.reduce((n, i) => n + i.quantity * i.yourPrice, 0);
    };

    return { items, grandTotal, grandMsrp, savings, spacesWithItems, moqMet, moqRemaining, spaceSubtotal, brandSummary };
  }, [state]);

  return (
    <OrderCtx.Provider value={{ state, totals, addItem, updateQty, removeItem, addSpace, addSpaceWithItem, renameSpace, deleteSpace, setBuyerInfo, clearOrder }}>
      {children}
    </OrderCtx.Provider>
  );
}

export function useBuildOrder() {
  const v = useContext(OrderCtx);
  if (!v) throw new Error("useBuildOrder must be used within BuildOrderProvider");
  return v;
}
