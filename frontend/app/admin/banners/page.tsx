"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../admin.module.scss";

type Banner = { id: number; imageUrl: string; title: string | null };

export default function BannersPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [imageUrl, setImageUrl] = useState("");
    const [title, setTitle] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchBanners = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/banners`);
            if (res.ok) {
                setBanners(await res.json());
            }
        } catch (error) {
            console.error("Banner'lar getirilirken hata:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBanners();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!imageUrl.trim()) return;
        setIsSubmitting(true);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/banners`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageUrl: imageUrl.trim(), title: title.trim() }),
            });

            if (res.ok) {
                const created = await res.json();
                setBanners(prev => [...prev, created]);
                setImageUrl("");
                setTitle("");
            } else {
                const msg = await res.text();
                alert(msg || "Banner eklenemedi.");
            }
        } catch (error) {
            console.error("Hata:", error);
            alert("Sunucuya ulaşılamadı.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Bu banner'ı silmek istediğinize emin misiniz?")) {
            return;
        }

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/banners/${id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setBanners(prev => prev.filter(b => b.id !== id));
            } else {
                alert("Silme işlemi başarısız oldu.");
            }
        } catch (error) {
            console.error("Banner silinirken hata:", error);
            alert("Bir hata oluştu.");
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Banner Yönetimi</h1>
                <Link href="/admin" className={styles.addButton}>
                    ← Ürünlere Dön
                </Link>
            </div>

            <div className={styles.formContainer}>
                <form onSubmit={handleAdd}>
                    <div className={styles.formGroup}>
                        <label htmlFor="imageUrl">Görsel URL</label>
                        <input
                            type="url"
                            id="imageUrl"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="Örn: https://example.com/banner.jpg"
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="title">Başlık (opsiyonel)</label>
                        <input
                            type="text"
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Örn: Radiohead Europe 2025"
                        />
                    </div>

                    {/* Girilen URL'nin canlı önizlemesi */}
                    {imageUrl.trim() && (
                        <div className={styles.formGroup}>
                            <label>Önizleme</label>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={imageUrl}
                                alt="Önizleme"
                                style={{ width: "100%", borderRadius: 8, display: "block" }}
                            />
                        </div>
                    )}

                    <div className={styles.formActions}>
                        <button type="submit" className={styles.saveBtn} disabled={isSubmitting}>
                            {isSubmitting ? "Ekleniyor..." : "Banner Ekle"}
                        </button>
                    </div>
                </form>
            </div>

            <table className={styles.productTable} style={{ marginTop: "2rem" }}>
                <thead>
                    <tr>
                        <th>Önizleme</th>
                        <th>Başlık</th>
                        <th>İşlemler</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr>
                            <td colSpan={3} style={{ textAlign: "center", padding: "2rem" }}>
                                Yükleniyor...
                            </td>
                        </tr>
                    ) : (
                        banners.map((banner) => (
                            <tr key={banner.id}>
                                <td>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={banner.imageUrl}
                                        alt=""
                                        style={{ height: 60, borderRadius: 6 }}
                                    />
                                </td>
                                <td><strong>{banner.title || "—"}</strong></td>
                                <td>
                                    <div className={styles.actionButtons}>
                                        <button
                                            onClick={() => handleDelete(banner.id)}
                                            className={styles.deleteBtn}
                                        >
                                            Sil
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                    {!isLoading && banners.length === 0 && (
                        <tr>
                            <td colSpan={3} style={{ textAlign: "center", padding: "2rem" }}>
                                Henüz hiç banner eklenmemiş.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
