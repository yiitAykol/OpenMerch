"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import styles from "../auth/auth.module.scss";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await login(email, password);
    setLoading(false);

    if (res.ok) {
      router.push("/");
    } else {
      setError(res.message || "Giriş başarısız oldu.");
      // Hesap doğrulanmamışsa doğrulama ekranına yönlendir.
      if (res.message?.includes("doğrulanmamış")) {
        router.push(`/verify?email=${encodeURIComponent(email)}`);
      }
    }
  };

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Giriş Yap</h1>
      <p className={styles.subtitle}>Hesabına giriş yaparak devam et.</p>

      {error && <div className={`${styles.message} ${styles.error}`}>{error}</div>}

      <form className={styles.form} onSubmit={handleSubmit}>
        <div>
          <label className={styles.label}>E-posta</label>
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={styles.label}>Şifre</label>
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>
      </form>

      <div className={styles.footer}>
        Hesabın yok mu? <Link href="/register">Üye ol</Link>
      </div>
    </div>
  );
}
