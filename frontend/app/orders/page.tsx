"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../lib/useApi";
import { OrderType, formatDate, formatPrice, statusLabel } from "../lib/orders";
import styles from "./orders.module.scss";

export default function OrdersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const apiFetch = useApi();

  const [orders, setOrders] = useState<OrderType[] | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;

    async function fetchOrders() {
      try {
        const res = await apiFetch("/api/orders");
        if (res.ok) {
          setOrders(await res.json());
        } else {
          setOrders([]);
        }
      } catch (error) {
        console.error("Siparişler getirilirken hata oluştu:", error);
        setOrders([]);
      }
    }

    fetchOrders();
  }, [user]);

  if (loading || !user || orders === null) {
    return <div className={styles.info}>Yükleniyor...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className={styles.info}>
        Henüz siparişiniz yok. <Link href="/">Alışverişe başla</Link>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Siparişlerim</h1>

      <div className={styles.list}>
        {orders.map((order) => {
          const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

          return (
            <div key={order.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <div className={styles.orderNo}>Sipariş #{order.id}</div>
                  <div className={styles.date}>{formatDate(order.createdAt)}</div>
                </div>
                <span className={styles.badge} data-status={order.status}>
                  {statusLabel(order.status)}
                </span>
              </div>

              <div className={styles.summary}>
                {order.items.map((item) => item.productName).join(", ")}
              </div>

              <div className={styles.cardFooter}>
                <span className={styles.summary}>{itemCount} ürün</span>
                <span className={styles.total}>{formatPrice(order.totalAmount)}</span>
                <Link href={`/orders/${order.id}`} className={styles.detailLink}>
                  Detayı gör →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
