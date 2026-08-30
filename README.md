# StackBootProject

Spring Boot + Next.js ile yazılmış, uçtan uca çalışan bir **e-ticaret demo uygulaması**. Üyelik ve e-posta doğrulamasından sepete, sipariş akışından yönetim paneline kadar bir mağazanın temel işleyişini kapsar.

> Bu bir öğrenme projesidir ve öyle olduğu için de kararların **gerekçeleri** yazılıdır. Yarış durumları, `@Transactional`'ın ne zaman geri almadığı, IDOR kontrolleri, rate limiting, sayfalama sözleşmesi — hepsi neden öyle yapıldığıyla birlikte [`projedoc.md`](projedoc.md) içinde anlatılıyor. Kodu okumadan önce oraya bakmak işleri hızlandırır.

## Teknolojiler

| Katman | Kullanılanlar |
| :--- | :--- |
| Backend | Java 21, Spring Boot 4.1, Spring Data JPA, Spring Security, JWT (jjwt), Bean Validation, Spring Mail |
| Veritabanı | PostgreSQL 16 (Docker Compose ile) |
| Frontend | TypeScript, React, Next.js 16 (App Router), SCSS Modules |

## Neler var

- **Üyelik ve kimlik doğrulama** — kayıt, 6 haneli kodla e-posta doğrulama, giriş, şifre değiştirme, hesap silme. Şifreler BCrypt ile hash'lenir, oturum JWT ile taşınır.
- **Vitrin** — sayfalı ürün listesi, kategori sekmeleri (sunucu tarafı filtre), banner slider'ı, ürün detay sayfası, stok göstergeleri.
- **Sepet ve favoriler** — kullanıcıya özel, adet sınırlı, stok uyarılı.
- **Sipariş akışı** — teslimat/fatura bilgileriyle checkout, sipariş geçmişi ve detayı, kullanıcının kendi siparişini iptal edebilmesi. Fiyatlar sipariş anında kopyalanır (snapshot), stok sipariş anında düşer ve iptalde geri döner.
- **Yönetim paneli** — ürün, kategori, banner ve sipariş yönetimi; `ADMIN` rolüne kilitli.
- **Güvenlik** — rol tabanlı yetkilendirme, kayıt bazlı sahiplik kontrolleri (IDOR'a karşı), kimlik uçlarında deneme limiti (`429` + `Retry-After`).

Kapsam dışı: gerçek bir ödeme entegrasyonu yoktur, checkout sepeti siparişe çevirmekle sınırlıdır.

## Hızlı başlangıç

Sırayla üç şey ayağa kalkar: **veritabanı → backend → frontend.**

```bash
# 1) Veritabanı (proje kökünde)
docker compose up -d

# 2) Backend
cd productapi
./mvnw spring-boot:run          # Windows: .\mvnw.cmd spring-boot:run
# → http://localhost:8080

# 3) Frontend
cd frontend
npm install
npm run dev                     # → http://localhost:3000
```

**Frontend için `frontend/.env.local` dosyası zorunludur** (`.gitignore`'dadır, klonlayana gelmez):

```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Bu dosya olmadan uygulama hata vermeden açılır ama hiçbir veri görünmez — teşhisi zor bir hatadır.

Uygulama ilk kalktığında örnek ürünler ve varsayılan bir kullanıcı seed edilir. Kendini admin yapmak, Gmail SMTP bağlamak ve diğer ortam değişkenleri için: [`projedoc.md` → Geliştirici Ortamı](projedoc.md).

### İsteğe bağlı ortam değişkenleri

| Değişken | Varsayılan | Ne işe yarar |
| :--- | :--- | :--- |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | boş | Verilmezse doğrulama kodu e-posta yerine backend konsoluna yazılır (geliştirme için pratiktir) |
| `JWT_SECRET` | koddaki dev anahtarı | **Üretimde mutlaka verilmelidir** |
| `CORS_ORIGINS` | `http://localhost:3000` | Frontend başka bir adreste çalışıyorsa |

## Proje yapısı

```
├── docker-compose.yml     PostgreSQL 16
├── productapi/            Spring Boot API
│   └── src/main/java/com/example/productapi/
│       ├── *Controller    uç noktalar + iş mantığı (ayrı service katmanı yoktur)
│       ├── *Repository    Spring Data JPA
│       └── *.java         entity'ler, SecurityConfig, JwtAuthFilter, RateLimiter …
├── frontend/              Next.js (App Router)
│   └── app/
│       ├── admin/         yönetim paneli (rol kontrolüyle sarmalı)
│       ├── context/       AuthContext, CartContext
│       └── lib/           useApi, sipariş yardımcıları
└── projedoc.md            ayrıntılı dokümantasyon ve tasarım kararları
```

## Bilinen eksikler

Proje dokümanı, kapatılmamış açıkları da açıkça listeler — dağıtık ortamda çalışmayan rate limiter, JWT revocation'ın olmayışı, test eksikliği ve birkaç kod tekrarı dahil. Güncel liste: [`projedoc.md` → Bilinen Açıklar](projedoc.md).
