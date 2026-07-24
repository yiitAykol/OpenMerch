"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import styles from "./page.module.scss";

export default function ProductDetailPage() {
    const params = useParams();
    const productId = params.id;

    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Gerçek sepet ve kullanıcı bilgisi için context'leri çekiyoruz
    const { addToCart } = useCart();
    const { user } = useAuth();

    useEffect(() => {
        async function fetchProduct() {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/${productId}`);
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

    // Favorilere Ekleme Fonksiyonu
    const handleFavorite = async () => {
        if (!user) {
            window.dispatchEvent(new Event("loginRequired"));
            return;
        }
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/favorites`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId: product.id, userId: user.id }),
            });

            if (res.ok) {
                // Favoriler sayfasının haberdar olması için eventi tetikliyoruz
                window.dispatchEvent(new Event("favoriteAdded"));
            }
        } catch (error) {
            console.error("Favori eklenemedi:", error);
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
                        Favorilere Ekle
                    </button>
                </div>
            </div>

        </div>
    );
}
