# StackBootProject - Proje Dokümantasyonu

Bu doküman, Spring Boot ve Next.js kullanılarak geliştirilen "StackBootProject" e-ticaret demo uygulamasının genel yapısını, teknolojilerini ve mevcut özelliklerini (özellikle son eklenen Sepet altyapısını) özetler.

## 🚀 Teknoloji Yığını (Tech Stack)

### Backend (API Katmanı)
- **Dil / Çerçeve:** Java, Spring Boot
- **Veri Erişim:** Spring Data JPA (Hibernate)
- **Mimari:** RESTful API mimarisi (Controller, Service/Repository, Entity katmanları)
- **Veri Tipleri:** Finansal hesaplamalar için `BigDecimal` kullanımı.
- **Güvenlik / Kimlik Doğrulama:** Spring Security, JWT (jjwt), şifreler için BCrypt hash.
- **Yetkilendirme:** Rol tabanlı (`USER` / `ADMIN`). Rol kullanıcı kaydında tutulur, her istekte veritabanından okunur.
- **E-posta:** Spring Mail (Gmail SMTP) ile doğrulama kodu gönderimi.

### Frontend (Kullanıcı Arayüzü)
- **Dil / Çerçeve:** TypeScript, React, Next.js 16 (App Router)
- **State Yönetimi:** React Context API (`CartContext`, `AuthContext`)
- **Oturum:** JWT token'ı `localStorage`'da tutulur, korumalı isteklerde `Authorization: Bearer` başlığıyla gönderilir.
- **API Erişimi:** `app/lib/useApi.ts` hook'u; base URL'i ve `Authorization` başlığını her isteğe otomatik ekler. Kullanımı: `const apiFetch = useApi();` → `apiFetch("/api/products", { method: "DELETE" })`. **İstisna:** `AuthContext` bu hook'u kullanamaz — token'ı üreten yer olduğu için dairesel bağımlılık oluşur; oradaki çağrılar bilinçli olarak ham `fetch` ile yapılır.
- **Rota Koruma:** `app/admin/layout.tsx` — `/admin` altındaki tüm sayfaları rol kontrolüyle sarmalar.
- **Stillendirme:** SCSS Modules (`.module.scss`) ve Global CSS.

---

## 🎯 Mevcut Özellikler (Features)

0. **Üyelik & Kimlik Doğrulama (Authentication) - *[YENİ]* **
   - **Üye Olma (`/register`):** Kullanıcı adı, e-posta ve şifre (en az 6 karakter) ile kayıt. Şifre veritabanına **BCrypt ile hash'lenerek** yazılır; hesap başlangıçta pasiftir (`enabled=false`).
   - **E-posta Doğrulama (`/verify`):** Kayıt sırasında 6 haneli rastgele bir kod üretilir ve kullanıcının e-postasına (Gmail SMTP) gönderilir. Kodun **15 dakika** geçerlilik süresi vardır. Doğru kod girilince hesap aktifleşir ve JWT token verilir. Kod gelmezse "Tekrar gönder" (`/resend`) desteği vardır.
   - **Giriş (`/login`):** E-posta + şifre kontrolü. Hesap doğrulanmamışsa girişe izin verilmez, kullanıcı doğrulama ekranına yönlendirilir. Başarılı girişte **JWT token** döner.
   - **Oturum Yönetimi:** Token frontend'de `AuthContext` üzerinden `localStorage`'da tutulur. Sayfa yenilendiğinde `/api/auth/me` ile kullanıcı geri yüklenir. Header'da girişliyse kullanıcı adı + "Çıkış", değilse "Giriş / Üye Ol" gösterilir.
   - **Hesap Yönetimi (`/account`):** Şifre değiştirme (eski şifre doğrulamasıyla) ve hesabı kalıcı silme. Hesap silinirken kullanıcının sepeti ve favorileri de temizlenir.
   - **Güvenlik:** REST API stateless çalışır (sunucuda session yok). Vitrin uç noktaları (ürün/kategori/banner **okuma**) herkese açıktır; sepet, favoriler ve hesap işlemleri geçerli JWT ister; yazma işlemleri `ADMIN` rolü ister.

