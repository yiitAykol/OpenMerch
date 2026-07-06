"use client";
import { useState, useEffect } from "react";
import ProductCard from "../components/ProductCard";
import styles from "../page.module.scss";

export default function FavoritesPage() {
  // 1. önce state
  const [favorites, setFavorites] = useState<any[]>([]);

  // 2. sonra effect (veriyi çeker)
  useEffect(() => {
    async function load() {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/favorites`);
      const data = await res.json();
      setFavorites(data);
    }
    load();
  }, []);

  async function handleRemove(favoriteId: number) {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/favorites/${favoriteId}`, {
      method: "DELETE",
    });
    setFavorites(favorites.filter((f) => f.id !== favoriteId));
  }

  // 3. en son return (ekrana basar)
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