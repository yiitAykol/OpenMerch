# StackBootProject - Proje Dokümantasyonu

Bu doküman, Spring Boot ve Next.js kullanılarak geliştirilen "StackBootProject" e-ticaret demo uygulamasının genel yapısını, teknolojilerini ve mevcut özelliklerini (özellikle son eklenen Sepet altyapısını) özetler.

## 🚀 Teknoloji Yığını (Tech Stack)

### Backend (API Katmanı)
- **Dil / Çerçeve:** Java, Spring Boot
- **Veri Erişim:** Spring Data JPA (Hibernate)
- **Mimari:** RESTful API mimarisi (Controller, Service/Repository, Entity katmanları)
- **Veri Tipleri:** Finansal hesaplamalar için `BigDecimal` kullanımı.
- **Güvenlik / Kimlik Doğrulama:** Spring Security, JWT (jjwt), şifreler için BCrypt hash.
- **E-posta:** Spring Mail (Gmail SMTP) ile doğrulama kodu gönderimi.

### Frontend (Kullanıcı Arayüzü)
- **Dil / Çerçeve:** TypeScript, React, Next.js (App Router)
- **State Yönetimi:** React Context API (`CartContext`, `AuthContext`)
- **Oturum:** JWT token'ı `localStorage`'da tutulur, korumalı isteklerde `Authorization: Bearer` başlığıyla gönderilir.
- **Stillendirme:** SCSS Modules (`.module.scss`) ve Global CSS.

---

## 🎯 Mevcut Özellikler (Features)

0. **Üyelik & Kimlik Doğrulama (Authentication) - *[YENİ]* **
   - **Üye Olma (`/register`):** Kullanıcı adı, e-posta ve şifre (en az 6 karakter) ile kayıt. Şifre veritabanına **BCrypt ile hash'lenerek** yazılır; hesap başlangıçta pasiftir (`enabled=false`).
   - **E-posta Doğrulama (`/verify`):** Kayıt sırasında 6 haneli rastgele bir kod üretilir ve kullanıcının e-postasına (Gmail SMTP) gönderilir. Kodun **15 dakika** geçerlilik süresi vardır. Doğru kod girilince hesap aktifleşir ve JWT token verilir. Kod gelmezse "Tekrar gönder" (`/resend`) desteği vardır.
   - **Giriş (`/login`):** E-posta + şifre kontrolü. Hesap doğrulanmamışsa girişe izin verilmez, kullanıcı doğrulama ekranına yönlendirilir. Başarılı girişte **JWT token** döner.
   - **Oturum Yönetimi:** Token frontend'de `AuthContext` üzerinden `localStorage`'da tutulur. Sayfa yenilendiğinde `/api/auth/me` ile kullanıcı geri yüklenir. Header'da girişliyse kullanıcı adı + "Çıkış", değilse "Giriş / Üye Ol" gösterilir.
   - **Güvenlik:** REST API stateless çalışır (sunucuda session yok). `/api/auth/me` gibi korumalı uç noktalara yalnızca geçerli JWT ile erişilebilir; diğer uç noktalar (vitrin, sepet) şimdilik açıktır.

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

- **`User` (Kullanıcı):** Sisteme giriş yapan veya varsayılan kullanıcıları tutar (`id`, `username`, `email`, `password` (BCrypt hash), `enabled`, `verificationCode`, `verificationExpiry`). Hassas alanlar (`password`, `verificationCode`, `verificationExpiry`) `@JsonIgnore` ile API yanıtlarına sızmaz.
- **`Product` (Ürün):** Satışta olan ürünleri tutar (`id`, `name`, `description`, `price (BigDecimal)`, `imageUrl`).
- **`Favorite` (Favori):** Hangi ürünün favorilere eklendiğini temsil eder.
- **`Cart` (Sepet):** Kullanıcıyla birebir (`@OneToOne`) eşleşen genel sepet nesnesi.
- **`CartItem` (Sepet Öğesi):** Sepetin içindeki kalemleri tutar. Hangi sepette (`@ManyToOne Cart`), hangi üründen (`@ManyToOne Product`), kaç adet (`quantity`) olduğunu belirler.

---

## 🛠️ API Uç Noktaları (Endpoints)

| Metot | Uç Nokta (Endpoint) | Açıklama |
| :--- | :--- | :--- |
| **POST** | `/api/auth/register` | Yeni üyelik oluşturur, doğrulama kodunu e-postaya gönderir. Gövde: `{username, email, password}`. |
| **POST** | `/api/auth/verify` | E-postadaki kodu doğrular, hesabı aktifleştirir ve JWT döner. Gövde: `{email, code}`. |
| **POST** | `/api/auth/login` | E-posta + şifre ile giriş, JWT döner. Gövde: `{email, password}`. |
| **POST** | `/api/auth/resend` | Doğrulama kodunu yeniden gönderir. Gövde: `{email}`. |
| **GET** | `/api/auth/me` | **(Korumalı)** `Authorization: Bearer <token>` ile gelen kullanıcının bilgisini döner. |
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

**Frontend'i Çalıştırmak:**
1. `frontend` klasörüne gidin.
2. Bağımlılıkları yükleyin: `npm install`
3. Geliştirici sunucusunu başlatın: `npm run dev`
4. Tarayıcınızda `http://localhost:3000` adresine giderek projeyi görüntüleyin.
