"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import styles from "../../admin.module.scss";
import { useApi } from "../../../lib/useApi";

export default function EditProductPage() {
  const router = useRouter();
  const apiFetch = useApi();
  const params = useParams();
  const id = params.id;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
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
          setCategories(await res.json());
        }
      } catch (error) {
        console.error("Kategoriler getirilirken hata:", error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        // Tek ürün için tek ürün ucu: eskiden tüm liste indirilip .find() ile
        // aranıyordu. Liste artık sayfalı olduğu için bu zaten çalışmazdı.
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/${id}`);
        if (res.ok) {
          const product = await res.json();
          setFormData({
            name: product.name,
            description: product.description,
            price: product.price.toString(),
            // Stok alanı eski ürünlerde tanımsız gelebilir; boş string
            // yerine "0" koyuyoruz ki input kontrolsüz (uncontrolled) olmasın.
            stock: (product.stock ?? 0).toString(),
            imageUrl: product.imageUrl,
            category: product.category ?? "",
          });
        } else {
          // "Bulunamadı" artık find()'ın undefined dönmesiyle değil, 404 ile anlaşılıyor.
          alert("Ürün bulunamadı!");
          router.push("/admin");
        }
      } catch (error) {
        console.error("Hata:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await apiFetch(`/api/products/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock, 10) || 0,
        }),
      });

      if (res.ok) {
        alert("Ürün başarıyla güncellendi!");
        router.push("/admin");
      } else {
        alert("Ürün güncellenirken bir hata oluştu.");
      }
    } catch (error) {
      console.error("Hata:", error);
      alert("Sunucuya ulaşılamadı.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className={styles.container}>Yükleniyor...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Ürün Düzenle</h1>
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
              {/* Ürünün mevcut kategorisi listede yoksa yine de görünsün */}
              {formData.category &&
                !categories.some((c) => c.name === formData.category) && (
                  <option value={formData.category}>{formData.category}</option>
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
            />
          </div>

          <div className={styles.formActions}>
            <Link href="/admin" className={styles.cancelBtn}>
              İptal
            </Link>
            <button type="submit" className={styles.saveBtn} disabled={isSubmitting}>
              {isSubmitting ? "Güncelleniyor..." : "Değişiklikleri Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
