"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { toggleWishlistAction } from "@/actions/account";
import { getCartProducts } from "@/actions/shop";
import { useToast } from "@/components/ui/toast";
import type { ProductCardData } from "@/lib/catalog";
import { MAX_CART_QTY } from "@/lib/constants";
import { deliveryChargeFor, type PublicSettings } from "@/lib/settings-shared";
import { round2 } from "@/lib/utils";

export type CartItem = { id: number; qty: number };
export type CartLine = {
  product: ProductCardData;
  qty: number;
  lineTotal: number;
};
export type StoreUser = {
  id: number;
  name: string;
  email: string;
  phone: string;
  isStaff: boolean;
};

type StoreApi = {
  settings: PublicSettings;
  user: StoreUser | null;
  /** False until the cart has been read from localStorage. */
  ready: boolean;
  loading: boolean;
  items: CartItem[];
  lines: CartLine[];
  count: number;
  subtotal: number;
  deliveryCharge: number;
  total: number;
  addToCart: (
    product: Pick<ProductCardData, "id" | "name" | "stock">,
    qty?: number,
  ) => void;
  setQty: (id: number, qty: number) => void;
  remove: (id: number) => void;
  clear: () => void;
  addMany: (items: CartItem[]) => void;
  refresh: () => Promise<void>;
  wishlistIds: Set<number>;
  toggleWishlist: (productId: number) => void;
};

const StoreContext = createContext<StoreApi | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

const KEY = "mz_cart_v1";
const CHANGE_EVENT = "mz-cart-change";

// The cart lives in localStorage and is read through useSyncExternalStore, so it
// hydrates without a mismatch and stays in sync across browser tabs.
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function readRaw() {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function parseCart(json: string): CartItem[] {
  try {
    const raw = JSON.parse(json);
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (i) =>
          Number.isInteger(i?.id) &&
          Number.isInteger(i?.qty) &&
          i.id > 0 &&
          i.qty > 0,
      )
      .map((i) => ({ id: i.id, qty: Math.min(i.qty, MAX_CART_QTY) }));
  } catch {
    return [];
  }
}

