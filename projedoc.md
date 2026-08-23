# StackBootProject - Proje Dokümantasyonu

Bu doküman, Spring Boot ve Next.js kullanılarak geliştirilen "StackBootProject" e-ticaret demo uygulamasının genel yapısını, teknolojilerini ve mevcut özelliklerini (özellikle son eklenen Sepet altyapısını) özetler.

## 🚀 Teknoloji Yığını (Tech Stack)

### Backend (API Katmanı)
- **Dil / Çerçeve:** Java, Spring Boot
- **Veritabanı:** PostgreSQL 16 (Docker ile ayağa kalkar — bkz. *Geliştirici Ortamı*). Şema Hibernate tarafından otomatik üretilir (`ddl-auto=update`).
- **Veri Erişim:** Spring Data JPA (Hibernate)
- **Mimari:** RESTful API — `Controller` → `Repository` → `Entity`. **Ayrı bir service katmanı yoktur:** iş mantığı controller'ların içindedir. `EmailService`, `JwtService` ve `RateLimiter` bu kuralın istisnasıdır; üçü de birden fazla yerden çağrılan teknik yardımcılardır, iş kuralı taşımazlar.
- **Veri Tipleri:** Finansal hesaplamalar için `BigDecimal` kullanımı.
- **Güvenlik / Kimlik Doğrulama:** Spring Security, JWT (jjwt), şifreler için BCrypt hash.
- **Yetkilendirme:** Rol tabanlı (`USER` / `ADMIN`). Rol kullanıcı kaydında tutulur, her istekte veritabanından okunur.
- **E-posta:** Spring Mail (Gmail SMTP) ile doğrulama kodu gönderimi.

### Frontend (Kullanıcı Arayüzü)
- **Dil / Çerçeve:** TypeScript, React, Next.js 16 (App Router)
- **State Yönetimi:** React Context API (`CartContext`, `AuthContext`)
- **Oturum:** JWT token'ı `localStorage`'da tutulur, korumalı isteklerde `Authorization: Bearer` başlığıyla gönderilir. Token ömrü **24 saattir** (`app.jwt.expiration-ms`).
- **API Erişimi:** `app/lib/useApi.ts` hook'u; base URL'i ve `Authorization` başlığını her isteğe otomatik ekler. Base URL `NEXT_PUBLIC_API_URL` ortam değişkeninden okunur — bu değişken tanımlı değilse istekler `undefined/api/...` adresine gider ve uygulama sessizce çalışmaz (bkz. *Geliştirici Ortamı*). Kullanımı: `const apiFetch = useApi();` → `apiFetch("/api/products", { method: "DELETE" })`. **İstisna:** `AuthContext` bu hook'u kullanamaz — token'ı üreten yer olduğu için dairesel bağımlılık oluşur; oradaki çağrılar bilinçli olarak ham `fetch` ile yapılır.
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
   - **Deneme Limiti:** Kayıt, giriş, doğrulama ve kod tekrar gönderme uçları sınırsız denenemez; limit aşılınca `429 Too Many Requests` döner (bkz. *Deneme Limiti*).