1. **Ürün Listeleme (Product Listing)**
   - Backend'den çekilen ürünlerin (`ProductCard` bileşeni ile) grid şeklinde ana sayfada gösterilmesi.
   - **Kategori Sekmeleri:** Ana sayfada kategoriler yatay sekme çubuğu olarak listelenir, seçilen kategoriye göre ürünler filtrelenir. Sekme çubuğu ok tuşlarıyla kaydırılabilir.
   - **Banner Slider'ı:** Yönetici tarafından eklenen banner'lar ana sayfada 4 saniyede bir otomatik dönen slider'da gösterilir.
   - **Ürün Detay Sayfası (`/products/{id}`):** Görsel, kategori, fiyat, açıklama; sepete ekle ve favori aç/kapa butonları.

2. **Favori Sistemi (Favorites) - *[GÜNCELLENDİ]* **
   - **Güvenli Altyapı:** Favori ekleme/çıkarma isteklerinin tamamı `useApi` üzerinden JWT token ile gider. (Önceden bazı çağrılarda token unutulmuş ve uç nokta korumaya alındığında sessizce 403 dönmeye başlamıştı; artık token eklemek merkezî ve otomatiktir.)
   - **Durum Bilgisi (Toggle):** Hem ana sayfadaki `ProductCard` yıldızı hem de ürün detay sayfasındaki buton, ürünün favoride olup olmadığını bilir. Detay sayfasında buton duruma göre "Favorilere Ekle" / "Favoriden Çıkar" olarak değişir.
   - **Nasıl çalışır:** Favori kaydının id'si (`favId`) bileşen state'inde tutulur. Ekleme isteğinin yanıtındaki id saklanır; böylece sayfa yenilenmeden çıkarma yapılabilir (silme uç noktası ürünün değil, **favori kaydının** id'sini ister). Sayfa açılışında `/api/favorites` listesinden bu ürün aranarak başlangıç durumu belirlenir.
   - Favoriye eklenmiş ürünlerin ayrı bir sayfada (`/favorites`) listelenmesi.

3. **Sepet Yönetimi (Cart Management) - *[GÜNCELLENDİ]* **
   - **Güvenli Kullanıcı Altyapısı:** Login/Kayıt sistemi sepete tamamen entegre edilmiştir. Artık güvensiz `userId` parametresi yerine isteklerin başlığında (Header) **JWT Token** kullanılarak, giriş yapan kullanıcının veritabanındaki kendi sepeti yönetilir.
   - **Global Sepet State'i:** `CartContext` sayesinde uygulamanın her yerinden (Header, Ürün Kartı, Sepet Sayfası) sepet verilerine anlık erişim.
   - **Gerçek Zamanlı Header:** Navigasyon barında (Header) sepetteki anlık ürün sayısının dinamik gösterimi.
   - **Detaylı Sepet Sayfası (`/cart`):**
     - Sepete eklenen ürünlerin listelenmesi.
     - Ürün miktarını (Quantity) `+` ve `-` butonlarıyla artırıp azaltabilme.
     - İstenilen ürünü sepetten tamamen kaldırabilme.
     - Birim fiyat * miktar çarpımı ve en altta **Genel Toplam** tutarının gösterilmesi.

4. **Sipariş / Ödeme Akışı (Checkout & Orders) - *[YENİ]* **
   - **Siparişi Tamamla (`/checkout`):** Sepet sayfasındaki butonla açılır. Solda teslimat bilgileri (ad soyad, adres, şehir, telefon, sipariş notu) ve isteğe bağlı fatura bilgileri, sağda sipariş özeti bulunur. "Fatura istiyorum" işaretlenirse fatura başlığı ve vergi/TC numarası zorunlu olur — aynı doğrulama backend'de de vardır.
   - **Sipariş Geçmişi (`/orders`):** Kullanıcının siparişleri en yenisi üstte listelenir; sipariş numarası, tarih, durum rozeti, ürün adedi ve tutar gösterilir.
   - **Sipariş Detayı (`/orders/{id}`):** Kalemler (görsel, ad, birim fiyat, adet, ara toplam), teslimat ve fatura bilgileri, genel toplam. Başkasının sipariş id'si denenirse backend 403 döner ve arayüz "görüntüleme yetkiniz yok" mesajı gösterir.
   - **Fiyat Snapshot'ı (kritik tasarım kararı):** `OrderItem`, ürüne **foreign key ile bağlanmaz**. Ürünün o anki adı, görseli ve fiyatı sipariş kalemine **kopyalanır**; ürünle bağ yalnızca FK'sız bir `productId` alanıdır. Bunun iki sebebi vardır:
     1. Ürünün fiyatı yarın değişirse geçmiş siparişin tutarı değişmemelidir.
     2. Admin bir ürünü sildiğinde sipariş geçmişi ne bozulmalı ne de silinmelidir. (FK olsaydı ürün silme foreign key hatası verirdi.)
   - **Atomiklik:** Sipariş oluşturma ile sepetin boşaltılması `@Transactional` ile tek işlemdir; araya giren bir hata "sepet boşaldı ama sipariş yok" gibi yarım bir durum bırakamaz.
   - **Sepetin boşaltılması:** `cart.getItems().clear()` yeterlidir — `Cart.items` üzerindeki `orphanRemoval = true` sahipsiz kalan kalemleri siler. Frontend'de `CartContext.refreshCart()` çağrılır, aksi halde Header'daki sepet sayacı boşalmış sepeti eski adediyle göstermeye devam ederdi.
   - **Sipariş durumları:** `NEW` (Sipariş Alındı), `PREPARING` (Hazırlanıyor), `SHIPPED` (Kargoya Verildi), `DELIVERED` (Teslim Edildi), `CANCELLED` (İptal Edildi). Durum metinleri ve biçimlendirme yardımcıları `app/lib/orders.ts` içinde toplanmıştır.
   - **Kapsam dışı:** Ödeme entegrasyonu ve stok düşürme yoktur (`Product`'ta stok alanı bulunmuyor). Checkout, sepeti siparişe çevirmekle sınırlıdır.

5. **Yönetim Paneli (Admin Panel) - *[GÜNCELLENDİ]* **
   - **Erişim:** Yalnızca `role = ADMIN` olan kullanıcılar. `/admin` altındaki tüm sayfalar `app/admin/layout.tsx` ile korunur: giriş yoksa `/login`'e, rol yetersizse ana sayfaya yönlendirilir.
   - **Ürün Yönetimi (`/admin`):** Ürün listesi tablosu; ekleme (`/admin/add`), düzenleme (`/admin/edit/{id}`) ve silme. Ürün silinirken o ürüne ait sepet kalemleri ve favoriler de temizlenir (foreign key hatası olmaması için).
   - **Kategori Yönetimi (`/admin/categories`):** Kategori ekleme ve silme. Aynı isimde ikinci kategori eklenemez.
   - **Banner Yönetimi (`/admin/banners`):** Ana sayfa slider'ına banner ekleme/silme, URL girilirken canlı önizleme.
   - **Sipariş Yönetimi (`/admin/orders`):** Tüm siparişler en yenisi üstte listelenir; müşteri, tutar ve durum görünür. Durum açılır kutudan güncellenir, "Göster" ile satırın altında kalemler ve teslimat/fatura bilgileri açılır. Geçerli durumlar backend'de sabit bir kümede tutulur (`AdminOrderController.ALLOWED_STATUSES`), böylece arayüzden gelen rastgele bir metin veritabanına yazılamaz.
   - **Önemli:** Frontend'deki rol kontrolü yalnızca kullanıcı deneyimi içindir. Asıl güvenlik `SecurityConfig` içindeki sunucu tarafı kurallarıyla sağlanır — token'ı veya arayüzü kurcalayarak yazma işlemi yapılamaz.

---

## 🔒 Yetkilendirme Modeli (Authorization)

Kimlik doğrulama (**authentication**, "sen kimsin?") ile yetkilendirme (**authorization**, "ne yapabilirsin?") birbirinden ayrıdır:

- **Token yalnızca kimliği taşır.** JWT'nin içinde rol **yoktur**; sadece `userId`, e-posta ve kullanıcı adı bulunur. "Admin token'ı" diye ayrı bir token türü yoktur, herkes aynı tip token alır.
- **Rol her istekte veritabanından okunur.** `JwtAuthFilter` token'ın imzasını doğrular, `userId`'yi çıkarır, kullanıcıyı DB'den taze çeker ve rolünü `ROLE_<rol>` biçiminde Spring Security'ye bildirir.
- **Sonuç:** Bir kullanıcının rolü veritabanında değiştirildiği anda geçerli olur; kullanıcının çıkış yapıp yeniden giriş yapmasına gerek kalmaz. Buna karşılık her istekte bir kullanıcı sorgusu maliyeti vardır.

Filtre zincirindeki kurallar (`SecurityConfig`, **yukarıdan aşağı ilk eşleşen kazanır**):

| Sıra | Kural | Erişim |
| :--- | :--- | :--- |
| 1 | `GET /api/products/**`, `/api/categories/**`, `/api/banners/**` | Herkes |
| 2 | `POST` / `PUT` / `DELETE` aynı yollar | `ADMIN` |
| 3 | `/api/auth/me`, `/api/auth/change-password`, `/api/auth/delete-account` | Giriş yapmış |
| 4 | `/api/auth/**` (register, verify, login, resend) | Herkes |
| 5 | `/api/admin/orders/**` | `ADMIN` |
| 6 | `/api/cart/**`, `/api/favorites/**`, `/api/orders/**` | Giriş yapmış |

> `hasRole("ADMIN")` arka planda `ROLE_ADMIN` authority'sini arar — bu yüzden `JwtAuthFilter` rolü yazarken `"ROLE_" + role` önekini elle ekler.

### Sahiplik Kontrolü (IDOR'a karşı)

Yukarıdaki tablo yalnızca **"giriş yapmış mı / rolü var mı"** sorusunu cevaplar. `/api/cart/items/5` gibi **id ile tek bir kayda** dokunan uç noktalarda ikinci bir soru daha vardır: *"bu kayıt isteği yapanın mı?"* Bu kontrol atlanırsa **IDOR** (Insecure Direct Object Reference) açığı doğar: giriş yapmış herhangi bir kullanıcı, id'sini tahmin ederek başkasının verisine erişir.

Id ile kayıt bulan her uç nokta şu dört adımı uygular:

```java
// 1) Kimlik
if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
}
// 2) Nesneyi bul  → yoksa 404
// 3) Sahiplik     → nesne.getUser().getId().equals(user.getId()) değilse 403
// 4) İşlem
```

Uygulandığı yerler: `CartController.updateItemQuantity`, `CartController.removeItem`, `FavoriteController.deleteFavorite`, `OrderController.getOrder`.

> **Not:** Sipariş kaydı ad, adres ve telefon içerdiği için `OrderController.getOrder`'daki kontrol diğerlerinden daha kritiktir; atlanırsa id deneyerek kişisel veri okunabilirdi. Bu kontrol **admin için de** sıkıdır: admin başkasının siparişini `/api/orders/{id}` üzerinden göremez, yolu `/api/admin/orders`'tır. Yetki, yetkinin tanımlı olduğu kapıdan verilir.

Dikkat edilecek iki nokta:

- **`.equals()` kullanılır, `==` değil.** `getId()` bir `Long` nesnesi döndürür; `==` referans karşılaştırır. Java `-128..127` aralığındaki `Long` değerlerini önbelleklediği için `==` küçük id'lerde çalışıyormuş gibi görünür, id'ler büyüyünce sessizce bozulur.
- **Yanıt, isteği yapanın verisiyle kurulur.** Örneğin `cartRepository.findByUserId(user.getId())` — `item.getCart().getUser().getId()` değil. Sahiplik kontrolünden sonra ikisi aynıdır, ancak ilki niyeti açık kılar ve kontrol ileride kaldırılsa bile başkasının verisini sızdırmaz.

---

## 🗄️ Veritabanı Modelleri (Entities)

Backend tarafında JPA kullanılarak veritabanı tabloları ile nesneler eşleştirilmiştir:

- **`User` (Kullanıcı):** Sisteme giriş yapan veya varsayılan kullanıcıları tutar (`id`, `username`, `email`, `password` (BCrypt hash), `enabled`, `role`, `verificationCode`, `verificationExpiry`). Hassas alanlar (`password`, `verificationCode`, `verificationExpiry`) `@JsonIgnore` ile API yanıtlarına sızmaz. `role` alanı `"USER"` veya `"ADMIN"` değerini alır, varsayılanı `"USER"`'dır.
- **`Product` (Ürün):** Satışta olan ürünleri tutar (`id`, `name`, `description`, `price (BigDecimal)`, `imageUrl`, `category`).
- **`Category` (Kategori):** Ürün kategorilerinin listesi (`id`, `name` — unique). Ürünle ilişki metin üzerinden kurulur (`Product.category`), foreign key yoktur.
- **`Banner` (Afiş):** Ana sayfa slider'ındaki görseller (`id`, `imageUrl`, `title`).
- **`Favorite` (Favori):** Hangi ürünün hangi kullanıcı tarafından favorilere eklendiğini temsil eder (`@ManyToOne User`, `@ManyToOne Product`).
- **`Cart` (Sepet):** Kullanıcıyla birebir (`@OneToOne`) eşleşen genel sepet nesnesi.
- **`CartItem` (Sepet Öğesi):** Sepetin içindeki kalemleri tutar. Hangi sepette (`@ManyToOne Cart`), hangi üründen (`@ManyToOne Product`), kaç adet (`quantity`) olduğunu belirler.
- **`Order` (Sipariş):** Tamamlanmış bir siparişi tutar (`id`, `@ManyToOne User` (`@JsonIgnore`), `createdAt (Instant)`, `status`, `totalAmount (BigDecimal)`, teslimat alanları: `fullName`, `address`, `city`, `phone`, `note`, fatura alanları: `invoiceRequired`, `invoiceTitle`, `taxOffice`, `taxId`). Tablo adı `@Table(name = "orders")` ile verilir çünkü `order` SQL'de rezerve bir kelimedir (`ORDER BY`). `addItem()` ilişkinin iki ucunu birden kurar, `updateTotals()` kalemlerin ara toplamlarından genel toplamı hesaplar. `user` gizli olduğu için admin listesine `customerUsername` / `customerEmail` türetilmiş getter'larla açılır.
- **`OrderItem` (Sipariş Kalemi):** Sipariş anındaki ürün bilgilerinin kopyasını tutar (`productId` — **FK değil, düz alan**, `productName`, `imageUrl`, `unitPrice`, `quantity`). `@ManyToOne Order` alanı `@JsonIgnore`'dur; olmasaydı JSON üretimi `order → items → order` diye sonsuz döngüye girerdi.

---

## 🛠️ API Uç Noktaları (Endpoints)

Erişim sütunu: 🌐 herkese açık · 🔑 giriş gerekir · 👑 `ADMIN` rolü gerekir

| Metot | Uç Nokta (Endpoint) | Erişim | Açıklama |
| :--- | :--- | :---: | :--- |
| **POST** | `/api/auth/register` | 🌐 | Yeni üyelik oluşturur, doğrulama kodunu e-postaya gönderir. Gövde: `{username, email, password}`. |
| **POST** | `/api/auth/verify` | 🌐 | E-postadaki kodu doğrular, hesabı aktifleştirir ve JWT döner. Gövde: `{email, code}`. |
| **POST** | `/api/auth/login` | 🌐 | E-posta + şifre ile giriş, JWT döner. Gövde: `{email, password}`. |
| **POST** | `/api/auth/resend` | 🌐 | Doğrulama kodunu yeniden gönderir. Gövde: `{email}`. |
| **GET** | `/api/auth/me` | 🔑 | Token sahibinin bilgisini döner: `{id, username, email, role}`. |
| **POST** | `/api/auth/change-password` | 🔑 | Şifre değiştirir. Gövde: `{oldPassword, newPassword}`. |
| **DELETE** | `/api/auth/delete-account` | 🔑 | Hesabı, sepetini ve favorilerini siler. |
| **GET** | `/api/products` · `/api/products/{id}` | 🌐 | Ürünleri / tek ürünü listeler. |
| **POST** | `/api/products` | 👑 | Yeni ürün ekler. |
| **PUT** | `/api/products/{id}` | 👑 | Ürünü günceller. |
| **DELETE** | `/api/products/{id}` | 👑 | Ürünü, ona bağlı sepet kalemlerini ve favorileri siler. |
| **GET** | `/api/categories` | 🌐 | Kategorileri listeler. |
| **POST** | `/api/categories` | 👑 | Kategori ekler (aynı isim reddedilir). Gövde: `{name}`. |
| **DELETE** | `/api/categories/{id}` | 👑 | Kategoriyi siler. |
| **GET** | `/api/banners` | 🌐 | Banner'ları listeler. |
| **POST** | `/api/banners` | 👑 | Banner ekler. Gövde: `{imageUrl, title}`. |
| **DELETE** | `/api/banners/{id}` | 👑 | Banner'ı siler. |
| **GET/POST/DELETE** | `/api/favorites` | 🔑 | Kullanıcının favorilerini yönetir (`userId` parametresi iptal edildi, JWT'den okunur). |
| **GET** | `/api/cart` | 🔑 | Giriş yapan kullanıcının sepetini ve içindeki öğeleri getirir. |
| **POST** | `/api/cart/items` | 🔑 | Sepete yeni ürün ekler (veya miktarını artırır). |
| **PUT** | `/api/cart/items/{itemId}?quantity=X` | 🔑 | Sepetteki bir ürünün miktarını günceller. |
| **DELETE** | `/api/cart/items/{itemId}` | 🔑 | İlgili ürünü sepetten tamamen çıkartır. |
| **POST** | `/api/orders` | 🔑 | Sepeti siparişe çevirir ve sepeti boşaltır. Gövde: `{fullName, address, city, phone, note?, invoiceRequired?, invoiceTitle?, taxOffice?, taxId?}`. Boş sepette 400 döner. |
| **GET** | `/api/orders` | 🔑 | Kullanıcının siparişlerini listeler (en yenisi üstte). |
| **GET** | `/api/orders/{id}` | 🔑 | Tek siparişi getirir. Sahiplik kontrolü vardır: başkasının siparişinde 403. |
| **GET** | `/api/admin/orders` | 👑 | Tüm siparişleri listeler (en yenisi üstte). |
| **PUT** | `/api/admin/orders/{id}/status` | 👑 | Sipariş durumunu günceller. Gövde: `{status}`. Tanımlı olmayan durum 400 döner. |

---

## 💻 Geliştirici Ortamı (Nasıl Çalıştırılır?)

**Backend'i Çalıştırmak:**
1. `productapi` klasörüne gidin.
2. Terminalde `mvnw spring-boot:run` (Mac/Linux için `./mvnw spring-boot:run`, Windows PowerShell için `.\mvnw spring-boot:run`) komutunu çalıştırın.
*Not: Uygulama ilk kalktığında `ProductapiApplication` içerisindeki seed datalar ile veritabanına örnek ürünler ve varsayılan kullanıcı (ID:1) eklenecektir.*

### 📧 E-posta Doğrulama İçin Gmail Kurulumu (Önemli)

Doğrulama kodunun **gerçekten e-postaya gönderilmesi** için bir Gmail hesabı bağlanmalıdır. Kimlik bilgileri koda gömülmez; **ortam değişkeninden** okunur.

1. Göndermek istediğiniz Gmail hesabında **2 Adımlı Doğrulama**'yı açın.
2. [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) adresinden 16 haneli bir **App Password** (Uygulama Şifresi) üretin. *(Bu, normal Gmail şifreniz değildir; Google, üçüncü parti uygulamaların normal şifreyle SMTP'ye bağlanmasına izin vermez, bu yüzden ayrı bir uygulama şifresi gerekir.)*
3. Backend'i şu ortam değişkenleriyle başlatın (Windows PowerShell):
   ```powershell
   $env:MAIL_USERNAME="senin@gmail.com"
   $env:MAIL_PASSWORD="16haneliapppassword"
   $env:JWT_SECRET="en-az-32-karakterlik-gizli-bir-metin"
   cd productapi; .\mvnw.cmd spring-boot:run
   ```

> **Not (Geliştirme modu):** `MAIL_USERNAME` / `MAIL_PASSWORD` verilmezse uygulama yine çalışır; ancak doğrulama kodu e-posta yerine **backend konsoluna** yazılır (`[Auth] ... Kod: 123456`). Test/geliştirme için pratiktir.
>
> **Güvenlik:** App Password ve `JWT_SECRET` gibi bilgileri asla kod içine yazmayın veya GitHub'a pushlamayın.

### 🔐 Kimlik Doğrulama Akışı (Auth Flow)

1. Kullanıcı `/register` sayfasından üye olur → backend kodu üretip e-postaya gönderir.
2. Kullanıcı `/verify` sayfasında e-postasına gelen 6 haneli kodu girer → hesap aktifleşir, JWT verilir ve otomatik giriş yapılır.
3. Sonraki girişler `/login` sayfasından e-posta + şifre ile yapılır.
4. Token `localStorage`'da saklanır; korumalı isteklerde `Authorization: Bearer <token>` başlığıyla gönderilir.

### 👑 Kendini Admin Yapma

Kayıt olan her kullanıcı `USER` rolüyle başlar; arayüzden admin olma yolu **bilerek yoktur** (olsaydı herkes kendini admin yapardı). Rol doğrudan veritabanından verilir:

```powershell
# Docker ile çalışıyorsanız:
docker exec product-db psql -U postgres -d productdb -c "UPDATE users SET role='ADMIN' WHERE email='senin@mail.com';"

# Kontrol:
docker exec product-db psql -U postgres -d productdb -c "SELECT id, email, role FROM users;"
```

`UPDATE 1` çıktısını görmelisiniz. Rol her istekte veritabanından okunduğu için **çıkış yapıp yeniden girmeye gerek yoktur**; bir sonraki istekte yetki geçerli olur. Ardından `/admin` adresi açılabilir hale gelir.

> `role` kolonu uygulama açılışında Hibernate tarafından (`ddl-auto=update`) otomatik eklenir. Kolon yoksa backend'i bir kez yeniden başlatın.

**Frontend'i Çalıştırmak:**
1. `frontend` klasörüne gidin.
2. Bağımlılıkları yükleyin: `npm install`
3. Geliştirici sunucusunu başlatın: `npm run dev`
4. Tarayıcınızda `http://localhost:3000` adresine giderek projeyi görüntüleyin.

---

## 🚧 Bilinen Açıklar (Sıradaki İşler)

Dürüst kalsın diye not düşülmüştür; henüz **kapatılmamıştır**:

**Güvenlik**

1. **Deneme limiti yok:** `/api/auth/login` ve `/api/auth/verify` sınırsız denenebiliyor; 6 haneli doğrulama kodu 15 dakika boyunca kaba kuvvetle denenebilir.

**Hata yönetimi / veri bütünlüğü**

2. **Sepet yarış durumu:** `Cart.user` üzerinde unique kısıtı yok; eşzamanlı iki istek aynı kullanıcıya iki sepet oluşturabilir.
3. **Sepette toplam miktar sınırı delinebiliyor:** `CartController.addItemToCart` tek istekte `quantity > 100`'ü reddediyor, ancak mevcut kaleme ekleme yapılırken **toplam** kontrol edilmiyor. 50'yi üç kez gönderen 150 adete ulaşır ve bu miktar siparişe de geçer.
4. **Şifre değişince eski token'lar geçerli kalıyor:** JWT'de iptal (revocation) mekanizması yok; şifresini değiştiren kullanıcının önceki token'ı süresi dolana kadar çalışmaya devam eder.
5. **Sipariş iptali kullanıcı tarafında yok:** `CANCELLED` durumunu yalnızca admin verebiliyor.

**Kod kalitesi**

6. **Kullanılmayan artıklar:** `productapi` içinde boş `string.java` sınıfı, `CartController`'da enjekte edilip hiç kullanılmayan `userRepository`, `Header.tsx`'te kullanılmayan `import { title } from "process"`, kök `layout.tsx`'te hâlâ varsayılan "Create Next App" metadata'sı.
7. **Test yok:** Yalnızca varsayılan `contextLoads` testi mevcut. Sipariş akışı (sahiplik kontrolü, snapshot, sepetin boşalması) test edilmeye en uygun yer.

> **Kapatılanlar:**
> - Ürün / kategori / banner yazma uçları `ADMIN` rolüne kilitlendi, `/admin` sayfaları rol kontrolüyle sarmalandı.
> - Sepet ve favorilerdeki **IDOR** açıkları kapatıldı (sahiplik kontrolü — bkz. *Yetkilendirme Modeli*).
> - Frontend'in tamamı `useApi` kullanıyor; gömülü API adresi kalmadı, token yalnızca `AuthContext` tarafından okunuyor/yazılıyor.
> - `FavoriteController` hataları `RuntimeException` (500) yerine anlamlı HTTP kodlarıyla dönüyor.
> - Sipariş / checkout akışı eklendi; `OrderController.getOrder` sahiplik kontrolüyle korunuyor.
> - Hesap silme artık siparişleri de temizliyor. (Önceden `Order.user` foreign key'i yüzünden siparişi olan kullanıcı hesabını silemezdi.)
