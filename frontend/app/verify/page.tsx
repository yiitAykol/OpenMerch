"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import styles from "../auth/auth.module.scss";

function VerifyForm() {
  const { verify, resend } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    const res = await verify(email, code);
    setLoading(false);

    if (res.ok) {
      // Doğrulama başarılı -> token kaydedildi, ana sayfaya git.
      router.push("/");
    } else {
      setError(res.message || "Doğrulama başarısız oldu.");
    }
  };

  const handleResend = async () => {
    setError("");
    setInfo("");
    const res = await resend(email);
    if (res.ok) setInfo(res.message || "Yeni kod gönderildi.");
    else setError(res.message || "Kod gönderilemedi.");
  };

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>E-postanı Doğrula</h1>
      <p className={styles.subtitle}>
        <strong>{email}</strong> adresine gönderilen 6 haneli kodu gir.
      </p>

      {error && <div className={`${styles.message} ${styles.error}`}>{error}</div>}
      {info && <div className={`${styles.message} ${styles.success}`}>{info}</div>}

      <form className={styles.form} onSubmit={handleSubmit}>
        <div>
          <label className={styles.label}>Doğrulama Kodu</label>
          <input
            className={styles.input}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            required
          />
        </div>
        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? "Doğrulanıyor..." : "Doğrula"}
        </button>
      </form>

      <div className={styles.footer}>
        Kod gelmedi mi?{" "}
        <button type="button" className={styles.linkButton} onClick={handleResend}>
          Tekrar gönder
        </button>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className={styles.wrapper}>Yükleniyor...</div>}>
      <VerifyForm />
    </Suspense>
  );
}