1. **Ürün Listeleme (Product Listing)**
   - Backend'den çekilen ürünlerin (`ProductCard` bileşeni ile) grid şeklinde ana sayfada gösterilmesi.
   - **Kategori Sekmeleri:** Ana sayfada kategoriler yatay sekme çubuğu olarak listelenir, seçilen kategoriye göre ürünler filtrelenir. Sekme çubuğu ok tuşlarıyla kaydırılabilir.
   - **Banner Slider'ı:** Yönetici tarafından eklenen banner'lar ana sayfada 4 saniyede bir otomatik dönen slider'da gösterilir.
   - **Ürün Detay Sayfası (`/products/{id}`):** Görsel, kategori, fiyat, açıklama; sepete ekle ve favori aç/kapa butonları.
   - **Stok Göstergesi:** Ürün kartında stok bittiyse görselin üstünde "Tükendi" şeridi belirir ve sepete ekle butonu pasifleşir; 5 ve altındaki stokta fiyatın altında "Son N ürün!" uyarısı çıkar. Detay sayfasında durum üç halde gösterilir: "Stokta var" / "Son N ürün!" / "Tükendi".

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
   - **Stok Uyarısı:** Sepetteki adet stoğu aşıyorsa kalemin altında uyarı çıkar, `+` butonu kilitlenir ve "Siparişi Tamamla" pasifleşir. Kullanıcı sepete koyduktan sonra stok başkası tarafından tüketilmiş olabilir; bunu ödeme formunu doldurduktan sonra değil, burada öğrenmelidir.

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
   - **Sipariş İptali (kullanıcı tarafı):** Kullanıcı kendi siparişini yalnızca `NEW` veya `PREPARING` durumundayken iptal edebilir (`PUT /api/orders/{id}/cancel`). Kargoya verilmiş veya teslim edilmiş sipariş iptal edilemez; zaten iptal edilmiş bir sipariş tekrar iptal edilmeye çalışılırsa 400 döner — sessizce 200 dönmek kullanıcıya "az önceki tıklaman işe yaradı" gibi yanlış bir geri bildirim verirdi. Sipariş detay sayfasında iki adımlı bir onay vardır; istek uçarken buton kilitlenir, aksi halde üst üste tıklama aynı isteği tekrar gönderirdi. Backend güncel siparişi döndürdüğü için arayüz sayfayı yenilemeden rozeti günceller.
     - **Adminin durum ucu bilerek paylaşılmıyor:** `PUT /api/admin/orders/{id}/status` keyfî durum yazmaya izin verir ve `ADMIN`'e kilitlidir. Kullanıcıya verilen yetki "durum değiştirme" değil, "kendi siparişini iptal etme"dir — hedef durum yolun kendisinde sabittir, istek gövdesi yoktur.
     - **Kural iki yerde durur, ama görevleri farklıdır:** `OrderController.CANCELLABLE_STATUSES` **karar verir**; `app/lib/orders.ts` içindeki `CANCELLABLE_STATUSES` / `canCancel()` yalnızca **butonu gösterip gizler**. Frontend'deki liste yanlış olsa bile kural delinmez, kullanıcı sadece işe yaramayacak bir buton görür.
     - **Stok geri eklenir:** İptal edilen siparişin kalemleri stoğa geri döner. `cancelOrder` bu yüzden `@Transactional`'dır — stok geri eklemeleri ile durum değişikliği tek işlemdir. `OrderItem.productId` bir FK olmadığı için ürün bu arada silinmiş olabilir; o durumda güncelleme 0 satır etkiler ve bu beklenen sonuçtur.
   - **Stok Düşürme (kritik tasarım kararı):** Stok, sepete eklerken değil **sipariş anında** düşer. Sepet bir rezervasyon değil, bir listedir; aksi halde sepette unutulan ürünler stoğu süresiz tutar ve bunu çözmek için zamanlanmış bir "rezervasyonu bırak" işi yazmak gerekirdi. Düşürme, `ProductRepository.decreaseStock` ile koşullu tek bir UPDATE olarak yapılır (bkz. *Stok Yarış Durumu*).
   - **Kapsam dışı:** Ödeme entegrasyonu yoktur. Checkout, sepeti siparişe çevirmekle sınırlıdır.

5. **Yönetim Paneli (Admin Panel) - *[GÜNCELLENDİ]* **
   - **Erişim:** Yalnızca `role = ADMIN` olan kullanıcılar. `/admin` altındaki tüm sayfalar `app/admin/layout.tsx` ile korunur: giriş yoksa `/login`'e, rol yetersizse ana sayfaya yönlendirilir.
   - **Ürün Yönetimi (`/admin`):** Ürün listesi tablosu; ekleme (`/admin/add`), düzenleme (`/admin/edit/{id}`) ve silme. Ürün silinirken o ürüne ait sepet kalemleri ve favoriler de temizlenir (foreign key hatası olmaması için). Listede **Stok** kolonu vardır: tükenmiş ürün kırmızı "Tükendi", 5 ve altı turuncu, gerisi yeşil gösterilir. Ekleme ve düzenleme formlarında stok adedi alanı bulunur.
     - **Dikkat:** `ProductController.updateProduct` alanları tek tek kopyalar. `setStock` satırı unutulursa **her düzenlemede stok sessizce sıfırlanır** ve ürün satılamaz hale gelir — sebebi de kolay anlaşılmaz. Yeni bir alan eklendiğinde bu metot da güncellenmelidir.
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

Uygulandığı yerler: `CartController.updateItemQuantity`, `CartController.removeItem`, `FavoriteController.deleteFavorite`, `OrderController.getOrder`, `OrderController.cancelOrder`.

> `cancelOrder` bu dört adımın üzerine bir beşincisini ekler: **durum geçişi geçerli mi?** Bu bir yetki sorusu değil, iş kuralı sorusudur — "bu senin siparişin mi" ile "bu sipariş şu an iptal edilebilir mi" ayrı sorulardır ve ayrı ayrı cevaplanır.

> **Not:** Sipariş kaydı ad, adres ve telefon içerdiği için `OrderController.getOrder`'daki kontrol diğerlerinden daha kritiktir; atlanırsa id deneyerek kişisel veri okunabilirdi. Bu kontrol **admin için de** sıkıdır: admin başkasının siparişini `/api/orders/{id}` üzerinden göremez, yolu `/api/admin/orders`'tır. Yetki, yetkinin tanımlı olduğu kapıdan verilir.

Dikkat edilecek iki nokta:

- **`.equals()` kullanılır, `==` değil.** `getId()` bir `Long` nesnesi döndürür; `==` referans karşılaştırır. Java `-128..127` aralığındaki `Long` değerlerini önbelleklediği için `==` küçük id'lerde çalışıyormuş gibi görünür, id'ler büyüyünce sessizce bozulur.
- **Yanıt, isteği yapanın verisiyle kurulur.** Örneğin `cartRepository.findByUserId(user.getId())` — `item.getCart().getUser().getId()` değil. Sahiplik kontrolünden sonra ikisi aynıdır, ancak ilki niyeti açık kılar ve kontrol ileride kaldırılsa bile başkasının verisini sızdırmaz.

