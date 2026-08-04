"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import styles from "./page.module.scss";
import { useApi } from "@/app/lib/useApi";

export default function ProductDetailPage() {
    const params = useParams();
    const productId = params.id;

    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    // Bu ürünün favori kaydının id'si. null ise favoride değil.
    const [favId, setFavId] = useState<number | null>(null);

    // Gerçek sepet ve kullanıcı bilgisi için context'leri çekiyoruz
    const { addToCart } = useCart();
    const { user } = useAuth();
    const apiFetch = useApi();

    useEffect(() => {
        async function fetchProduct() {
            try {
                const res = await apiFetch(`/api/products/${productId}`);
                if (res.ok) {
                    const data = await res.json();
                    setProduct(data);
                }
            } catch (error) {
                console.error("Ürün yüklenirken hata oluştu:", error);
            } finally {
                setLoading(false);
            }
        }

        if (productId) {
            fetchProduct();
        }
    }, [productId]);

    // Kullanıcı veya ürün değişince: bu ürün favorilerde mi?
    useEffect(() => {
        if (!user || !product) {
            setFavId(null);
            return;
        }
        async function loadFavoriteState() {
            const res = await apiFetch("/api/favorites");
            if (!res.ok) return;
            const data = await res.json();
            const match = data.find(
                (f: { id: number; product: { id: number } }) => f.product.id === product.id
            );
            setFavId(match ? match.id : null);
        }
        loadFavoriteState();
    }, [user, product]);

    // Favoriye ekle / favoriden çıkar (duruma göre)
    const handleFavorite = async () => {
        if (!user) {
            window.dispatchEvent(new Event("loginRequired"));
            return;
        }
        try {
            // Favorideyse → çıkar
            if (favId !== null) {
                const res = await apiFetch(`/api/favorites/${favId}`, { method: "DELETE" });
                if (res.ok) {
                    setFavId(null);
                    window.dispatchEvent(new Event("favoriteAdded"));
                } else {
                    console.error("Favoriden çıkarılamadı:", res.status);
                }
                return;
            }

            // Favoride değilse → ekle
            const res = await apiFetch("/api/favorites", {
                method: "POST",
                body: JSON.stringify({ productId: product.id }),
            });
            if (res.ok) {
                // Dönen kaydın id'sini sakla ki sayfayı yenilemeden çıkarabilelim
                const data = await res.json();
                setFavId(data.id);
                window.dispatchEvent(new Event("favoriteAdded"));
            } else {
                console.error("Favoriye eklenemedi:", res.status);
            }
        } catch (error) {
            console.error("Favori işlemi başarısız:", error);
        }
    };

    if (loading) return <div style={{ textAlign: "center", padding: '50px' }}>Ürün Yükleniyor...</div>;
    if (!product) return <div style={{ textAlign: "center", padding: '50px' }}>Ürün bulunamadı!</div>;

    return (
        <div className={styles.container}>

            {/* SOL SÜTUN: RESİM */}
            <div className={styles.leftColumn}>
                <div className={styles.imageWrapper}>
                    <img src={product.imageUrl} alt={product.name} />
                </div>
            </div>

            {/* SAĞ SÜTUN: BİLGİLER */}
            <div className={styles.rightColumn}>
                <h1 className={styles.title}>{product.name}</h1>
                <p>Kategori: {product.category}</p>
                <h2 className={styles.price}>{product.price} TL</h2>
                <div className={styles.description}>{product.description}</div>



                {/* BUTONLAR */}
                <div className={styles.buttonGroup}>
                    <button
                        className={styles.cartButton}
                        onClick={() => addToCart(product.id, 1)}
                    >
                        Add to cart
                    </button>
                    <button
                        className={styles.favButton}
                        onClick={handleFavorite}
                    >
                        {favId !== null ? "Favoriden Çıkar" : "Favorilere Ekle"}
                    </button>
                </div>
            </div>

        </div>
    );
}
