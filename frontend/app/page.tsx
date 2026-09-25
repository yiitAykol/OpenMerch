"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import ProductCard, { type Product } from "@/components/ProductCard"
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/lib/useApi";
// importlar buraya (useState, useEffect)
import styles from "./page.module.scss";
const tabColors = ["#e4ddddff", "#d5e3eeff", "#e3ece4ff", "#f0ebe4ff", "#e1cdefff", "#d5e9e8ff"];
// Bir sayfada gösterilecek ürün sayısı. Backend'in varsayılanı da 12.
const PAGE_SIZE = 12;

// Backend'in sayfalı yanıtı: { content: [...], page: {...} }
type ProductPage = {
  content: Product[];
  page: { number: number; totalPages: number; totalElements: number };
};

// Ürünlerin bir sayfasını çeker; state'e dokunmaz, sadece veriyi döndürür.
//
// Kategori filtresi artık sunucuda: liste sayfalı olduğu için tarayıcı
// ürünlerin tamamını görmüyor, burada filtrelemek yanlış sonuç verirdi.
async function fetchProductPage(pageToLoad: number, category: string): Promise<ProductPage | null> {
  const params = new URLSearchParams({
    page: String(pageToLoad),
    size: String(PAGE_SIZE),
  });
  if (category !== "all") params.set("category", category);

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products?${params}`);
  return res.ok ? res.json() : null;
}

export default function Home() {
  // state buraya
  //const [products, setProducts] = useState([]);
  const [products, setProducts] = useState<Product[]>([]);
  // Kategorileri backend'den ayrı çekiyoruz (boş kategoriler de görünsün)
  const [categories, setCategories] = useState<string[]>([]);
  // Sekmelerdeki ürün sayıları. Backend'den gelir: liste sayfalı olduğu için
  // tarayıcıdaki products tüm ürünleri içermez, oradan saymak yanlış sonuç verir.
  const [categoryCounts, setCategoryCounts] = useState<{ total: number; byCategory: Record<string, number> }>({
    total: 0,
    byCategory: {},
  });
  // Ana sayfa banner'ları
  const [banners, setBanners] = useState<{ id: number; imageUrl: string; title: string | null }[]>([]);
  // productId -> favoriteId eşlemesi (yıldızların dolu başlaması için)
  const [favMap, setFavMap] = useState<Record<number, number>>({});
  const { user, token } = useAuth();
  // Slider'da o an gösterilen banner
  const [currentSlide, setCurrentSlide] = useState(0);
  // products state'inin altına ekle
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  // Sayfalama durumu. Sayfa numarası backend ile aynı dilde: 0 tabanlı.
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Tab çubuğunu okla kaydırmak için referans
  const tabBarRef = useRef<HTMLDivElement>(null);
  // Okların görünürlüğü: o yöne kaydırılacak yer var mı?
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const apiFetch = useApi();

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

  // Gelen sayfayı ekrana yansıtır. append=true ise mevcut listenin altına ekler
  // ("Daha fazla göster"), false ise listeyi baştan kurar (kategori değişimi).
  // Sadece state setter'larını kullandığı için useCallback ile sabit tutulabiliyor.
  const showPage = useCallback((data: ProductPage, append: boolean) => {
    setProducts((current) => (append ? [...current, ...data.content] : data.content));
    setPage(data.page.number);
    setTotalPages(data.page.totalPages);
    setTotalElements(data.page.totalElements);
  }, []);

  // Aynı sekmeye tekrar tıklamak effect'i tetiklemez; yükleniyor bayrağı açık kalmasın.
  const selectCategory = (category: string) => {
    if (category === selectedCategory) return;
    setIsLoadingProducts(true);
    setSelectedCategory(category);
  };

  const loadMore = async () => {
    setIsLoadingProducts(true);
    try {
      const data = await fetchProductPage(page + 1, selectedCategory);
      if (data) showPage(data, true);
    } catch (error) {
      console.error("Ürünler getirilirken hata:", error);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Kategori / banner / sayılar herkese açık — bir kez yüklenir.
  useEffect(() => {
    async function load() {
      const [categoriesRes, bannersRes, countsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/banners`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/category-counts`),
      ]);
      const categoryData = await categoriesRes.json();
      // Backend {id, name} döndürüyor; sadece isimleri alıyoruz
      setCategories(categoryData.map((c: { name: string }) => c.name));
      setBanners(await bannersRes.json());
      if (countsRes.ok) setCategoryCounts(await countsRes.json());
    }
    load();
  }, []);

  // Kategori değiştiğinde ilk sayfadan başla ve listeyi sıfırla.
  useEffect(() => {
    async function loadFirstPage() {
      try {
        const data = await fetchProductPage(0, selectedCategory);
        if (data) showPage(data, false);
      } catch (error) {
        console.error("Ürünler getirilirken hata:", error);
      } finally {
        setIsLoadingProducts(false);
      }
    }
    loadFirstPage();
  }, [selectedCategory, showPage]);

  // Favoriler kullanıcıya özel — giriş/çıkışta yıldızları güncelle.
  useEffect(() => {
    if (!user || !token) return;
    async function loadFavorites() {
      const res = await apiFetch(`/api/favorites`, {
      });
      const favoriteData = await res.json();
      const map: Record<number, number> = {};
      favoriteData.forEach((f: { id: number; product: { id: number } }) => {
        map[f.product.id] = f.id;
      });
      setFavMap(map);
    }
    loadFavorites();
  }, [user, token, apiFetch]);

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
            onClick={() => selectCategory("all")}
          >
            Ürünler ({categoryCounts.total})
          </button>

          {/* Kategori sekmeleri */}
          {categories.map((cat, index) => {
            // Hiç ürünü olmayan kategori backend yanıtında yer almaz → 0.
            const count = categoryCounts.byCategory[cat] ?? 0;
            return (
              <button
                key={cat}
                className={`${styles.tab} ${selectedCategory === cat ? styles.active : ""}`}
                style={{ borderColor: tabColors[index % tabColors.length] }}
                onClick={() => selectCategory(cat)}
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
        {products.map((product) => (
          <ProductCard key={product.id} product={product} favoriteId={user ? favMap[product.id] ?? null : null} />
        ))}
      </div>

      {/* Sayfalama: vitrinde sayfa numarası yerine "daha fazla" — akış bölünmesin.
          Son sayfadaysak buton hiç gösterilmez. */}
      {page < totalPages - 1 && (
        <div style={{ textAlign: "center", margin: "2rem 0 3rem" }}>
          <button
            onClick={loadMore}
            disabled={isLoadingProducts}
            style={{
              padding: "0.75rem 2rem",
              borderRadius: "999px",
              border: "1px solid #d1d5db",
              background: "#fff",
              cursor: isLoadingProducts ? "default" : "pointer",
              fontSize: "0.95rem",
              opacity: isLoadingProducts ? 0.6 : 1,
            }}
          >
            {isLoadingProducts ? "Yükleniyor..." : "Daha fazla göster"}
          </button>
          <div style={{ marginTop: "0.75rem", color: "#6b7280", fontSize: "0.85rem" }}>
            {totalElements} üründen {products.length} tanesi gösteriliyor
          </div>
        </div>
      )}
    </>
  );
}