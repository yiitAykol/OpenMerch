"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useApi } from "@/app/lib/useApi";

type CartItemType = {
  id: number;
  product: {
    id: number;
    name: string;
    price: number;
    imageUrl: string;
  };
  quantity: number;
};

type CartType = {
  id: number;
  items: CartItemType[];
};

interface CartContextProps {
  cart: CartType | null;
  addToCart: (productId: number, quantity?: number) => void;
  updateQuantity: (itemId: number, quantity: number) => void;
  removeFromCart: (itemId: number) => void;
  // Sepeti sunucudan yeniden okur. Sepeti backend'in boşalttığı durumlarda
  // (ör. sipariş verme) arayüzü güncel tutmak için gerekir.
  refreshCart: () => Promise<void>;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextProps>({
  cart: null,
  addToCart: () => { },
  updateQuantity: () => { },
  removeFromCart: () => { },
  refreshCart: async () => { },
  totalItems: 0,
  totalPrice: 0,
});

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<CartType | null>(null);
  const { user, token } = useAuth(); // token eklendi


  const apiFetch = useApi();

  const fetchCart = async () => {
    if (!user || !token) return; // giriş yoksa sepet çekme
    try {
      const res = await apiFetch(`/api/cart`);
      if (res.ok) {
        const data = await res.json();
        setCart(data);
      }
    } catch (error) {
      console.error("Sepet getirilirken hata oluştu:", error);
    }
  };

  // Kullanıcı değişince sepeti yenile; çıkışta ekrandan temizle.
  useEffect(() => {
    if (user) fetchCart();
    else setCart(null);
  }, [user]);

  const addToCart = async (productId: number, quantity: number = 1) => {
    if (!user) {
      window.dispatchEvent(new Event("loginRequired"));
      return;
    }
    try {
      const res = await apiFetch(`/api/cart/items`, {
        method: "POST",
        body: JSON.stringify({ productId, quantity }),
      });
      if (res.ok) {
        const data = await res.json();
        setCart(data);
        window.dispatchEvent(new Event("cartAdded"));
      }
    } catch (error) {
      console.error("Sepete eklerken hata oluştu:", error);
    }
  };

  const updateQuantity = async (itemId: number, quantity: number) => {
    try {
      const res = await apiFetch(`/api/cart/items/${itemId}?quantity=${quantity}`, {
        method: "PUT",
      });
      if (res.ok) {
        const data = await res.json();
        setCart(data);
      }
    } catch (error) {
      console.error("Sepet güncellenirken hata oluştu:", error);
    }
  };

  const removeFromCart = async (itemId: number) => {
    try {
      const res = await apiFetch(`/api/cart/items/${itemId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const data = await res.json();
        setCart(data);
      }
    } catch (error) {
      console.error("Sepetten silerken hata oluştu:", error);
    }
  };

  const totalItems = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const totalPrice = cart?.items.reduce((sum, item) => sum + item.quantity * item.product.price, 0) || 0;

  return (
    <CartContext.Provider value={{ cart, addToCart, updateQuantity, removeFromCart, refreshCart: fetchCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