---

## 🚦 Deneme Limiti (Rate Limiting)

Kimlik uçları sınırsız denenebilirse şifre ya da doğrulama kodu er geç bulunur: 6 haneli kod 1.000.000 ihtimaldir ve saniyede birkaç istekle 15 dakikadan kısa sürede taranabilir. `RateLimiter` bu uçlara bir üst sınır koyar.

| Uç | Anahtar | Limit | Ne sayılır |
| :--- | :--- | :--- | :--- |
| `/api/auth/register` | Kaynak IP | 5 / 10 dk | Her istek |
| `/api/auth/login` | E-posta | 5 / 10 dk | Yalnızca başarısız deneme |
| `/api/auth/verify` | E-posta | 5 / 10 dk | Yalnızca başarısız deneme |
| `/api/auth/resend` | E-posta | 3 / 10 dk | Her istek |

Limit aşılınca `429 Too Many Requests` döner; yanıtta hem açıklayıcı bir mesaj hem de standart `Retry-After` başlığı vardır. Frontend zaten `res.message`'ı gösterdiği için arayüz tarafında değişiklik gerekmedi.

**Sayaç kural taşımaz.** `RateLimiter.tryConsume(key, maxAttempts, window)` imzasında limit ve süre **parametredir**. Sayaç sayar, politikayı çağıran belirler; bu yüzden sınıf `EmailService` / `JwtService` ile aynı kategoriye — "birden çok yerden çağrılan, iş kuralı taşımayan teknik yardımcı" — girer ve *"ayrı service katmanı yok"* kuralını delmez. Limitler `AuthController` içinde sabit olarak durur (`LOGIN_MAX_ATTEMPTS`, `RATE_LIMIT_WINDOW` …), tıpkı `CartController.MAX_QUANTITY_PER_ITEM` gibi.

**Anahtar uca göre değişir, çünkü kötüye kullanım da değişir.** `login` / `verify` / `resend` için anahtar e-postadır: saldırgan belirli bir hesabı hedefler, ortak nokta o hesaptır. `register` için e-posta anahtarı **işe yaramaz** — kayıt ucu var olan adresi zaten `409` ile reddeder, saldırgan her istekte yeni bir adres kullanır ve her istek ayrı kovaya düşer. Orada ortak nokta kaynak IP'dir. Anahtarlar uç adıyla öneklenir (`"login:ali@x.com"`); önek olmasaydı login denemeleri verify kotasını yer ve kullanıcı neden yasaklandığını anlayamazdı.

**Kontrol metodun ilk satırındadır, `reset` ise sonuç belli olduktan sonra.** `login`'de limit kontrolü veritabanı sorgusundan ve bcrypt karşılaştırmasından **önce** yapılır; bcrypt kasten yavaştır (~100 ms) ve limitin koruduğu şeylerden biri de budur. Şifre doğrulanınca `reset` çağrılır — böylece "yalnızca başarısız denemeler sayılır" davranışı ayrı bir bayrak tutmadan elde edilir. `resend` ve `register`'da `reset` yoktur: orada başarı/başarısızlık ayrımı yok, her istek gerçek bir e-posta gönderiyor ve maliyet zaten oluşmuş oluyor.

> Kontrol neden bir `Filter` içinde değil? Anahtar için istek gövdesindeki e-posta gerekiyor; gövde akışı bir kez okunabilir, filtrede okunursa controller boş gövde görür. Ayrıca `reset` kararı işlemin sonucunu bilmeyi gerektirir, filtre bunu bilemez.

**Sabit pencere (fixed window).** Her anahtar için *(deneme sayısı, pencerenin bitiş anı)* tutulur. İlk deneme pencereyi başlatır, sonrakiler bitiş anını **değiştirmeden** sayıyı artırır. Sonuç: yasaklıyken denemeye devam etmek yasağı uzatmaz, süre dolunca sayaç kendiliğinden sıfırlanır ve ayrı bir zamanlanmış iş gerekmez.

**Tek nesne, çok thread.** `@Service` bileşenleri singleton'dır: uygulamada tek bir `RateLimiter` vardır ve eşzamanlı isteklerin hepsi **aynı** nesnenin metodunu **aynı anda** çalıştırır. Kullanıcıları birbirinden ayıran şey ayrı nesneler değil, haritadaki **anahtarlardır**. Sayaç bir alan (`private int count`) olarak tutulsaydı tek bir sayaç olurdu ve bir kullanıcının hatalı denemeleri herkesi kilitlerdi — singleton bileşenlerin klasik ve sessiz hatası budur.

**Yarış durumu, projedeki üçüncüsü.** Sayacı `get()` ile okuyup `put()` ile yazmak, sepet ve stok bölümlerindeki *kontrol ile davranış arasındaki boşluğun* birebir aynısıdır: aynı anahtara gelen iki eşzamanlı istek aynı sayıyı okur, aynı sayıyı yazar, bir deneme kaybolur ve limit paralel isteklerle delinir. Fark, hakemin kim olduğudur — sepette `UNIQUE` kısıtı, stokta koşullu `UPDATE`, burada `ConcurrentHashMap.compute()`. Üçü de okuma ile yazmayı tek bir atomik işlemde birleştirir.

