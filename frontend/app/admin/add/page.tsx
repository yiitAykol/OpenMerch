"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../admin.module.scss";

export default function AddProductPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    imageUrl: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
        }),
      });

      if (res.ok) {
        alert("Ürün başarıyla eklendi!");
        router.push("/admin");
      } else {
        alert("Ürün eklenirken bir hata oluştu.");
      }
    } catch (error) {
      console.error("Hata:", error);
      alert("Sunucuya ulaşılamadı.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Yeni Ürün Ekle</h1>
      </div>

      <div className={styles.formContainer}>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="name">Ürün Adı</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              required 
              value={formData.name} 
              onChange={handleChange} 
              placeholder="Örn: Kablosuz Kulaklık"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="price">Fiyat (TL)</label>
            <input 
              type="number" 
              id="price" 
              name="price" 
              required 
              min="0" 
              step="0.01"
              value={formData.price} 
              onChange={handleChange} 
              placeholder="Örn: 1599.99"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="imageUrl">Görsel URL</label>
            <input 
              type="url" 
              id="imageUrl" 
              name="imageUrl" 
              required 
              value={formData.imageUrl} 
              onChange={handleChange} 
              placeholder="Örn: https://example.com/image.jpg"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Açıklama</label>
            <textarea 
              id="description" 
              name="description" 
              required 
              value={formData.description} 
              onChange={handleChange} 
              placeholder="Ürün hakkında detaylı bilgi..."
            />
          </div>

          <div className={styles.formActions}>
            <Link href="/admin" className={styles.cancelBtn}>
              İptal
            </Link>
            <button type="submit" className={styles.saveBtn} disabled={isSubmitting}>
              {isSubmitting ? "Kaydediliyor..." : "Ürünü Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
