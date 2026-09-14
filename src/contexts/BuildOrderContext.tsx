import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";

export interface OrderItem {
  id: string;
  productName: string;
  brand: string;
  imageUrl: string | null;
  msrp: number;
  yourPrice: number;
  quantity: number;
  unitsAvailable: number;
}

export interface BuyerInfo {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  notes: string;
}

interface OrderState {
  items: OrderItem[];
  buyerInfo: BuyerInfo;
}

const STORAGE_KEY = "comeback_order";
export const ORDER_MOQ = 10000;

const defaultBuyerInfo: BuyerInfo = {
  companyName: "", contactName: "", email: "", phone: "", notes: "",
};

const initialState = (): OrderState => ({ items: [], buyerInfo: { ...defaultBuyerInfo } });

function mergeSavedItems(items: OrderItem[]): OrderItem[] {
  const merged = new Map<string, OrderItem>();
  for (const item of items) {
    const existing = merged.get(item.id);
    const quantity = Math.min((existing?.quantity ?? 0) + item.quantity, item.unitsAvailable || Infinity);
    merged.set(item.id, { ...item, quantity });
  }
  return Array.from(merged.values());
}

interface Ctx {
  state: OrderState;
  totals: {
    items: number;
    grandTotal: number;
    grandMsrp: number;
    savings: number;
    moqMet: boolean;
    moqRemaining: number;
    brandSummary: { brand: string; itemCount: number; brandTotal: number }[];
  };
  addItem: (item: Omit<OrderItem, "quantity">, qty?: number) => void;
  updateQty: (itemId: string, qty: number) => void;
  removeItem: (itemId: string) => void;
  setBuyerInfo: (info: BuyerInfo) => void;
  clearOrder: () => void;
}

const OrderCtx = createContext<Ctx | null>(null);

export function BuildOrderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OrderState>(initialState);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const savedItems = Array.isArray(parsed?.items)
        ? parsed.items
        : Array.isArray(parsed?.spaces)
          ? parsed.spaces.flatMap((space: { items?: OrderItem[] }) => space.items ?? [])
          : [];
      setState({ items: mergeSavedItems(savedItems), buyerInfo: { ...defaultBuyerInfo, ...parsed?.buyerInfo } });
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }, [state]);

  const addItem: Ctx["addItem"] = useCallback((item, qty = 1) => {
    setState((prev) => {
      const existing = prev.items.find((entry) => entry.id === item.id);
      if (!existing) {
        return { ...prev, items: [...prev.items, { ...item, quantity: Math.min(qty, item.unitsAvailable || qty) }] };
      }
      const cap = item.unitsAvailable || existing.quantity + qty;
      return {
        ...prev,
        items: prev.items.map((entry) =>
          entry.id === item.id ? { ...entry, ...item, quantity: Math.min(entry.quantity + qty, cap) } : entry,
        ),
      };
    });
  }, []);

  const updateQty: Ctx["updateQty"] = useCallback((itemId, qty) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId
          ? { ...item, quantity: Math.max(1, Math.min(qty, item.unitsAvailable || qty)) }
          : item,
      ),
    }));
  }, []);

  const removeItem: Ctx["removeItem"] = useCallback((itemId) => {
    setState((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== itemId) }));
  }, []);

  const setBuyerInfo: Ctx["setBuyerInfo"] = useCallback((buyerInfo) => {
    setState((prev) => ({ ...prev, buyerInfo }));
  }, []);

  const clearOrder = useCallback(() => {
    setState(initialState());
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  const totals = useMemo(() => {
    const items = state.items.reduce((sum, item) => sum + item.quantity, 0);
    const grandTotal = state.items.reduce((sum, item) => sum + item.quantity * item.yourPrice, 0);
    const grandMsrp = state.items.reduce((sum, item) => sum + item.quantity * item.msrp, 0);
    const savings = grandMsrp - grandTotal;
    const moqMet = grandTotal >= ORDER_MOQ;
    const moqRemaining = Math.max(0, ORDER_MOQ - grandTotal);
    const brands = new Map<string, { itemCount: number; brandTotal: number }>();
    for (const item of state.items) {
      const current = brands.get(item.brand) ?? { itemCount: 0, brandTotal: 0 };
      current.itemCount += item.quantity;
      current.brandTotal += item.quantity * item.yourPrice;
      brands.set(item.brand, current);
    }
    const brandSummary = Array.from(brands, ([brand, summary]) => ({ brand, ...summary }))
      .sort((a, b) => b.brandTotal - a.brandTotal);
    return { items, grandTotal, grandMsrp, savings, moqMet, moqRemaining, brandSummary };
  }, [state.items]);

  return (
    <OrderCtx.Provider value={{ state, totals, addItem, updateQty, removeItem, setBuyerInfo, clearOrder }}>
      {children}
    </OrderCtx.Provider>
  );
}

export function useBuildOrder() {
  const value = useContext(OrderCtx);
  if (!value) throw new Error("useBuildOrder must be used within BuildOrderProvider");
  return value;
}