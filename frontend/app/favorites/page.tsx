"use client";
import { useState, useEffect } from "react";
import ProductCard from "../components/ProductCard";
import styles from "../page.module.scss";
import { useAuth } from "../context/AuthContext";

export default function FavoritesPage() {
  // 1. önce state
  const [favorites, setFavorites] = useState<any[]>([]);
  const { user, loading } = useAuth();

  // 2. sonra effect (veriyi çeker) — giriş yapan kullanıcının favorileri
  useEffect(() => {
    if (!user) {
      setFavorites([]);
      return;
    }
    const userId = user.id;
    async function load() {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/favorites?userId=${userId}`);
      const data = await res.json();
      setFavorites(data);
    }
    load();
  }, [user]);

  async function handleRemove(favoriteId: number) {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/favorites/${favoriteId}`, {
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