"use client";

import Link from "next/link";
import styles from "../layout.module.scss";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState, useRef } from "react";
import { title } from "process";


export default function Header() {
  const { totalItems } = useCart();
  const { user, logout, loading } = useAuth();
  const [isFlashing, setIsFlashing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isCartFlashing, setIsCartFlashing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFavoriteAdded = () => {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 300); // 300ms sonra eski haline döner
    };

    const handleCartAdded = () => {
      setIsCartFlashing(true);
      setTimeout(() => setIsCartFlashing(false), 300);
    };

    window.addEventListener("favoriteAdded", handleFavoriteAdded);
    window.addEventListener("cartAdded", handleCartAdded);

    return () => {
      window.removeEventListener("favoriteAdded", handleFavoriteAdded);
      window.removeEventListener("cartAdded", handleCartAdded);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className={styles.nav}>

      {/* ÜST SATIR: LOGO ORTADA, İKONLAR SAĞ KÖŞEDE */}
      <div className={styles.topRow}>
        <div className={styles.leftPlaceholder}></div>

        <div className={styles.logoContainer}>
          <Link href="/" className={styles.logoLink}>
            <img src="/StackBoot.png" alt="Logo" className={styles.logo} />
          </Link>
        </div>

        <div className={styles.rightLinks}>
          <Link href="/favorites" className={isFlashing ? styles.flash : ""} title="Favoriler">
            {/* Minimal Yıldız İkonu (Favoriye eklenince sarı olur) */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
              fill={isFlashing ? "#FFD700" : "none"}
              stroke={isFlashing ? "#FFD700" : "currentColor"}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: "all 0.3s ease" }}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </Link>

          <Link href="/cart" className={isCartFlashing ? styles.flash : ""} title="Sepetim" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* Minimal Alışveriş Çantası İkonu (İstediğiniz görseldeki gibi) */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
              <path d="M3 6h18"></path>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            {totalItems > 0 && <span>({totalItems})</span>}
          </Link>

          {/* Auth durumu: girişliyse kullanıcı adı + çıkış, değilse giriş/üye ol */}
          {/* Auth durumu: tek kişi ikonu; menü içeriği girişe göre değişir */}
          {!loading && (
            <div ref={menuRef} style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                title={user ? "Hesabım" : "Hesap"}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: "inherit",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {/* Kişi ikonu — diğer ikonlarla aynı stil (24x24, stroke currentColor) */}
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </button>

              {menuOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    background: "#fff",
                    border: "1px solid #e0e0e0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    minWidth: "140px",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    zIndex: 100,
                  }}
                >
                  {user ? (
                    <>
                      <Link href="/account" onClick={() => setMenuOpen(false)}
                        style={{ padding: "10px 14px", fontSize: "14px", color: "#222", textDecoration: "none" }}>
                        Hesabım ({user.username})
                      </Link>
                      <button
                        onClick={() => { logout(); setMenuOpen(false); }}
                        style={{
                          padding: "10px 14px",
                          fontSize: "14px",
                          color: "#222",
                          textAlign: "left",
                          background: "none",
                          border: "none",
                          borderTop: "1px solid #f0f0f0",
                          cursor: "pointer",
                        }}
                      >
                        Çıkış
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" onClick={() => setMenuOpen(false)}
                        style={{ padding: "10px 14px", fontSize: "14px", color: "#222", textDecoration: "none" }}>
                        Giriş Yap
                      </Link>
                      <Link href="/register" onClick={() => setMenuOpen(false)}
                        style={{ padding: "10px 14px", fontSize: "14px", color: "#222", textDecoration: "none", borderTop: "1px solid #f0f0f0" }}>
                        Üye Ol
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          )}






        </div>
      </div>

      {/* ALT SATIR: ÜRÜNLER (Logonun altında) */}


    </nav>
  );
}
