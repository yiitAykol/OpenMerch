"use client";

import Link from "next/link";
import styles from "../layout.module.scss";
import { useCart } from "../context/CartContext";
import { useEffect, useState } from "react";

export default function Header() {
  const { totalItems } = useCart();
  const [isFlashing, setIsFlashing] = useState(false);
  const [isCartFlashing, setIsCartFlashing] = useState(false);

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
        </div>
      </div>

      {/* ALT SATIR: ÜRÜNLER (Logonun altında) */}
      <div className={styles.bottomRow}>
        <Link href="/">Ürünler</Link>
      </div>

    </nav>
  );
}
