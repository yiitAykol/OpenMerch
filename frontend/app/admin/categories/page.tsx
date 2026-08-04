"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../admin.module.scss";
import { useApi } from "../../lib/useApi";

type Category = { id: number; name: string };

export default function CategoriesPage() {
  const apiFetch = useApi();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories`);
      if (res.ok) {
        setCategories(await res.json());
      }
    } catch (error) {
      console.error("Kategoriler getirilirken hata:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await apiFetch("/api/categories", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (res.ok) {
        const created = await res.json();
        setCategories(prev => [...prev, created]);
        setNewName("");
      } else {
        // Backend "Bu kategori zaten var" gibi mesaj döndürür
        const msg = await res.text();
        alert(msg || "Kategori eklenemedi.");
      }
    } catch (error) {
      console.error("Hata:", error);
      alert("Sunucuya ulaşılamadı.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bu kategoriyi silmek istediğinize emin misiniz?")) {
      return;
    }

    try {
      const res = await apiFetch(`/api/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCategories(prev => prev.filter(c => c.id !== id));
      } else {
        alert("Silme işlemi başarısız oldu.");
      }
    } catch (error) {
      console.error("Kategori silinirken hata:", error);
      alert("Bir hata oluştu.");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Kategori Yönetimi</h1>
        <Link href="/admin" className={styles.addButton}>
          ← Ürünlere Dön
        </Link>
      </div>

      <div className={styles.formContainer}>
        <form onSubmit={handleAdd}>
          <div className={styles.formGroup}>
            <label htmlFor="newCategory">Yeni Kategori Adı</label>
            <input
              type="text"
              id="newCategory"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Örn: Tatlılar"
            />
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.saveBtn} disabled={isSubmitting}>
              {isSubmitting ? "Ekleniyor..." : "Kategori Ekle"}
            </button>
          </div>
        </form>
      </div>

      <table className={styles.productTable} style={{ marginTop: "2rem" }}>
        <thead>
          <tr>
            <th>Kategori Adı</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={2} style={{ textAlign: "center", padding: "2rem" }}>
                Yükleniyor...
              </td>
            </tr>
          ) : (
            categories.map((cat) => (
              <tr key={cat.id}>
                <td><strong>{cat.name}</strong></td>
                <td>
                  <div className={styles.actionButtons}>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className={styles.deleteBtn}
                    >
                      Sil
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
          {!isLoading && categories.length === 0 && (
            <tr>
              <td colSpan={2} style={{ textAlign: "center", padding: "2rem" }}>
                Henüz hiç kategori eklenmemiş.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
