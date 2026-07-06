"use client";
import { useState, useEffect, useRef } from "react";
import ProductCard from "./components/ProductCard"

// importlar buraya (useState, useEffect)
import styles from "./page.module.scss";
const tabColors = ["#e57373", "#64b5f6", "#81c784", "#ffb74d", "#ba68c8", "#4db6ac"];

export default function Home() {
  // state buraya
  //const [products, setProducts] = useState([]);
  const [products, setProducts] = useState<any[]>([]);
  // Kategorileri backend'den ayrı çekiyoruz (boş kategoriler de görünsün)
  const [categories, setCategories] = useState<string[]>([]);
  // products state'inin altına ekle
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Tab çubuğunu okla kaydırmak için referans
  const tabBarRef = useRef<HTMLDivElement>(null);
  // Okların görünürlüğü: o yöne kaydırılacak yer var mı?
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = () => {
    const el = tabBarRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  const scrollTabs = (direction: number) => {
    const el = tabBarRef.current;
    if (!el) return;
    const gutter = 16; // .tabBar padding-left (SCSS ile aynı)
    const tabs = Array.from(el.children) as HTMLElement[];
    const currentLeft = el.scrollLeft;
    const viewRight = currentLeft + el.clientWidth;

    if (direction > 0) {
      // İleri: sağ kenarda kesilen ilk sekmeyi başa hizala
      for (const tab of tabs) {
        const tabLeft = tab.offsetLeft;
        const tabRight = tabLeft + tab.offsetWidth;
        if (tabRight > viewRight + 1 && tabLeft > currentLeft + 1) {
          el.scrollTo({ left: tabLeft - gutter, behavior: "smooth" });
          return;
        }
      }
      // Kesilen kalmadıysa en sona git
      el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
    } else {
      // Geri: sol kenarda gizli/kesik en sağdaki sekmeyi başa hizala
      for (let i = tabs.length - 1; i >= 0; i--) {
        const tabLeft = tabs[i].offsetLeft;
        if (tabLeft < currentLeft - 1) {
          el.scrollTo({ left: tabLeft - gutter, behavior: "smooth" });
          return;
        }
      }
      el.scrollTo({ left: 0, behavior: "smooth" });
    }
  };

  // Seçili kategoriye göre filtrele
  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  // useEffect buraya
  useEffect(() => {
    async function load() {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories`),
      ]);
      setProducts(await productsRes.json());
      const categoryData = await categoriesRes.json();
      // Backend {id, name} döndürüyor; sadece isimleri alıyoruz
      setCategories(categoryData.map((c: { name: string }) => c.name));
    }
    load();
  }, []);

  // Kategoriler yüklendiğinde / pencere boyutu değiştiğinde okları güncelle
  useEffect(() => {
    updateArrows();
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, [categories]);

  return (
    <>
      <div className={styles.tabBarWrapper}>
      <button
        className={styles.arrow}
        style={{ visibility: canLeft ? "visible" : "hidden" }}
        onClick={() => scrollTabs(-1)}
        aria-label="Geri"
      >‹</button>
      <div className={styles.tabBar} ref={tabBarRef} onScroll={updateArrows}>
        {/* Hepsini gösteren sekme */}
        <button
          className={`${styles.tab} ${selectedCategory === "all" ? styles.active : ""}`}
          onClick={() => setSelectedCategory("all")}
        >
          Ürünler ({products.length})
        </button>

        {/* Kategori sekmeleri */}
        {categories.map((cat, index) => {
          const count = products.filter((p) => p.category === cat).length;
          return (
            <button
              key={cat}
              className={`${styles.tab} ${selectedCategory === cat ? styles.active : ""}`}
              style={{ borderColor: tabColors[index % tabColors.length] }}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>
      <button
        className={styles.arrow}
        style={{ visibility: canRight ? "visible" : "hidden" }}
        onClick={() => scrollTabs(1)}
        aria-label="İleri"
      >›</button>
      </div>

      <div className={styles.grid}>
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </>
  );
}