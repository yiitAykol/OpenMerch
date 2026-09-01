"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../admin.module.scss";
import { useApi } from "../../lib/useApi";

type Product = {
  id: number;
  name: string;
  category: string;
  imageUrl: string;
  stock: number;
};

const PAGE_SIZE = 10;

// Liste alfabetiktir. İkinci ölçüt (id) süs değil: "sort=name,asc" tek başına
// benzersiz bir sıra ÜRETMEZ — aynı isimli iki ürün varsa aralarındaki sıra
// belirsizdir ve sayfa değiştirildiğinde ürün tekrarlanabilir ya da hiç
// görünmeyebilir. id eşitliği bozarak sıralamayı kararlı hale getirir.
const SORT = "sort=name,asc&sort=id,asc";

// Hazır kovalar. min/max backend ile aynı dilde: iki uç da dahil, null = sınır yok.
const BUCKETS: { key: string; label: string; min: number | null; max: number | null }[] = [
  { key: "all", label: "Tümü", min: null, max: null },
  { key: "out", label: "Tükendi", min: null, max: 0 },
  { key: "critical", label: "Kritik (≤5)", min: null, max: 5 },
  { key: "low", label: "Az (≤20)", min: null, max: 20 },
  { key: "in", label: "Stokta var", min: 1, max: null },
];

// Satır altında gösterilen tek seferlik geri bildirim.
type RowMessage = { id: number; text: string; ok: boolean };

