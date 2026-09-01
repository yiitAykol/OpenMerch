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
  stock: number;
};

const PAGE_SIZE = 10;

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Sayfa numarası backend ile aynı dilde: 0 tabanlı.
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const apiFetch = useApi();

  const fetchProducts = async (pageToLoad: number) => {
    try {
      const res = await apiFetch(`/api/products?page=${pageToLoad}&size=${PAGE_SIZE}`);
      if (res.ok) {
        // Yanıt artık düz dizi değil: { content: [...], page: {...} }
        const data = await res.json();
        setProducts(data.content);
        setTotalPages(data.page.totalPages);
        setTotalElements(data.page.totalElements);
      }
    } catch (error) {
      console.error("Ürünler getirilirken hata:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(page);
  }, [page]);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bu ürünü silmek istediğinize emin misiniz?")) {
      return;
    }

    try {
      const res = await apiFetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // Listeden elle çıkarmak yetmez: toplam sayı ve sayfa bölümlemesi
        // sunucuda tutuluyor. Sayfanın son ürünü silindiyse bir önceki sayfaya
        // düşüyoruz, aksi halde boş bir tablo kalırdı.
        if (products.length === 1 && page > 0) {
          setPage(page - 1);
        } else {
          fetchProducts(page);
        }
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
          <Link href="/admin/stock" className={styles.addButton}>
            Stok
          </Link>
          <Link href="/admin/orders" className={styles.addButton}>
            Siparişler
          </Link>
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
            <th>Stok</th>
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
                {/* Tükenmiş ve azalmış ürün listede göze çarpsın; admin hangi
                    ürünü yenilemesi gerektiğini tabloya bakar bakmaz görsün. */}
                <span
                  style={{
                    fontWeight: 600,
                    color:
                      product.stock <= 0 ? "#b91c1c" : product.stock <= 5 ? "#b45309" : "#15803d",
                  }}
                >
                  {product.stock <= 0 ? "Tükendi" : product.stock}
                </span>
              </td>
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
              <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                Henüz hiç ürün eklenmemiş.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            marginTop: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 0}
            className={styles.editBtn}
          >
            ←
          </button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={styles.editBtn}
              style={{
                fontWeight: i === page ? 700 : 400,
                opacity: i === page ? 1 : 0.6,
              }}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages - 1}
            className={styles.editBtn}
          >
            →
          </button>

          <span style={{ marginLeft: "0.75rem", color: "#6c757d", fontSize: "0.9rem" }}>
            {totalElements} ürün
          </span>
        </div>
      )}
    </div>
  );
}
