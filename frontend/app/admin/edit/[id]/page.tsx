"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import styles from "../../admin.module.scss";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    imageUrl: "",
  });

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products`);
        if (res.ok) {
          const products = await res.json();
          const product = products.find((p: any) => p.id.toString() === id);
          if (product) {
            setFormData({
              name: product.name,
              description: product.description,
              price: product.price.toString(),
              imageUrl: product.imageUrl,
            });
          } else {
            alert("Ürün bulunamadı!");
            router.push("/admin");
          }
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
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
