"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { useApi } from "@/lib/useApi";

type CartItemType = {
  id: number;
  product: {
    id: number;
    name: string;
    price: number;
    imageUrl: string;
    stock: number;
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
  const { user, token } = useAuth();

  const apiFetch = useApi();

  // Backend'in reddettiği bir sepet isteğinin sebebini kullanıcıya duyurur.
  // Header bu olayı dinleyip toast gösterir — "loginRequired" ile aynı yöntem.
  // Bu olmadan istek sessizce düşer ve kullanıcı butonun neden işe yaramadığını anlamaz.
  const notifyCartError = async (res: Response) => {
    let message = "İşlem gerçekleştirilemedi.";
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      // Gövdesiz yanıt (ör. 401/403) — varsayılan mesajla devam.
    }
    window.dispatchEvent(new CustomEvent("cartError", { detail: message }));
  };

  // Sepeti sunucudan okur ve döndürür; state'e dokunmaz. Böylece hem effect'ten
  // hem refreshCart'tan aynı şekilde kullanılabiliyor.
  const loadCart = useCallback(async (): Promise<CartType | null> => {
    if (!token) return null; // giriş yoksa sepet çekme
    try {
      const res = await apiFetch(`/api/cart`);
      return res.ok ? await res.json() : null;
    } catch (error) {
      console.error("Sepet getirilirken hata oluştu:", error);
      return null;
    }
  }, [token, apiFetch]);

  const refreshCart = async () => {
    const data = await loadCart();
    if (data) setCart(data);
  };

  // Kullanıcı değişince sepeti yenile. Çıkışta temizlemeye gerek yok:
  // aşağıdaki visibleCart, kullanıcı yokken sepeti zaten gizler.
  useEffect(() => {
    if (!user) return;
    loadCart().then((data) => {
      if (data) setCart(data);
    });
  }, [user, loadCart]);

  const visibleCart = user ? cart : null;

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
      } else {
        await notifyCartError(res);
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
      } else {
        await notifyCartError(res);
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

  const totalItems = visibleCart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const totalPrice = visibleCart?.items.reduce((sum, item) => sum + item.quantity * item.product.price, 0) || 0;

  return (
    <CartContext.Provider value={{ cart: visibleCart, addToCart, updateQuantity, removeFromCart, refreshCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
