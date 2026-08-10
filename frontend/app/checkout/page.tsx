"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useApi } from "../lib/useApi";
import { formatPrice } from "../lib/orders";
import styles from "./checkout.module.scss";

export default function CheckoutPage() {
  const { user, loading } = useAuth();
  const { cart, totalPrice, refreshCart } = useCart();
  const router = useRouter();
  const apiFetch = useApi();

  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  const [invoiceRequired, setInvoiceRequired] = useState(false);
  const [invoiceTitle, setInvoiceTitle] = useState("");
  const [taxOffice, setTaxOffice] = useState("");
  const [taxId, setTaxId] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Sipariş verilince sepet boşalır. Bu bayrak olmasaydı yönlendirme
  // tamamlanana kadar ekranda bir an "Sepetiniz boş" yazısı görünürdü.
  const [placed, setPlaced] = useState(false);

  // Giriş yoksa checkout'un anlamı yok.
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  // Ad soyad alanını kullanıcı adıyla ön-doldur (kullanıcı değiştirebilir).
  useEffect(() => {
    if (user) setFullName((current) => current || user.username);
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await apiFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          fullName,
          address,
          city,
          phone,
          note: note.trim() ? note : null,
          invoiceRequired,
          invoiceTitle: invoiceRequired ? invoiceTitle : null,
          taxOffice: invoiceRequired ? taxOffice : null,
          taxId: invoiceRequired ? taxId : null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setPlaced(true);
        // Sepeti backend boşalttı; Header'daki sayaç da güncellensin.
        await refreshCart();
        router.push(`/orders/${data.id}`);
      } else {
        setError(data.message || "Sipariş oluşturulamadı.");
        setSubmitting(false);
      }
    } catch {
      setError("Sunucuya ulaşılamadı.");
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return <div className={styles.info}>Yükleniyor...</div>;
  }

  if (placed) {
    return <div className={styles.info}>Siparişiniz oluşturuluyor...</div>;
  }

  if (!cart) {
    return <div className={styles.info}>Yükleniyor...</div>;
  }

  if (cart.items.length === 0) {
    return (
      <div className={styles.info}>
        Sepetiniz boş. <Link href="/">Alışverişe başla</Link>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Siparişi Tamamla</h1>

      {error && <div className={`${styles.message} ${styles.error}`}>{error}</div>}

      <div className={styles.grid}>
        {/* SOL: teslimat ve fatura bilgileri */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Teslimat Bilgileri</h2>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div>
              <label className={styles.label}>Ad Soyad</label>
              <input
                className={styles.input}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className={styles.label}>Adres</label>
              <textarea
                className={styles.textarea}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Mahalle, sokak, bina ve daire no"
                required
              />
            </div>

            <div className={styles.row}>
              <div>
                <label className={styles.label}>Şehir</label>
                <input
                  className={styles.input}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={styles.label}>Telefon</label>
                <input
                  className={styles.input}
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05XX XXX XX XX"
                  required
                />
              </div>
            </div>

            <div>
              <label className={styles.label}>Sipariş Notu (isteğe bağlı)</label>
              <textarea
                className={styles.textarea}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Kapıda kimse yoksa komşuya bırakabilirsiniz..."
              />
            </div>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={invoiceRequired}
                onChange={(e) => setInvoiceRequired(e.target.checked)}
              />
              Fatura istiyorum
            </label>

            {invoiceRequired && (
              <div className={styles.invoiceBox}>
                <div>
                  <label className={styles.label}>Fatura Başlığı (şirket / isim)</label>
                  <input
                    className={styles.input}
                    value={invoiceTitle}
                    onChange={(e) => setInvoiceTitle(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.row}>
                  <div>
                    <label className={styles.label}>Vergi Dairesi</label>
                    <input
                      className={styles.input}
                      value={taxOffice}
                      onChange={(e) => setTaxOffice(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={styles.label}>TC / Vergi No</label>
                    <input
                      className={styles.input}
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            <button className={styles.button} type="submit" disabled={submitting}>
              {submitting ? "Gönderiliyor..." : `Siparişi Onayla (${formatPrice(totalPrice)})`}
            </button>
          </form>
        </div>

        {/* SAĞ: sipariş özeti */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Sipariş Özeti</h2>

          {cart.items.map((item) => (
            <div key={item.id} className={styles.summaryRow}>
              <div>
                <div className={styles.summaryName}>{item.product.name}</div>
                <div className={styles.summaryQty}>
                  {item.quantity} adet × {formatPrice(item.product.price)}
                </div>
              </div>
              <div className={styles.summaryPrice}>
                {formatPrice(item.product.price * item.quantity)}
              </div>
            </div>
          ))}

          <div className={styles.summaryTotal}>
            <span>Genel Toplam</span>
            <span>{formatPrice(totalPrice)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
