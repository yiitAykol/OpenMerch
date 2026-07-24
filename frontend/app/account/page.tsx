"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function AccountPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  // Şifre değiştirme formu için state'ler
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);


  // loading bittiğinde ve kullanıcı yoksa (giriş yapılmamışsa) login'e yönlendir
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  // Eğer sayfa hala yükleniyorsa veya kullanıcı yönlendirme (redirect) aşamasındaysa boş ekran veya yükleniyor göster
  if (loading || !user) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Yükleniyor...</div>;
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage("");

    try {
      const token = localStorage.getItem("sb_token");
      const res = await fetch("http://localhost:8080/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });

      const data = await res.json();

      if (res.ok) {
        setPasswordMessage("Şifreniz başarıyla güncellendi!");
        setOldPassword("");
        setNewPassword("");
        // 2 saniye sonra formu kapat
        setTimeout(() => setShowPasswordForm(false), 2000);
      } else {
        setPasswordMessage(data.message || "Bir hata oluştu.");
      }
    } catch (err) {
      setPasswordMessage("Sunucuya ulaşılamadı.");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const token = localStorage.getItem("sb_token");
      const res = await fetch("http://localhost:8080/api/auth/delete-account", {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        logout();
        router.push("/");
      } else {
        alert("Hesap silinirken bir hata oluştu.");
      }
    } catch (err) {
      console.error("Hesap silme hatası:", err);
    }
  };

  // Kullanıcı giriş yapmışsa arayüzü göster
  return (
    <div style={{ maxWidth: "600px", margin: "40px auto", padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
      <h2 style={{ marginBottom: "10px" }}>Hesabım</h2>
      <p style={{ color: "#666", marginBottom: "20px" }}>Hesap detaylarınızı aşağıda görebilirsiniz.</p>

      <div style={{ background: "#f9f9f9", padding: "15px", borderRadius: "5px", marginBottom: "30px" }}>
        <div style={{ marginBottom: "10px" }}>
          <strong>Kullanıcı Adı:</strong> {user.username}
        </div>
        <div style={{ marginBottom: "10px" }}>
          <strong>E-posta:</strong> {user.email}
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button
          onClick={() => setShowPasswordForm(!showPasswordForm)}
          style={{ padding: "10px 20px", background: "#333", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}
        >
          {showPasswordForm ? "İptal Et" : "Şifre Değiştir"}
        </button>

        <button
          onClick={() => setShowDeleteModal(true)}
          style={{ padding: "10px 20px", background: "#d9534f", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}
        >
          Hesabımı Sil
        </button>

      </div>

      {showPasswordForm && (
        <form onSubmit={handleChangePassword} style={{ background: "#f0f0f0", padding: "20px", borderRadius: "8px", marginTop: "20px" }}>
          <h3 style={{ marginBottom: "15px" }}>Şifre Değiştir</h3>

          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>Eski Şifre:</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>Yeni Şifre:</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
            />
          </div>

          <button type="submit" style={{ padding: "10px 20px", background: "#0070f3", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
            Kaydet
          </button>

          {passwordMessage && (
            <p style={{ marginTop: "15px", color: passwordMessage.includes("başarı") ? "green" : "red", fontWeight: "bold" }}>
              {passwordMessage}
            </p>
          )}
        </form>
      )}

      {showDeleteModal && (
        <div style={{
          position: "fixed", top: "0", left: "0", right: "0", bottom: "0",
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", maxWidth: "400px", textAlign: "center", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
            <h3 style={{ marginTop: 0, color: "#d9534f" }}>Hesabı Sil</h3>
            <p style={{ color: "#333", marginBottom: "20px" }}>
              Hesabınızı kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz!
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{ padding: "8px 16px", background: "#ccc", color: "black", border: "none", borderRadius: "4px", cursor: "pointer" }}
              >
                İptal
              </button>
              <button
                onClick={handleDeleteAccount}
                style={{ padding: "8px 16px", background: "#d9534f", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