**Bellek sınırı.** Harita `CLEANUP_THRESHOLD` (1000) girdiyi aştığında süresi dolmuş kayıtlar temizlenir; olmasaydı rastgele anahtarlarla istek atan biri haritayı sınırsız büyütebilirdi. İki ayrıntı önemlidir: temizliği aynı anda yalnızca bir thread üstlensin diye `AtomicBoolean.compareAndSet` ile bayrak kapılır (diğerleri beklemez, doğrudan kendi işine devam eder), ve silme **iki argümanlı** `remove(key, value)` ile yapılır — tarama sırasında yeni bir deneme pencereyi tazelemişse o taze sayaç silinmez.

**Bilinçli sınırlar:** Sayaçlar bellektedir, yani uygulama yeniden başlayınca sıfırlanır ve birden çok kopya çalışıyorsa her kopya kendi sayacını tutar (gerçek limit kopya sayısıyla çarpılır). Dağıtık bir kurulumda buranın yerini Redis benzeri ortak bir sayaç almalıdır. Ayrıca `login` limiti e-posta bazlı olduğu için, adresini bilen biri bir kullanıcıyı 10 dakika boyunca girişten alıkoyabilir; alternatifi olan IP anahtarı ise aynı ağdaki herkesi tek kovaya sokardı.

---

## 🗄️ Veritabanı Modelleri (Entities)

Backend tarafında JPA kullanılarak veritabanı tabloları ile nesneler eşleştirilmiştir:

- **`User` (Kullanıcı):** Sisteme giriş yapan veya varsayılan kullanıcıları tutar (`id`, `username`, `email`, `password` (BCrypt hash), `enabled`, `role`, `verificationCode`, `verificationExpiry`). Hassas alanlar (`password`, `verificationCode`, `verificationExpiry`) `@JsonIgnore` ile API yanıtlarına sızmaz. `role` alanı `"USER"` veya `"ADMIN"` değerini alır, varsayılanı `"USER"`'dır.
- **`Product` (Ürün):** Satışta olan ürünleri tutar (`id`, `name`, `description`, `price (BigDecimal)`, `imageUrl`, `category`, `stock (int)`). `stock` alanında `@ColumnDefault("0")` vardır: bu olmadan Hibernate kolonu `not null` olarak eklemeye çalışır, PostgreSQL ise **dolu bir tabloya varsayılansız NOT NULL kolon eklemeyi reddeder** ve `ddl-auto=update` açılışta patlar. `setStock` negatif değeri sıfıra çeker.
- **`Category` (Kategori):** Ürün kategorilerinin listesi (`id`, `name` — unique). Ürünle ilişki metin üzerinden kurulur (`Product.category`), foreign key yoktur.
- **`Banner` (Afiş):** Ana sayfa slider'ındaki görseller (`id`, `imageUrl`, `title`).
- **`Favorite` (Favori):** Hangi ürünün hangi kullanıcı tarafından favorilere eklendiğini temsil eder (`@ManyToOne User`, `@ManyToOne Product`).
- **`Cart` (Sepet):** Kullanıcıyla birebir (`@OneToOne`) eşleşen genel sepet nesnesi. `@OneToOne` sayesinde Hibernate `user_id` kolonuna bir **`UNIQUE` kısıtı** üretir — bir kullanıcının ikinci bir sepeti veritabanı seviyesinde imkânsızdır. `CartController.getOrCreateCart` bu kısıta güvenerek çalışır (bkz. *Sepet Yarış Durumu*).
- **`CartItem` (Sepet Öğesi):** Sepetin içindeki kalemleri tutar. Hangi sepette (`@ManyToOne Cart`), hangi üründen (`@ManyToOne Product`), kaç adet (`quantity`) olduğunu belirler.
- **`Order` (Sipariş):** Tamamlanmış bir siparişi tutar (`id`, `@ManyToOne User` (`@JsonIgnore`), `createdAt (Instant)`, `status`, `totalAmount (BigDecimal)`, teslimat alanları: `fullName`, `address`, `city`, `phone`, `note`, fatura alanları: `invoiceRequired`, `invoiceTitle`, `taxOffice`, `taxId`). Tablo adı `@Table(name = "orders")` ile verilir çünkü `order` SQL'de rezerve bir kelimedir (`ORDER BY`). `addItem()` ilişkinin iki ucunu birden kurar, `updateTotals()` kalemlerin ara toplamlarından genel toplamı hesaplar. `user` gizli olduğu için admin listesine `customerUsername` / `customerEmail` türetilmiş getter'larla açılır.
- **`OrderItem` (Sipariş Kalemi):** Sipariş anındaki ürün bilgilerinin kopyasını tutar (`productId` — **FK değil, düz alan**, `productName`, `imageUrl`, `unitPrice`, `quantity`). `@ManyToOne Order` alanı `@JsonIgnore`'dur; olmasaydı JSON üretimi `order → items → order` diye sonsuz döngüye girerdi.

