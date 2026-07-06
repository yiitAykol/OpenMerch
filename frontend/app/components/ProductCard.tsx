"use client";

import styles from "./ProductCard.module.scss";
import { useCart } from "../context/CartContext";

export default function ProductCard({ product, isFavorite, onRemove }: { product: any; isFavorite?: boolean; onRemove?: () => void; }) {
    async function handleFavorite() {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/favorites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
        });
        if (res.ok) {
            const data = await res.json();
            console.log("favori eklendi:", data);
            window.dispatchEvent(new Event("favoriteAdded"));
        } else {
            console.log("favori eklenemedi");
        }
    }

    const { addToCart } = useCart();

    return (
        <div className={styles.card}>
            {product.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl} alt={product.name} className={styles.image} />
            )}
            <div className={styles.name}>{product.name}</div>
            <div>{product.price} TL</div>
        
        {isFavorite ? (
            <button className={styles.buttonRemove} onClick={onRemove}>Favoriden çıkar</button>
            ) : (
            <button className={styles.button} onClick={handleFavorite}>Favoriye ekle</button>
        )}
        
        {!isFavorite && (
            <button className={styles.button} style={{ marginLeft: '10px' }} onClick={() => addToCart(product.id, 1)}>Sepete Ekle</button>
        )}
        </div>
    );
}