"use client";
import { useState, useEffect } from "react";
import ProductCard, { type Product } from "@/components/ProductCard";
import styles from "../page.module.scss";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/lib/useApi";

type Favorite = { id: number; product: Product };

export default function FavoritesPage() {
  // 1. önce state
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const { user, loading } = useAuth();
  const apiFetch = useApi();
  // 2. sonra effect (veriyi çeker) — giriş yapan kullanıcının favorileri
  useEffect(() => {
    // Giriş yoksa çekecek bir şey yok; aşağıdaki erken return listeyi zaten gizler.
    if (!user) return;
    async function load() {
      const res = await apiFetch(`/api/favorites`);
      const data = await res.json();
      setFavorites(data);
    }
    load();
  }, [user, apiFetch]);

  async function handleRemove(favoriteId: number) {
    await apiFetch(`/api/favorites/${favoriteId}`, {
      method: "DELETE",
    });
    setFavorites(favorites.filter((f) => f.id !== favoriteId));
  }

  // 3. en son return (ekrana basar)
  if (!loading && !user) {
    return <p style={{ padding: "24px" }}>Favorilerinizi görmek için giriş yapın.</p>;
  }

  return (
    <div className={styles.grid}>
      {favorites.map((favorite) => (
        <ProductCard
          key={favorite.id}
          product={favorite.product}
          isFavorite={true}
          onRemove={() => handleRemove(favorite.id)}
        />
      ))}
    </div>
  );

}