"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./admin.module.scss";
import { useApi } from "../lib/useApi";

type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
};

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const apiFetch = useApi();

  const fetchProducts = async () => {
    try {
      const res = await apiFetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Ürünler getirilirken hata:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bu ürünü silmek istediğinize emin misiniz?")) {
      return;
    }

    try {
      const res = await apiFetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setProducts(products.filter(p => p.id !== id));
      } else {
        alert("Silme işlemi başarısız oldu.");
      }
    } catch (error) {
      console.error("Ürün silinirken hata:", error);
      alert("Bir hata oluştu.");
    }
  };

  if (isLoading) {
    return <div className={styles.container}>Yükleniyor...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Ürün Yönetimi</h1>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link href="/admin/banners" className={styles.addButton}>
            Banner'lar
          </Link>
          <Link href="/admin/categories" className={styles.addButton}>
            Kategoriler
          </Link>
          <Link href="/admin/add" className={styles.addButton}>
            + Yeni Ürün Ekle
          </Link>
        </div>
      </div>

      <table className={styles.productTable}>
        <thead>
          <tr>
            <th>Görsel</th>
            <th>Ürün Adı</th>
            <th>Fiyat</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className={styles.productImage}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/60';
                  }}
                />
              </td>
              <td>
                <strong>{product.name}</strong>
                <div style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: '4px' }}>
                  {product.description.substring(0, 50)}...
                </div>
              </td>
              <td>{product.price} TL</td>
              <td>
                <div className={styles.actionButtons}>
                  <Link href={`/admin/edit/${product.id}`} className={styles.editBtn}>
                    Düzenle
                  </Link>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className={styles.deleteBtn}
                  >
                    Sil
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                Henüz hiç ürün eklenmemiş.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