export default function AdminStockPage() {
  const apiFetch = useApi();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Sayfa numarası backend ile aynı dilde: 0 tabanlı.
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Satır başına yazılmakta olan fark. Sayı değil METİN tutuluyor: kullanıcı
  // "-3" yazarken önce tek başına "-" karakteri oluşur, bu geçerli bir sayı
  // değildir ve sayı olarak tutulsaydı tuş anında silinirdi.
  const [deltas, setDeltas] = useState<Record<number, string>>({});
  // Kaydedilmekte olan satır; çift tıklamayı engeller.
  const [savingId, setSavingId] = useState<number | null>(null);
  const [rowMessage, setRowMessage] = useState<RowMessage | null>(null);

  // Uygulanmış filtre — listeyi bu belirler. null = o uçta sınır yok.
  const [range, setRange] = useState<{ min: number | null; max: number | null }>({
    min: null,
    max: null,
  });
  // Serbest aralık kutularındaki taslak metin. Uygulanmış filtreden ayrı tutuluyor
  // ki her tuşa basışta yeni bir istek gitmesin; "Uygula" ile range'e aktarılır.
  const [minDraft, setMinDraft] = useState("");
  const [maxDraft, setMaxDraft] = useState("");
  const [filterError, setFilterError] = useState<string | null>(null);

  const fetchProducts = async (pageToLoad: number, active: typeof range) => {
    try {
      const params = new URLSearchParams();
      params.set("page", String(pageToLoad));
      params.set("size", String(PAGE_SIZE));
      // Sınır yoksa parametre hiç GÖNDERİLMEZ. Boş string göndermek olmazdı:
      // backend'de Integer alanına boş değer bağlanamaz ve istek 400 dönerdi.
      if (active.min !== null) params.set("minStock", String(active.min));
      if (active.max !== null) params.set("maxStock", String(active.max));

      const res = await apiFetch(`/api/products?${params.toString()}&${SORT}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.content);
        setTotalPages(data.page.totalPages);
        setTotalElements(data.page.totalElements);
      } else {
        let message = "Ürünler getirilemedi.";
        try {
          const data = await res.json();
          if (data?.message) message = data.message;
        } catch {
          // Gövdesiz yanıt — varsayılan mesajla devam.
        }
        setFilterError(message);
        setProducts([]);
        setTotalPages(0);
        setTotalElements(0);
      }
    } catch (error) {
      console.error("Ürünler getirilirken hata:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(page, range);
  }, [page, range]);

  // Uygulanmış filtre hangi kovaya denk geliyor? Hiçbirine uymuyorsa serbest aralıktır.
  const activeBucket =
    BUCKETS.find((b) => b.min === range.min && b.max === range.max)?.key ?? "custom";

  const applyBucket = (bucket: (typeof BUCKETS)[number]) => {
    setFilterError(null);
    setRowMessage(null);
    // Kutular da kovaya göre dolsun; kullanıcı "Kritik"ten sonra sınırı elle
    // daraltmak isterse sıfırdan yazmak zorunda kalmaz.
    setMinDraft(bucket.min === null ? "" : String(bucket.min));
    setMaxDraft(bucket.max === null ? "" : String(bucket.max));
    // Sayfa sıfırlanmalı: 4. sayfadayken filtre daraltılırsa o sayfa artık
    // var olmayabilir ve kullanıcı sebepsiz boş bir tabloya bakardı.
    setPage(0);
    setRange({ min: bucket.min, max: bucket.max });
  };

  const applyCustomRange = () => {
    setRowMessage(null);

    const parseBound = (raw: string): number | null | "invalid" => {
      const text = raw.trim();
      if (text === "") return null;
      const value = Number(text);
      if (!Number.isInteger(value) || value < 0) return "invalid";
      return value;
    };

    const min = parseBound(minDraft);
    const max = parseBound(maxDraft);

    if (min === "invalid" || max === "invalid") {
      setFilterError("Sınırlar 0 veya daha büyük tam sayı olmalıdır.");
      return;
    }
    // Backend de bu kontrolü yapıyor; buradaki kopya boşuna gidip gelen bir
    // isteği önlemek içindir, kuralın sahibi backend'dir.
    if (min !== null && max !== null && min > max) {
      setFilterError("Alt sınır üst sınırdan büyük olamaz.");
      return;
    }

    setFilterError(null);
    setPage(0);
    setRange({ min, max });
  };

  // Girilen farkı sayıya çevirir. Boşsa / geçersizse null döner — buton bu
  // sayede pasif kalır ve sunucuya anlamsız istek gitmez.
  const parseDelta = (id: number): number | null => {
    const raw = (deltas[id] ?? "").trim();
    if (raw === "" || raw === "-" || raw === "+") return null;
    const value = Number(raw);
    if (!Number.isInteger(value) || value === 0) return null;
    return value;
  };

  const setDelta = (id: number, value: string) => {
    setDeltas((current) => ({ ...current, [id]: value }));
  };

  // Hazır düğmeler (+1 / -1 gibi) mevcut girdinin ÜSTÜNE ekler; böylece
  // "+1"e üç kez basmak "+3" eder, her basış ayrı bir istek atmaz.
  const bumpDelta = (id: number, amount: number) => {
    const current = parseDelta(id) ?? 0;
    const next = current + amount;
    setDelta(id, next === 0 ? "" : String(next));
  };

  const handleAdjust = async (id: number) => {
    const delta = parseDelta(id);
    if (delta === null) return;

    setSavingId(id);
    setRowMessage(null);
    try {
      const res = await apiFetch(`/api/products/${id}/stock`, {
        method: "POST",
        body: JSON.stringify({ delta }),
      });

      if (res.ok) {
        const updated = await res.json();
        // Burada listeyi yeniden çekmiyoruz — /admin'deki silme işleminin
        // aksine satır sayısı ve sayfa bölümlemesi değişmedi, yalnızca bir
        // hücrenin değeri değişti. Üstelik sunucunun döndüğü stok, araya giren
        // bir satış varsa bizim hesabımızdan farklı olabilir: doğru değer
        // yanıttaki değerdir, "eski + delta" değil.
        setProducts((current) =>
          current.map((p) => (p.id === id ? { ...p, stock: updated.stock } : p))
        );
        setDelta(id, "");
        setRowMessage({ id, text: `Stok ${updated.stock} olarak güncellendi.`, ok: true });
      } else {
        // 400 gövdesinde sebep var (stok yetersiz, delta 0, doğrulama hatası).
        // 401/403 gövdesizdir; o yüzden json() bir try içinde.
        let message = "Stok güncellenemedi.";
        try {
          const data = await res.json();
          if (data?.message) message = data.message;
        } catch {
          // Gövdesiz yanıt — varsayılan mesajla devam.
        }
        setRowMessage({ id, text: message, ok: false });
      }
    } catch (error) {
      console.error("Stok güncellenirken hata:", error);
      setRowMessage({ id, text: "Bir hata oluştu.", ok: false });
    } finally {
      setSavingId(null);
    }
  };

  const stockColor = (stock: number) =>
    stock <= 0 ? "#b91c1c" : stock <= 5 ? "#b45309" : "#15803d";

  if (isLoading) {
    return <div className={styles.container}>Yükleniyor...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Stok Yönetimi</h1>
        <Link href="/admin" className={styles.addButton}>
          ← Ürünler
        </Link>
      </div>

      <p className={styles.stockHint}>
        Stok <strong>fark</strong> olarak yazılır: <code>10</code> eklemek,{" "}
        <code>-3</code> düşürmek demektir. Böylece siz sayfayı açtıktan sonra gelen bir
        sipariş silinmez.
      </p>

      <div className={styles.stockFilters}>
        <div className={styles.stockBuckets}>
          {BUCKETS.map((bucket) => (
            <button
              key={bucket.key}
              type="button"
              className={
                activeBucket === bucket.key ? styles.bucketBtnActive : styles.bucketBtn
              }
              onClick={() => applyBucket(bucket)}
            >
              {bucket.label}
            </button>
          ))}
        </div>

        <div className={styles.stockRange}>
          <span className={styles.stockRangeLabel}>Aralık</span>
          <input
            type="text"
            inputMode="numeric"
            className={styles.stockInput}
            placeholder="min"
            value={minDraft}
            onChange={(e) => setMinDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyCustomRange();
            }}
          />
          <span>–</span>
          <input
            type="text"
            inputMode="numeric"
            className={styles.stockInput}
            placeholder="max"
            value={maxDraft}
            onChange={(e) => setMaxDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyCustomRange();
            }}
          />
          <button type="button" className={styles.detailBtn} onClick={applyCustomRange}>
            Uygula
          </button>
          {activeBucket === "custom" && (
            <span className={styles.stockRangeActive}>
              {range.min ?? 0} – {range.max ?? "∞"} arası
            </span>
          )}
        </div>
      </div>

      {filterError && <div className={styles.stockFilterError}>{filterError}</div>}

      <table className={styles.productTable}>
        <thead>
          <tr>
            <th>Ürün</th>
            <th>Mevcut Stok</th>
            <th>Stok Düzelt</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const delta = parseDelta(product.id);
            const isSaving = savingId === product.id;
            const message = rowMessage?.id === product.id ? rowMessage : null;

            return (
              <tr key={product.id}>
                <td>
                  <div className={styles.stockProduct}>
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className={styles.productImage}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://via.placeholder.com/60";
                      }}
                    />
                    <div>
                      <strong>{product.name}</strong>
                      <div className={styles.stockCategory}>{product.category}</div>
                    </div>
                  </div>
                </td>

                <td>
                  <span style={{ fontWeight: 700, color: stockColor(product.stock) }}>
                    {product.stock <= 0 ? "Tükendi" : product.stock}
                  </span>
                  {/* Sonucu önden göstermek, yanlış işareti (+/-) kaydetmeden
                      fark etmeyi sağlar. */}
                  {delta !== null && (
                    <span className={styles.stockPreview}>
                      → {Math.max(product.stock + delta, 0)}
                    </span>
                  )}
                </td>

                <td>
                  <div className={styles.stockControls}>
                    <button
                      type="button"
                      className={styles.detailBtn}
                      onClick={() => bumpDelta(product.id, -1)}
                      disabled={isSaving}
                    >
                      −1
                    </button>

                    <input
                      type="text"
                      inputMode="numeric"
                      className={styles.stockInput}
                      placeholder="0"
                      value={deltas[product.id] ?? ""}
                      onChange={(e) => setDelta(product.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAdjust(product.id);
                      }}
                      disabled={isSaving}
                    />

                    <button
                      type="button"
                      className={styles.detailBtn}
                      onClick={() => bumpDelta(product.id, 1)}
                      disabled={isSaving}
                    >
                      +1
                    </button>

                    <button
                      type="button"
                      className={styles.stockSaveBtn}
                      onClick={() => handleAdjust(product.id)}
                      disabled={delta === null || isSaving}
                    >
                      {isSaving ? "..." : "Kaydet"}
                    </button>
                  </div>

                  {message && (
                    <div
                      className={styles.stockMessage}
                      style={{ color: message.ok ? "#15803d" : "#c92a2a" }}
                    >
                      {message.text}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}

          {products.length === 0 && (
            <tr>
              <td colSpan={3} style={{ textAlign: "center", padding: "2rem" }}>
                {/* Filtre varken "hiç ürün yok" demek yanıltıcı olurdu:
                    kullanıcı katalogun boş olduğunu sanardı. */}
                {activeBucket === "all"
                  ? "Henüz hiç ürün eklenmemiş."
                  : "Bu stok aralığında ürün yok."}
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
          <button onClick={() => setPage(page - 1)} disabled={page === 0} className={styles.detailBtn}>
            ←
          </button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={styles.detailBtn}
              style={{ fontWeight: i === page ? 700 : 400, opacity: i === page ? 1 : 0.6 }}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages - 1}
            className={styles.detailBtn}
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