export function StoreProvider({
  settings,
  user,
  wishlist,
  children,
}: {
  settings: PublicSettings;
  user: StoreUser | null;
  wishlist: number[];
  children: React.ReactNode;
}) {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const ready = raw !== null;
  const items = useMemo(() => (raw === null ? [] : parseCart(raw)), [raw]);
  const [catalog, setCatalog] = useState<Record<number, ProductCardData>>({});
  const [loading, setLoading] = useState(false);
  const [wishlistIds, setWishlistIds] = useState(() => new Set(wishlist));
  const toast = useToast();
  const router = useRouter();
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Always derives the next cart from what is stored right now, so rapid clicks never lose an update.
  const setItems = useCallback((update: (list: CartItem[]) => CartItem[]) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(update(parseCart(readRaw()))));
    } catch {
      /* storage unavailable (private mode / quota) */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  // Server-rendered wishlist wins whenever the layout re-renders with fresh data.
  const [lastWishlist, setLastWishlist] = useState(wishlist);
  if (lastWishlist !== wishlist) {
    setLastWishlist(wishlist);
    setWishlistIds(new Set(wishlist));
  }

  const load = useCallback(
    async (ids: number[]) => {
      if (!ids.length) return;
      setLoading(true);
      try {
        const found = await getCartProducts(ids);
        const byId = Object.fromEntries(found.map((p) => [p.id, p]));
        setCatalog((c) => ({ ...c, ...byId }));
        // Drop anything that has been deleted or hidden since it was added.
        setItems((list) =>
          list.filter((i) => !ids.includes(i.id) || byId[i.id]),
        );
      } catch {
        /* keep what we have; the cart page offers a retry */
      } finally {
        setLoading(false);
      }
    },
    [setItems],
  );

  const idsKey = items.map((i) => i.id).join(",");
  useEffect(() => {
    const missing = itemsRef.current
      .map((i) => i.id)
      .filter((id) => !catalog[id]);
    if (ready && missing.length) void load(missing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, ready]);

  const refresh = useCallback(
    () => load(itemsRef.current.map((i) => i.id)),
    [load],
  );

  const addToCart = useCallback<StoreApi["addToCart"]>(
    (product, qty = 1) => {
      const current =
        parseCart(readRaw()).find((i) => i.id === product.id)?.qty ?? 0;
      const limit = Math.min(product.stock, MAX_CART_QTY);
      if (limit <= 0) return toast.error(`${product.name} is out of stock.`);
      if (current >= limit)
        return toast.error(
          `You already have the maximum available quantity of ${product.name} in your cart.`,
        );
      const next = Math.min(current + qty, limit);
      setItems((list) =>
        current
          ? list.map((i) => (i.id === product.id ? { ...i, qty: next } : i))
          : [...list, { id: product.id, qty: next }],
      );
      toast.success(`${product.name} added to cart.`);
    },
    [toast, setItems],
  );

  const setQty = useCallback(
    (id: number, qty: number) => {
      setItems((list) =>
        qty <= 0
          ? list.filter((i) => i.id !== id)
          : list.map((i) =>
              i.id === id ? { ...i, qty: Math.min(qty, MAX_CART_QTY) } : i,
            ),
      );
    },
    [setItems],
  );
  const remove = useCallback(
    (id: number) => setItems((list) => list.filter((i) => i.id !== id)),
    [setItems],
  );
  const clear = useCallback(() => setItems(() => []), [setItems]);
  const addMany = useCallback(
    (incoming: CartItem[]) => {
      setItems((list) => {
        const map = new Map(list.map((i) => [i.id, i.qty]));
        for (const i of incoming)
          map.set(
            i.id,
            Math.min(Math.max(map.get(i.id) ?? 0, i.qty), MAX_CART_QTY),
          );
        return [...map].map(([id, qty]) => ({ id, qty }));
      });
    },
    [setItems],
  );

  const toggleWishlist = useCallback(
    (productId: number) => {
      if (!user) {
        toast.error("Please sign in to use your wishlist.");
        router.push(
          `/login?next=${encodeURIComponent(window.location.pathname)}`,
        );
        return;
      }
      const had = wishlistIds.has(productId);
      const flip = (on: boolean) =>
        setWishlistIds((s) => {
          const next = new Set(s);
          if (on) next.add(productId);
          else next.delete(productId);
          return next;
        });
      flip(!had);
      toggleWishlistAction(productId)
        .then((res) => {
          if (res.ok) toast.success(res.message ?? "Wishlist updated.");
          else {
            flip(had);
            toast.error(res.message ?? "Could not update wishlist.");
          }
        })
        .catch(() => {
          flip(had);
          toast.error("Could not update wishlist.");
        });
    },
    [user, wishlistIds, toast, router],
  );

  const value = useMemo<StoreApi>(() => {
    const lines = items
      .filter((i) => catalog[i.id])
      .map((i) => ({
        product: catalog[i.id],
        qty: i.qty,
        lineTotal: round2(catalog[i.id].price * i.qty),
      }));
    const subtotal = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));
    const deliveryCharge = deliveryChargeFor(subtotal, settings);
    return {
      settings,
      user,
      ready,
      loading,
      items,
      lines,
      count: items.reduce((n, i) => n + i.qty, 0),
      subtotal,
      deliveryCharge,
      total: round2(subtotal + deliveryCharge),
      addToCart,
      setQty,
      remove,
      clear,
      addMany,
      refresh,
      wishlistIds,
      toggleWishlist,
    };
  }, [
    items,
    catalog,
    settings,
    user,
    ready,
    loading,
    addToCart,
    setQty,
    remove,
    clear,
    addMany,
    refresh,
    wishlistIds,
    toggleWishlist,
  ]);

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}
