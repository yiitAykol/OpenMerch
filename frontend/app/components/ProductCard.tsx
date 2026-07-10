"use client";

import { useState, useEffect } from "react";
import styles from "./ProductCard.module.scss";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

// 1. BURAYA PRODUCT TİPİNİ EKLİYORUZ
export interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    category: string; // Kategori alanımız
}

export default function ProductCard({ product, isFavorite, onRemove, favoriteId }: { product: Product; isFavorite?: boolean; onRemove?: () => void; favoriteId?: number | null; }) {
    // Bu ürünün favori kaydının id'si (null ise favoride değil). Sayfa yenilenince
    // ana sayfadan gelen favoriteId ile dolu başlar, böylece yıldız kalıcı olur.
    const [favId, setFavId] = useState<number | null>(favoriteId ?? null);

    // Ana sayfa favorileri geç yüklerse (prop sonradan gelirse) senkronla.
    useEffect(() => {
        setFavId(favoriteId ?? null);
    }, [favoriteId]);

    // Yıldız dolu mu? Favoriler sayfasında isFavorite ile, ana sayfada favId ile.
    const isFav = isFavorite || favId !== null;

    const { addToCart, cart } = useCart();
    const { user } = useAuth();

    // Bu ürünün sepette kaç adet olduğu (her eklemede otomatik artar)
    const qtyInCart = cart?.items.find((i) => i.product.id === product.id)?.quantity ?? 0;

    async function handleStarClick() {
        // Favoriler sayfasındaysak (onRemove verilmişse) tıklayınca favoriden çıkar
        if (isFavorite && onRemove) {
            onRemove();
            return;
        }

        // Zaten favorideyse → favoriden çıkar (kayıt id'siyle sil)
        if (favId !== null) {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/favorites/${favId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setFavId(null);
                window.dispatchEvent(new Event("favoriteAdded"));
            }
            return;
        }

        // Favoride değilse → favoriye ekle (giriş zorunlu)
        if (!user) {
            alert("Favorilere eklemek için giriş yapmalısınız.");
            return;
        }
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/favorites`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: product.id, userId: user.id }),
        });
        if (res.ok) {
            const data = await res.json();
            setFavId(data.id);
            window.dispatchEvent(new Event("favoriteAdded"));
        } else {
            console.log("favori eklenemedi");
        }
    }

    return (
        <div className={styles.card}>
            <div className={styles.imageWrap}>
                {product.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.imageUrl} alt={product.name} className={styles.image} />
                )}

                {/* Sağ üstte yıldız: tıklayınca favoriye ekler, içi sarı dolar */}
                <button
                    className={`${styles.starButton} ${isFav ? styles.starActive : ""}`}
                    onClick={handleStarClick}
                    aria-label={isFav ? "Favoriden çıkar" : "Favoriye ekle"}
                >
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                        <path
                            d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.9 6.19 20.9l1.11-6.47-4.7-4.58 6.5-.95L12 2.5z"
                            fill={isFav ? "#facc15" : "none"}
                            stroke={isFav ? "#eab308" : "#555"}
                            strokeWidth="1.6"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>

                {/* Sağ altta sepete ekle: minimal ikon buton + adet sayısı */}
                {!isFavorite && (
                    <button
                        className={styles.cartButton}
                        onClick={() => addToCart(product.id, 1)}
                        aria-label="Sepete Ekle"
                    >
                        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                            <path
                                d="M6 6h15l-1.5 9h-12L6 6zm0 0l-.6-3H3m5 15a1 1 0 100 2 1 1 0 000-2zm10 0a1 1 0 100 2 1 1 0 000-2z"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        {qtyInCart > 0 && <span className={styles.cartCount}>{qtyInCart}</span>}
                    </button>
                )}
            </div>

            <div className={styles.category}>{product.category}</div>
            <div className={styles.name}>{product.name}</div>
            <div className={styles.price}>{product.price} TL</div>
        </div>
    );
}
