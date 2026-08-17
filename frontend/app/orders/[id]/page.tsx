"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../lib/useApi";
import { OrderType, canCancel, formatDate, formatPrice, statusLabel } from "../../lib/orders";
import styles from "../orders.module.scss";

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id;

  const { user, loading } = useAuth();
  const router = useRouter();
  const apiFetch = useApi();

  const [order, setOrder] = useState<OrderType | null>(null);
  const [error, setError] = useState("");

  // İptal akışının üç ayrı durumu var:
  // confirming → onay kutusu açık mı (geri dönüşü olmayan işlem, tek tıkla olmaz)
  // cancelling → istek uçuyor mu (butonu kilitler, çift istek gitmesin)
  // cancelError → backend reddettiyse sebebi
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || !orderId) return;

    async function fetchOrder() {
      try {
        const res = await apiFetch(`/api/orders/${orderId}`);

        if (res.ok) {
          setOrder(await res.json());
        } else if (res.status === 403) {
          // Backend sahiplik kontrolü: başkasının siparişi.
          setError("Bu siparişi görüntüleme yetkiniz yok.");
        } else if (res.status === 404) {
          setError("Sipariş bulunamadı.");
        } else {
          setError("Sipariş yüklenemedi.");
        }
      } catch (err) {
        console.error("Sipariş getirilirken hata oluştu:", err);
        setError("Sunucuya ulaşılamadı.");
      }
    }

    fetchOrder();
  }, [user, orderId]);

  const handleCancel = async () => {
    setCancelError("");
    setCancelling(true);

    try {
      const res = await apiFetch(`/api/orders/${orderId}/cancel`, { method: "PUT" });

      if (res.ok) {
        // Backend güncel siparişi döndürüyor; state'e koyunca rozet ve buton
        // kendiliğinden "İptal Edildi"ye geçer, sayfayı yenilemeye gerek kalmaz.
        setOrder(await res.json());
        setConfirming(false);
      } else {
        // 400 gövdesinde sebep var (ör. bu arada admin kargoya vermiş olabilir).
        // 401/403 gövdesizdir; o yüzden json() bir try içinde.
        let message = "Sipariş iptal edilemedi.";
        try {
          const data = await res.json();
          if (data?.message) message = data.message;
        } catch {
          // Gövdesiz yanıt — varsayılan mesajla devam.
        }
        setCancelError(message);
      }
    } catch (err) {
      console.error("Sipariş iptal edilirken hata oluştu:", err);
      setCancelError("Sunucuya ulaşılamadı.");
    } finally {
      // Başarıda da hatada da butonun kilidi açılmalı.
      setCancelling(false);
    }
  };

  if (loading || !user) {
    return <div className={styles.info}>Yükleniyor...</div>;
  }

  if (error) {
    return (
      <div className={styles.info}>
        {error} <Link href="/orders">Siparişlerime dön</Link>
      </div>
    );
  }

  if (!order) {
    return <div className={styles.info}>Yükleniyor...</div>;
  }

  return (
    <div className={styles.wrapper}>
      <Link href="/orders" className={styles.backLink}>
        ← Siparişlerim
      </Link>

      <div className={styles.cardHeader}>
        <div>
          <h1 className={styles.title} style={{ marginBottom: 4 }}>
            Sipariş #{order.id}
          </h1>
          <div className={styles.date}>{formatDate(order.createdAt)}</div>
        </div>
        <span className={styles.badge} data-status={order.status}>
          {statusLabel(order.status)}
        </span>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Ürünler</h2>

        {order.items.map((item) => (
          <div key={item.id} className={styles.itemRow}>
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.productName} className={styles.thumb} />
            ) : (
              <div className={styles.thumbPlaceholder} />
            )}

            <div className={styles.itemInfo}>
              {/* Ürün silinmiş olabilir; link yine de kurulur, ürün yoksa detay
                  sayfası "bulunamadı" der. Sipariş kaydı bundan etkilenmez. */}
              {item.productId ? (
                <Link href={`/products/${item.productId}`} className={styles.itemName}>
                  {item.productName}
                </Link>
              ) : (
                <span className={styles.itemName}>{item.productName}</span>
              )}
              <div className={styles.itemMeta}>
                {item.quantity} adet × {formatPrice(item.unitPrice)}
              </div>
            </div>

            <div className={styles.itemSubtotal}>{formatPrice(item.subtotal)}</div>
          </div>
        ))}

        <div className={styles.grandTotal}>
          <span>Genel Toplam</span>
          <span>{formatPrice(order.totalAmount)}</span>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Teslimat Bilgileri</h2>

        <div className={styles.infoGrid}>
          <div>
            <div className={styles.infoLabel}>Ad Soyad</div>
            <div className={styles.infoValue}>{order.fullName}</div>
          </div>
          <div>
            <div className={styles.infoLabel}>Telefon</div>
            <div className={styles.infoValue}>{order.phone}</div>
          </div>
          <div>
            <div className={styles.infoLabel}>Şehir</div>
            <div className={styles.infoValue}>{order.city}</div>
          </div>
          <div>
            <div className={styles.infoLabel}>Adres</div>
            <div className={styles.infoValue}>{order.address}</div>
          </div>
          {order.note && (
            <div>
              <div className={styles.infoLabel}>Sipariş Notu</div>
              <div className={styles.infoValue}>{order.note}</div>
            </div>
          )}
        </div>
      </div>

      {order.invoiceRequired && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Fatura Bilgileri</h2>

          <div className={styles.infoGrid}>
            <div>
              <div className={styles.infoLabel}>Fatura Başlığı</div>
              <div className={styles.infoValue}>{order.invoiceTitle}</div>
            </div>
            <div>
              <div className={styles.infoLabel}>TC / Vergi No</div>
              <div className={styles.infoValue}>{order.taxId}</div>
            </div>
            {order.taxOffice && (
              <div>
                <div className={styles.infoLabel}>Vergi Dairesi</div>
                <div className={styles.infoValue}>{order.taxOffice}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* İptal bölümü yalnızca iptal edilebilir durumlarda görünür. Bu bir
          kolaylıktır, güvenlik değil: kural backend'de de var, buradaki kontrol
          kaldırılsa bile kargodaki bir sipariş iptal edilemez. */}
      {canCancel(order.status) && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Siparişi İptal Et</h2>

          {!confirming ? (
            <>
              <p className={styles.summary}>
                Siparişinizi kargoya verilene kadar iptal edebilirsiniz.
              </p>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setConfirming(true)}
              >
                Siparişi İptal Et
              </button>
            </>
          ) : (
            <>
              <p className={styles.confirmText}>
                Bu işlem geri alınamaz. #{order.id} numaralı sipariş iptal edilsin mi?
              </p>
              <div className={styles.confirmRow}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling ? "İptal ediliyor..." : "Evet, iptal et"}
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => {
                    setConfirming(false);
                    setCancelError("");
                  }}
                  disabled={cancelling}
                >
                  Vazgeç
                </button>
              </div>
            </>
          )}

          {cancelError && <div className={styles.cancelError}>{cancelError}</div>}
        </div>
      )}
    </div>
  );
}
