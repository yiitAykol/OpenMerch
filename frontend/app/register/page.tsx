"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import styles from "../auth/auth.module.scss";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await register(username, email, password);
    setLoading(false);

    if (res.ok) {
      // Kayıt başarılı -> doğrulama ekranına e-posta ile yönlendir.
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    } else {
      setError(res.message || "Kayıt başarısız oldu.");
    }
  };

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Üye Ol</h1>
      <p className={styles.subtitle}>Hesap oluştur, e-postana doğrulama kodu gönderelim.</p>

      {error && <div className={`${styles.message} ${styles.error}`}>{error}</div>}

      <form className={styles.form} onSubmit={handleSubmit}>
        <div>
          <label className={styles.label}>Kullanıcı Adı</label>
          <input
            className={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
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
          <label className={styles.label}>Şifre (en az 6 karakter)</label>
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>
        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? "Gönderiliyor..." : "Üye Ol"}
        </button>
      </form>

      <div className={styles.footer}>
        Zaten hesabın var mı? <Link href="/login">Giriş yap</Link>
      </div>
    </div>
  );
}
