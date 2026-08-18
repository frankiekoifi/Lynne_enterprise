"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface CartItem {
  id: number;
  variationId: number;
  quantity: number;
  name: string;
  price: number;
  productName: string;
  coverImage: string | null;
  slug: string;
  total: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  loading: boolean;
  fetchCart: () => Promise<void>;
  addItem: (variationId: number, qty?: number) => Promise<void>;
  removeItem: (cartId: number) => Promise<void>;
  setQty: (cartId: number, qty: number) => Promise<void>;
  clear: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCart = useCallback(async () => {
    try {
      const res = await fetch("/api/cart", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const cartItems = data.items.map((item: any) => ({
          id: item.id,
          variationId: item.variationId,
          quantity: item.quantity,
          name: item.variation?.name || "",
          price: item.variation?.price || 0,
          productName: item.product?.name || "",
          coverImage: item.product?.coverImage || null,
          slug: item.product?.slug || "",
          total: item.total,
        }));
        setItems(cartItems);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error("Error fetching cart:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addItem = useCallback(
    async (variationId: number, qty = 1) => {
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variationId, quantity: qty }),
          credentials: "include",
        });
        if (res.ok) {
          await fetchCart();
        }
      } catch (error) {
        console.error("Error adding to cart:", error);
      }
    },
    [fetchCart],
  );

  const removeItem = useCallback(
    async (cartId: number) => {
      try {
        const res = await fetch(`/api/cart?id=${cartId}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (res.ok) {
          await fetchCart();
        }
      } catch (error) {
        console.error("Error removing from cart:", error);
      }
    },
    [fetchCart],
  );

  const setQty = useCallback(
    async (cartId: number, qty: number) => {
      try {
        const res = await fetch("/api/cart", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cartId, quantity: qty }),
          credentials: "include",
        });
        if (res.ok) {
          await fetchCart();
        }
      } catch (error) {
        console.error("Error updating cart:", error);
      }
    },
    [fetchCart],
  );

  const clear = useCallback(async () => {
    try {
      for (const item of items) {
        await fetch(`/api/cart?id=${item.id}`, {
          method: "DELETE",
          credentials: "include",
        });
      }
      await fetchCart();
    } catch (error) {
      console.error("Error clearing cart:", error);
    }
  }, [items, fetchCart]);

  const count = items.reduce((a, i) => a + i.quantity, 0);
  const subtotal = items.reduce((a, i) => a + i.total, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        count,
        subtotal,
        loading,
        fetchCart,
        addItem,
        removeItem,
        setQty,
        clear,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
