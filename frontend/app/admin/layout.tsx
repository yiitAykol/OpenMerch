"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;                              // kimlik henüz belli değil, bekle
    if (!user) router.replace("/login");              // giriş yok
    else if (user.role !== "ADMIN") router.replace("/"); // giriş var ama yetki yok
  }, [loading, user, router]);

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Yükleniyor...</div>;
  }

  // Yönlendirme birkaç ms sürer; o arada paneli göstermemek için hiçbir şey basma.
  if (!user || user.role !== "ADMIN") {
    return null;
  }

  return <>{children}</>;
}
