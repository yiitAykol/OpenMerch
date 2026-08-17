"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../admin.module.scss";
import { useApi } from "../../lib/useApi";

type Category = { id: number; name: string };

export default function AddProductPage() {
  const router = useRouter();
  const apiFetch = useApi();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    imageUrl: "",
    category: "",
  });

  // Mevcut kategorileri çek
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories`);
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
          // İlk kategoriyi varsayılan seç
          if (data.length > 0) {
            setFormData(prev => ({ ...prev, category: data[0].name }));
          }
        }
      } catch (error) {
        console.error("Kategoriler getirilirken hata:", error);
      }
    };
    fetchCategories();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await apiFetch("/api/products", {
        method: "POST",
        body: JSON.stringify({
          // Form alanları metin olarak tutulur; backend price için sayı,
          // stock için tam sayı bekler. parseInt olmadan Jackson "12" metnini
          // int alana yazamaz ve istek 400 döner.
          ...formData,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock, 10) || 0,
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
            <label htmlFor="category">Kategori</label>
            <select
              id="category"
              name="category"
              required
              value={formData.category}
              onChange={handleChange}
            >
              {categories.length === 0 && (
                <option value="">Önce kategori ekleyin</option>
              )}
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
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
            <label htmlFor="stock">Stok Adedi</label>
            <input
              type="number"
              id="stock"
              name="stock"
              required
              min="0"
              step="1"
              value={formData.stock}
              onChange={handleChange}
              placeholder="Örn: 25"
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
