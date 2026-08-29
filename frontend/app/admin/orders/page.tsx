"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import styles from "../admin.module.scss";
import { useApi } from "../../lib/useApi";
import {
  OrderType,
  ORDER_STATUS_OPTIONS,
  formatDate,
  formatPrice,
  statusLabel,
} from "../../lib/orders";

export default function AdminOrdersPage() {
  const apiFetch = useApi();

  const [orders, setOrders] = useState<OrderType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Detayı açık olan siparişin id'si (aynı anda tek satır açılır).
  const [openId, setOpenId] = useState<number | null>(null);
  // Durumu güncellenmekte olan sipariş; çift tıklamayı engeller.
  const [savingId, setSavingId] = useState<number | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await apiFetch("/api/admin/orders");
      if (res.ok) {
        setOrders(await res.json());
      }
    } catch (error) {
      console.error("Siparişler getirilirken hata:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (id: number, status: string) => {
    setSavingId(id);
    try {
      const res = await apiFetch(`/api/admin/orders/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        const updated = await res.json();
        // Yalnızca değişen siparişi yerinde güncelle; listeyi baştan çekmeye gerek yok.
        setOrders((current) =>
          current.map((order) => (order.id === id ? { ...order, status: updated.status } : order))
        );
      } else {
        // 400 gövdesinde sebep var (ör. sipariş zaten iptal edilmiş).
        // 401/403 gövdesizdir; o yüzden json() bir try içinde.
        let message = "Sipariş durumu güncellenemedi.";
        try {
          const data = await res.json();
          if (data?.message) message = data.message;
        } catch {
          // Gövdesiz yanıt — varsayılan mesajla devam.
        }
        alert(message);
      }
    } catch (error) {
      console.error("Durum güncellenirken hata:", error);
      alert("Bir hata oluştu.");
    } finally {
      setSavingId(null);
    }
  };

  if (isLoading) {
    return <div className={styles.container}>Yükleniyor...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Sipariş Yönetimi</h1>
        <Link href="/admin" className={styles.addButton}>
          ← Ürünler
        </Link>
      </div>

      <table className={styles.productTable}>
        <thead>
          <tr>
            <th>Sipariş</th>
            <th>Müşteri</th>
            <th>Tutar</th>
            <th>Durum</th>
            <th>Detay</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            // Bir sipariş iki satır üretebiliyor (özet + açılan detay), o yüzden
            // key listenin en dış öğesi olan Fragment'a veriliyor.
            <Fragment key={order.id}>
              <tr>
                <td>
                  <strong>#{order.id}</strong>
                  <div style={{ fontSize: "0.85rem", color: "#6c757d", marginTop: "4px" }}>
                    {formatDate(order.createdAt)}
                  </div>
                </td>
                <td>
                  <strong>{order.fullName}</strong>
                  <div style={{ fontSize: "0.85rem", color: "#6c757d", marginTop: "4px" }}>
                    {order.customerEmail}
                  </div>
                </td>
                <td>{formatPrice(order.totalAmount)}</td>
                <td>
                  <select
                    className={styles.statusSelect}
                    value={order.status}
                    disabled={savingId === order.id || order.status === "CANCELLED"}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                  >
                    {ORDER_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {statusLabel(status)}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    className={styles.detailBtn}
                    onClick={() => setOpenId(openId === order.id ? null : order.id)}
                  >
                    {openId === order.id ? "Gizle" : "Göster"}
                  </button>
                </td>
              </tr>

              {openId === order.id && (
                <tr>
                  <td colSpan={5}>
                    <div className={styles.orderDetail}>
                      <div>
                        <div className={styles.detailTitle}>Ürünler</div>
                        {order.items.map((item) => (
                          <div key={item.id} className={styles.detailItem}>
                            <span>
                              {item.productName} × {item.quantity}
                            </span>
                            <strong>{formatPrice(item.subtotal)}</strong>
                          </div>
                        ))}
                      </div>

                      <div>
                        <div className={styles.detailTitle}>Teslimat</div>
                        <div className={styles.detailText}>
                          {order.fullName}
                          {"\n"}
                          {order.address}
                          {"\n"}
                          {order.city} · {order.phone}
                        </div>

                        {order.note && (
                          <>
                            <div className={styles.detailTitle} style={{ marginTop: "1rem" }}>
                              Sipariş Notu
                            </div>
                            <div className={styles.detailText}>{order.note}</div>
                          </>
                        )}

                        {order.invoiceRequired && (
                          <>
                            <div className={styles.detailTitle} style={{ marginTop: "1rem" }}>
                              Fatura
                            </div>
                            <div className={styles.detailText}>
                              {order.invoiceTitle}
                              {"\n"}
                              {order.taxOffice ? `${order.taxOffice} · ` : ""}
                              {order.taxId}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}

          {orders.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: "center", padding: "2rem" }}>
                Henüz hiç sipariş verilmemiş.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
