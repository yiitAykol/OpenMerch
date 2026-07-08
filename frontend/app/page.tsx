"use client";
import { useState, useEffect, useRef } from "react";
import ProductCard from "./components/ProductCard"

// importlar buraya (useState, useEffect)
import styles from "./page.module.scss";
const tabColors = ["#e4ddddff", "#d5e3eeff", "#e3ece4ff", "#f0ebe4ff", "#e1cdefff", "#d5e9e8ff"];

export default function Home() {
  // state buraya
  //const [products, setProducts] = useState([]);
  const [products, setProducts] = useState<any[]>([]);
  // Kategorileri backend'den ayrı çekiyoruz (boş kategoriler de görünsün)
  const [categories, setCategories] = useState<string[]>([]);
  // Ana sayfa banner'ları
  const [banners, setBanners] = useState<{ id: number; imageUrl: string; title: string | null }[]>([]);
  // productId -> favoriteId eşlemesi (yıldızların dolu başlaması için)
  const [favMap, setFavMap] = useState<Record<number, number>>({});
  // Slider'da o an gösterilen banner
  const [currentSlide, setCurrentSlide] = useState(0);
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
      const [productsRes, categoriesRes, bannersRes, favoritesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/banners`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/favorites`),
      ]);
      setProducts(await productsRes.json());
      const categoryData = await categoriesRes.json();
      // Backend {id, name} döndürüyor; sadece isimleri alıyoruz
      setCategories(categoryData.map((c: { name: string }) => c.name));
      setBanners(await bannersRes.json());
      // Favorileri productId -> favoriteId olarak eşle
      const favoriteData = await favoritesRes.json();
      const map: Record<number, number> = {};
      favoriteData.forEach((f: { id: number; product: { id: number } }) => {
        map[f.product.id] = f.id;
      });
      setFavMap(map);
    }
    load();
  }, []);

  // Kategoriler yüklendiğinde / pencere boyutu değiştiğinde okları güncelle
  useEffect(() => {
    updateArrows();
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, [categories]);

  // Slider'ı otomatik ilerlet (birden fazla banner varsa, 4 saniyede bir)
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide((index + banners.length) % banners.length);
  };

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

      {banners.length > 0 && (
        <div className={styles.slider}>
          <div
            className={styles.slidesTrack}
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {banners.map((b) => (
              <div className={styles.slide} key={b.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.imageUrl} alt={b.title ?? ""} />
                {b.title && <h2>{b.title}</h2>}
              </div>
            ))}
          </div>

          {banners.length > 1 && (
            <>
              <button
                className={`${styles.sliderArrow} ${styles.sliderLeft}`}
                onClick={() => goToSlide(currentSlide - 1)}
                aria-label="Önceki"
              >‹</button>
              <button
                className={`${styles.sliderArrow} ${styles.sliderRight}`}
                onClick={() => goToSlide(currentSlide + 1)}
                aria-label="Sonraki"
              >›</button>

              <div className={styles.dots}>
                {banners.map((_, i) => (
                  <button
                    key={i}
                    className={`${styles.dot} ${i === currentSlide ? styles.dotActive : ""}`}
                    onClick={() => goToSlide(i)}
                    aria-label={`${i + 1}. banner`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className={styles.grid}>
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} favoriteId={favMap[product.id] ?? null} />
        ))}
      </div>
    </>
  );
}