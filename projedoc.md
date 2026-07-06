# StackBootProject - Proje Dokümantasyonu

Bu doküman, Spring Boot ve Next.js kullanılarak geliştirilen "StackBootProject" e-ticaret demo uygulamasının genel yapısını, teknolojilerini ve mevcut özelliklerini (özellikle son eklenen Sepet altyapısını) özetler.

## 🚀 Teknoloji Yığını (Tech Stack)

### Backend (API Katmanı)
- **Dil / Çerçeve:** Java, Spring Boot
- **Veri Erişim:** Spring Data JPA (Hibernate)
- **Mimari:** RESTful API mimarisi (Controller, Service/Repository, Entity katmanları)
- **Veri Tipleri:** Finansal hesaplamalar için `BigDecimal` kullanımı.

### Frontend (Kullanıcı Arayüzü)
- **Dil / Çerçeve:** TypeScript, React, Next.js (App Router)
- **State Yönetimi:** React Context API (`CartContext`)
- **Stillendirme:** SCSS Modules (`.module.scss`) ve Global CSS.

---

## 🎯 Mevcut Özellikler (Features)

1. **Ürün Listeleme (Product Listing)**
   - Backend'den çekilen ürünlerin (`ProductCard` bileşeni ile) grid veya liste şeklinde ana sayfada gösterilmesi.

2. **Favori Sistemi (Favorites)**
   - Ürünleri favorilere ekleme ve çıkarma yeteneği.
   - Favoriye eklenmiş ürünlerin ayrı bir sayfada (`/favorites`) listelenmesi.

3. **Sepet Yönetimi (Cart Management) - *[YENİ]* **
   - **Varsayılan Kullanıcı Altyapısı:** Login/Kayıt sistemi henüz entegre edilmediği için geçici olarak ID'si 1 olan bir "Default User" üzerinden sepetin veritabanında (backend) kalıcı olarak tutulması.
   - **Global Sepet State'i:** `CartContext` sayesinde uygulamanın her yerinden (Header, Ürün Kartı, Sepet Sayfası) sepet verilerine anlık erişim.
   - **Gerçek Zamanlı Header:** Navigasyon barında (Header) sepetteki anlık ürün sayısının dinamik gösterimi.
   - **Detaylı Sepet Sayfası (`/cart`):**
     - Sepete eklenen ürünlerin listelenmesi.
     - Ürün miktarını (Quantity) `+` ve `-` butonlarıyla artırıp azaltabilme.
     - İstenilen ürünü sepetten tamamen kaldırabilme.
     - Birim fiyat * miktar çarpımı ve en altta **Genel Toplam** tutarının gösterilmesi.

---

## 🗄️ Veritabanı Modelleri (Entities)

Backend tarafında JPA kullanılarak veritabanı tabloları ile nesneler eşleştirilmiştir:

- **`User` (Kullanıcı):** Sisteme giriş yapan veya varsayılan kullanıcıları tutar (`id`, `username`, `email`).
- **`Product` (Ürün):** Satışta olan ürünleri tutar (`id`, `name`, `description`, `price (BigDecimal)`, `imageUrl`).
- **`Favorite` (Favori):** Hangi ürünün favorilere eklendiğini temsil eder.
- **`Cart` (Sepet):** Kullanıcıyla birebir (`@OneToOne`) eşleşen genel sepet nesnesi.
- **`CartItem` (Sepet Öğesi):** Sepetin içindeki kalemleri tutar. Hangi sepette (`@ManyToOne Cart`), hangi üründen (`@ManyToOne Product`), kaç adet (`quantity`) olduğunu belirler.

---

## 🛠️ API Uç Noktaları (Endpoints)

| Metot | Uç Nokta (Endpoint) | Açıklama |
| :--- | :--- | :--- |
| **GET** | `/api/products` | Tüm ürünleri listeler. |
| **POST** | `/api/favorites` | Bir ürünü favorilere ekler. |
| **GET** | `/api/cart?userId=1` | Belirtilen kullanıcının sepetini ve içindeki öğeleri getirir. |
| **POST** | `/api/cart/items` | Sepete yeni ürün ekler (veya miktarını artırır). |
| **PUT** | `/api/cart/items/{itemId}?quantity=X` | Sepetteki bir ürünün miktarını günceller. |
| **DELETE** | `/api/cart/items/{itemId}` | İlgili ürünü sepetten tamamen çıkartır. |

---

## 💻 Geliştirici Ortamı (Nasıl Çalıştırılır?)

**Backend'i Çalıştırmak:**
1. `productapi` klasörüne gidin.
2. Terminalde `mvnw spring-boot:run` (Mac/Linux için `./mvnw spring-boot:run`, Windows PowerShell için `.\mvnw spring-boot:run`) komutunu çalıştırın.
*Not: Uygulama ilk kalktığında `ProductapiApplication` içerisindeki seed datalar ile veritabanına örnek ürünler ve varsayılan kullanıcı (ID:1) eklenecektir.*

**Frontend'i Çalıştırmak:**
1. `frontend` klasörüne gidin.
2. Bağımlılıkları yükleyin: `npm install`
3. Geliştirici sunucusunu başlatın: `npm run dev`
4. Tarayıcınızda `http://localhost:3000` adresine giderek projeyi görüntüleyin.