### Sepet Yarış Durumu (Race Condition)

Sepet "kullanıcı ilk kez ihtiyaç duyduğunda oluşturulur" mantığıyla çalışır. Bu, klasik bir **"önce bak, yoksa oluştur"** kalıbıdır ve kontrol ile davranış arasında bir boşluk bırakır:

```java
Cart cart = cartRepository.findByUserId(user.getId());  // kontrol
if (cart == null) {
    cartRepository.save(new Cart(user));                // davranış
}
```

Sepeti henüz olmayan bir kullanıcının iki isteği aynı anda gelirse ikisi de kontrol anında `null` görür (çünkü hiçbiri henüz kaydetmemiştir) ve ikisi de oluşturmaya kalkar. Senaryo hayali değildir: giriş anında `CartContext` `GET /api/cart` atarken kullanıcının "Sepete Ekle"ye basması, ya da iki sekme açık olması yeterlidir.

**Bu boşluk kod tarafında kapatılamaz.** Kontrolü ne kadar sıkılaştırırsan sıkılaştır, iki isteğin arasına girme ihtimali durur; tek gerçek hakem veritabanıdır. Burada hakem `cart.user_id` üzerindeki `UNIQUE` kısıtıdır (Hibernate `@OneToOne`'dan üretir) — ikinci kaydı reddeder.

Dolayısıyla doğru çözüm **çakışmayı engellemeye çalışmak değil, beklemek ve kurtarmaktır.** `CartController.getOrCreateCart` bunu yapar:

```java
try {
    return cartRepository.save(new Cart(user));
} catch (DataIntegrityViolationException e) {
    // Yarışı kaybettik: bu arada başka bir istek sepeti oluşturdu.
    // Hata değil, beklenen sonuç — onun sepetiyle devam ediyoruz.
    return cartRepository.findByUserId(user.getId());
}
```

> Bu `catch` bloğu yakalamasaydı veri yine bozulmazdı (kısıt korur), ama kullanıcı tamamen normal bir durumda **500 Internal Server Error** görürdü. Yani buradaki kazanç veri bütünlüğü değil, dürüst hata davranışıdır.

### Stok Yarış Durumu (Race Condition)

Stok düşürmenin "doğal" hali sepet yarış durumunun birebir aynısıdır — kontrol ile davranış arasında yine bir boşluk vardır:

```java
if (product.getStock() >= adet) {                   // kontrol
    product.setStock(product.getStock() - adet);    // davranış
}
```

Stok 1 iken iki istek aynı anda gelirse ikisi de kontrol anında "1 var" görür, ikisi de düşürür; stok `-1` olur ve **aynı ürün iki kişiye satılır**.

Çözüm yine aynı: hakem veritabanı olmalı. Ama burada hakem bir kısıt değil, sorgunun kendisidir — kontrol ve davranış tek bir atomik `UPDATE`'te birleştirilir:

```java
@Modifying
@Query("UPDATE Product p SET p.stock = p.stock - :quantity WHERE p.id = :id AND p.stock >= :quantity")
int decreaseStock(@Param("id") Long id, @Param("quantity") int quantity);
```

`WHERE p.stock >= :quantity` kontroldür, `SET` davranıştır. Metodun **`int` dönmesi** kilit noktadır: kaç satır etkilendiğini verir. `0` dönerse stok yetmemiştir — bu bir hata değil, cevabın kendisidir.

> `@Modifying` şarttır; Spring Data varsayılan olarak `@Query`'nin okuma yaptığını varsayar.

### `@Transactional` içinde hata dönmek geri alma YAPMAZ

Stok düşürme kalem kalem ilerler. Üçüncü kalemde stok yetmezse ilk ikisinin stoğu **zaten düşmüştür.** Bu noktada şöyle yazmak sinsi bir veri bozulmasıdır:

```java
if (updated == 0) {
    return ResponseEntity.badRequest().body(...);   // ← TUZAK
}
```

Kullanıcı 400 alır, sipariş oluşmaz — ama ilk iki ürünün stoğu **kalıcı olarak düşer.** Çünkü Spring, bir metottan hata *yanıtı* dönmesini başarısızlık saymaz; `ResponseEntity` yalnızca bir nesnedir, metot normal biçimde tamamlanmıştır, transaction commit edilir. Kimsenin almadığı ürünler stoktan silinir.

Geri alma **yalnızca kontrolsüz (unchecked) bir istisna** ile tetiklenir:

```java
public static class InsufficientStockException extends RuntimeException { ... }

throw new InsufficientStockException(product.getName() + " için yeterli stok yok...");
```

`RuntimeException`'dan türetmek zorunludur; `Exception`'dan (checked) türetilseydi Spring varsayılan olarak geri **almazdı**. Kullanıcı yine anlamlı bir 400 görsün diye istisna `OrderController.handleInsufficientStock` (`@ExceptionHandler`) tarafından yakalanır. Sıralama doğrudur: istisna önce `@Transactional` sarmalayıcısından geçer (transaction geri alınır), **sonra** Spring MVC handler'ı çağırır.

> `checkout` metodundaki diğer erken `return`'ler (boş sepet, eksik adres) hâlâ düz `return`'dür — onlar hiçbir yazma yapılmadan önce çalışır, geri alınacak bir şey yoktur.

### Stok kontrolü üç yerdedir, ama üçü aynı şey değildir

| Yer | Görevi | Bağlayıcı mı |
| :--- | :--- | :--- |
| Frontend (buton pasif, "Tükendi") | Kullanıcı boşuna tıklamasın | Hayır |
| `CartController` (sepete ekleme / adet güncelleme) | Erken uyarı | Hayır |
| `OrderController.checkout` (koşullu UPDATE) | **Karar** | **Evet** |

Sepetteki kontrol neden garanti değildir: sepet bir rezervasyon değil, bir listedir. Ürün sepete konduktan sonra o stok başkası tarafından tüketilebilir. "Zaten sepette kontrol ettim" deyip checkout'taki kontrolü atlamak kolay bir hatadır ve tam da en pahalı yerde patlar.

---

## 🛠️ API Uç Noktaları (Endpoints)

Erişim sütunu: 🌐 herkese açık · 🔑 giriş gerekir · 👑 `ADMIN` rolü gerekir

| Metot | Uç Nokta (Endpoint) | Erişim | Açıklama |
| :--- | :--- | :---: | :--- |
| **POST** | `/api/auth/register` | 🌐 | Yeni üyelik oluşturur, doğrulama kodunu e-postaya gönderir. Gövde: `{username, email, password}`. Aynı IP 10 dakikada 5 kayıttan fazlasını yapamaz (429). |
| **POST** | `/api/auth/verify` | 🌐 | E-postadaki kodu doğrular, hesabı aktifleştirir ve JWT döner. Gövde: `{email, code}`. 10 dakikada 5 başarısız denemeden sonra 429. |
| **POST** | `/api/auth/login` | 🌐 | E-posta + şifre ile giriş, JWT döner. Gövde: `{email, password}`. 10 dakikada 5 başarısız denemeden sonra 429. |
| **POST** | `/api/auth/resend` | 🌐 | Doğrulama kodunu yeniden gönderir. Gövde: `{email}`. 10 dakikada en fazla 3 istek (429). |
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
| **GET** | `/api/favorites` | 🔑 | Kullanıcının favorilerini listeler (`userId` parametresi iptal edildi, JWT'den okunur). |
| **POST** | `/api/favorites` | 🔑 | Favoriye ekler. Gövde: `{productId}`. Ürün zaten favorideyse 409 döner. Yanıt, oluşan **favori kaydını** (id'siyle birlikte) içerir. |
| **DELETE** | `/api/favorites/{id}` | 🔑 | Favoriden çıkarır. Buradaki `id` ürünün değil, **favori kaydının** id'sidir. Sahiplik kontrolü vardır: başkasının favorisinde 403. |
| **GET** | `/api/cart` | 🔑 | Giriş yapan kullanıcının sepetini ve içindeki öğeleri getirir. |
| **POST** | `/api/cart/items` | 🔑 | Sepete yeni ürün ekler (veya miktarını artırır). Gövde: `{productId, quantity}`. Ürün sepette zaten varsa **mevcut + gelen** adet sınırı (100) aşarsa 400 + mesaj döner. Stok 0 ise veya toplam adet stoğu aşarsa 400 + mesaj. |
| **PUT** | `/api/cart/items/{itemId}?quantity=X` | 🔑 | Sepetteki bir ürünün miktarını günceller. `X > 100` veya `X > stok` ise 400 + mesaj; `X <= 0` ise kalem silinir. Sahiplik kontrolü vardır. |
| **DELETE** | `/api/cart/items/{itemId}` | 🔑 | İlgili ürünü sepetten tamamen çıkartır. |
| **POST** | `/api/orders` | 🔑 | Sepeti siparişe çevirir, **stoğu düşürür** ve sepeti boşaltır. Gövde: `{fullName, address, city, phone, note?, invoiceRequired?, invoiceTitle?, taxOffice?, taxId?}`. Boş sepette 400. Herhangi bir kalemde stok yetmezse 400 + mesaj döner ve **tüm işlem geri alınır**. |
| **GET** | `/api/orders` | 🔑 | Kullanıcının siparişlerini listeler (en yenisi üstte). |
| **GET** | `/api/orders/{id}` | 🔑 | Tek siparişi getirir. Sahiplik kontrolü vardır: başkasının siparişinde 403. |
| **PUT** | `/api/orders/{id}/cancel` | 🔑 | Kullanıcının kendi siparişini iptal eder ve **stoğu geri ekler**. Gövde yok. Sahiplik kontrolü vardır (403). Durum `NEW` / `PREPARING` değilse 400 + mesaj. Güncel siparişi döner. |
| **GET** | `/api/admin/orders` | 👑 | Tüm siparişleri listeler (en yenisi üstte). |
| **PUT** | `/api/admin/orders/{id}/status` | 👑 | Sipariş durumunu günceller. Gövde: `{status}`. Tanımlı olmayan durum 400 döner. |

---

## 💻 Geliştirici Ortamı (Nasıl Çalıştırılır?)

Sırayla üç şey ayağa kalkar: **veritabanı → backend → frontend.** Veritabanı olmadan backend açılışta hata verir, `NEXT_PUBLIC_API_URL` olmadan frontend hiçbir veri çekemez.

**1. Veritabanını Başlatmak (önce bu):**
1. Proje kökünde `docker compose up -d` çalıştırın. Bu, kökteki `docker-compose.yml` ile `product-db` adında bir PostgreSQL 16 container'ı ayağa kaldırır (`productdb` veritabanı, port `5432`, kullanıcı/şifre `postgres`).
2. Kontrol: `docker ps` çıktısında `product-db` görünmeli.

> Veriler `pgdata` adlı Docker volume'unda kalıcıdır; container'ı `docker compose down` ile durdurmak veriyi silmez (silmek için `docker compose down -v`).
>
> Bağlantı bilgileri `application.properties` içinde sabittir; farklı bir veritabanı kullanacaksanız orayı düzenleyin. Aşağıdaki "Kendini Admin Yapma" bölümündeki `docker exec product-db ...` komutları da bu container'ı hedefler.

**2. Backend'i Çalıştırmak:**
1. `productapi` klasörüne gidin.
2. Terminalde `mvnw spring-boot:run` (Mac/Linux için `./mvnw spring-boot:run`, Windows PowerShell için `.\mvnw spring-boot:run`) komutunu çalıştırın.
3. API `http://localhost:8080` adresinde açılır.

*Not: Uygulama ilk kalktığında `ProductapiApplication` içerisindeki seed datalar ile veritabanına örnek ürünler ve varsayılan kullanıcı (ID:1) eklenecektir.*

**3. Frontend'i Çalıştırmak:**
1. `frontend` klasörüne gidin.
2. Bağımlılıkları yükleyin: `npm install`
3. **`frontend/.env.local` dosyasını oluşturun** ve backend adresini yazın:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8080
   ```
4. Geliştirici sunucusunu başlatın: `npm run dev`
5. Tarayıcınızda `http://localhost:3000` adresine giderek projeyi görüntüleyin.

> **3. adım atlanamaz.** `.env.local` dosyası `.gitignore`'dadır, yani projeyi klonlayan kimseye gelmez. `useApi` base URL'i bu değişkenden okur; tanımsızsa her istek `undefined/api/...` adresine gider. Uygulama hata vermeden açılır ama hiçbir ürün, sepet veya sipariş görünmez — bu yüzden teşhisi zor bir hatadır. Değişken adının `NEXT_PUBLIC_` ile başlaması zorunludur; Next.js yalnızca bu öneke sahip değişkenleri tarayıcıya gönderir.

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

> **Not (Geliştirme modu):** Yukarıdaki değişkenlerin **hiçbiri zorunlu değildir**; üçünün de `application.properties` içinde varsayılanı vardır ve uygulama onlarsız da ayağa kalkar:
> - `MAIL_USERNAME` / `MAIL_PASSWORD` verilmezse doğrulama kodu e-posta yerine **backend konsoluna** yazılır (`[Auth] ... Kod: 123456`). Test için pratiktir.
> - `JWT_SECRET` verilmezse koddaki `dev-only-secret-change-me-please-32bytes-min!!` kullanılır. Bu değer herkese açık depoda durduğu için **üretimde mutlaka geçersiz kılınmalıdır** — bilen biri kendine istediği kullanıcı için geçerli token üretebilir.
>
> **Güvenlik:** App Password ve `JWT_SECRET` gibi bilgileri asla kod içine yazmayın veya GitHub'a pushlamayın.
>
> **Token ömrü:** Üretilen JWT **24 saat** geçerlidir (`app.jwt.expiration-ms=86400000`). Süre dolunca kullanıcı yeniden giriş yapmalıdır.

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

### 📦 Mevcut Veritabanına Stok Kolonu

`stock` kolonu da `ddl-auto=update` ile otomatik eklenir (`@ColumnDefault("0")` sayesinde dolu tabloda da sorun çıkarmaz). Yine de eklenmezse elle:

```powershell
docker exec product-db psql -U postgres -d productdb -c "ALTER TABLE product ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0;"
```

**Önemli:** Varsayılan `0`'dır, yani stok özelliği eklendikten sonra **eski ürünlerin hepsi "Tükendi" görünür.** Geliştirme ortamında toplu doldurmak için:

```powershell
docker exec product-db psql -U postgres -d productdb -c "UPDATE product SET stock = 20 WHERE stock = 0;"
```

---

## 🚧 Bilinen Açıklar (Sıradaki İşler)

Dürüst kalsın diye not düşülmüştür; henüz **kapatılmamıştır**:

**Güvenlik**

1. **Deneme limiti tek sunucuya özeldir:** Sayaçlar uygulama belleğinde tutuluyor. Uygulama yeniden başlayınca sıfırlanıyorlar, birden çok kopya çalıştırılırsa her kopya kendi sayacını tuttuğu için gerçek limit kopya sayısıyla çarpılıyor. Ortak bir sayaç (Redis vb.) gerekir.
2. **Login limiti kilitlemeye açık:** Anahtar e-posta olduğu için, adresini bilen biri 5 yanlış denemeyle bir kullanıcıyı 10 dakika girişten alıkoyabilir. Bilinen bir takas: IP anahtarı ise aynı ağdaki herkesi tek kovaya sokardı.

**Hata yönetimi / veri bütünlüğü**

3. **Şifre değişince eski token'lar geçerli kalıyor:** JWT'de iptal (revocation) mekanizması yok; şifresini değiştiren kullanıcının önceki token'ı süresi dolana kadar çalışmaya devam eder.

**Kod kalitesi**

4. **Test yok:** Yalnızca varsayılan `contextLoads` testi mevcut. Sipariş akışı (sahiplik kontrolü, snapshot, sepetin boşalması, iptal durum geçişleri) test edilmeye en uygun yer.
5. **Toast kodu üç kez kopyalanmış:** `Header.tsx` içinde favori bildirimi, `loginRequired` ve `cartError` neredeyse aynı inline-style bloğunu tekrar ediyor; tek bir `Toast` bileşenine çıkması gerekir.

> **Kapatılanlar:**
> - Kimlik uçlarına deneme limiti eklendi (`RateLimiter`); `register` / `login` / `verify` / `resend` artık sınırsız denenemiyor, limit aşılınca `429` + `Retry-After` dönüyor (bkz. *Deneme Limiti*). Sayaç genel amaçlı bir teknik yardımcıdır, limitleri `AuthController` belirler. Yol boyunca öğrenilen: kayıt ucunda e-posta anahtarı işe yaramaz — saldırgan her istekte yeni adres kullandığı için limit hiç tetiklenmez; oradaki ortak nokta kaynak IP'dir.
> - Sepet yarış durumu ele alındı. (Not: bu madde eskiden "`Cart.user` üzerinde unique kısıtı yok, iki sepet oluşabilir" diye yazılmıştı; **yanlıştı**. Hibernate `@OneToOne`'dan kısıtı üretmiş, canlı şemada `cart.user_id` üzerinde `UNIQUE` duruyor. Yani veri bütünlüğü hiç bozulmuyordu; asıl sorun, kısıtın reddettiği ikinci kaydın yakalanmaması ve kullanıcının 500 almasıydı.) Sepet oluşturma tek bir `getOrCreateCart` metoduna toplandı, `DataIntegrityViolationException` yakalanıp yarışı kazanan isteğin sepeti okunuyor.
> - Sepetteki adet sınırı gerçekten uygulanıyor: sınır `CartController.MAX_QUANTITY_PER_ITEM` sabitinde tek yerde tanımlı, ekleme (POST) **toplam** adede bakıyor ve güncelleme (PUT) ucuna da üst sınır kondu. Reddedilen istekler artık gövdesiz 400 yerine sebep mesajı dönüyor, arayüz de bunu toast olarak gösteriyor.
> - Kullanılmayan artıklar temizlendi: boş `string.java` sınıfı silindi, `CartController`'daki kullanılmayan `userRepository` enjeksiyonu kaldırıldı, `Header.tsx`'teki `import { title } from "process"` ve `layout.tsx`'teki kullanılmayan `Link` / `styles` import'ları atıldı, varsayılan "Create Next App" metadata'sı proje adıyla değiştirildi ve `<html lang>` `tr` yapıldı.
> - Ürün / kategori / banner yazma uçları `ADMIN` rolüne kilitlendi, `/admin` sayfaları rol kontrolüyle sarmalandı.
> - Sepet ve favorilerdeki **IDOR** açıkları kapatıldı (sahiplik kontrolü — bkz. *Yetkilendirme Modeli*).
> - Frontend'in tamamı `useApi` kullanıyor; gömülü API adresi kalmadı, token yalnızca `AuthContext` tarafından okunuyor/yazılıyor.
> - `FavoriteController` hataları `RuntimeException` (500) yerine anlamlı HTTP kodlarıyla dönüyor.
> - Sipariş / checkout akışı eklendi; `OrderController.getOrder` sahiplik kontrolüyle korunuyor.
> - Hesap silme artık siparişleri de temizliyor. (Önceden `Order.user` foreign key'i yüzünden siparişi olan kullanıcı hesabını silemezdi.)
> - Kullanıcı kendi siparişini iptal edebiliyor (`PUT /api/orders/{id}/cancel`). Yetki adminin durum ucundan ödünç alınmadı, ayrı bir uç açıldı: kullanıcıya "durum değiştirme" değil "iptal etme" yetkisi verildi.
> - Stok takibi eklendi. (Bu madde eskiden "kapsam dışı" diye yazılıydı.) Stok siparişte düşer, iptalde geri gelir; düşürme koşullu tek bir UPDATE olduğu için son ürün iki kişiye satılamaz. Yol boyunca `@Transactional` içinde hata **yanıtı** dönmenin geri alma yapmadığı öğrenildi — stok yetmediğinde artık istisna fırlatılıyor.
