package com.example.productapi;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    // Kullanıcının kendi siparişini iptal edebileceği durumlar. Kural tek yerde
    // dursun diye sabit; if içine gömülürse ileride "hangi durumlar iptal
    // edilebilir" sorusunun cevabı koda dağılır.
    private static final Set<String> CANCELLABLE_STATUSES = Set.of("NEW", "PREPARING");

    private final OrderRepository orderRepository;
    private final CartRepository cartRepository;
    private final ProductRepository productRepository;

    public OrderController(OrderRepository orderRepository,
                           CartRepository cartRepository,
                           ProductRepository productRepository) {
        this.orderRepository = orderRepository;
        this.cartRepository = cartRepository;
        this.productRepository = productRepository;
    }

    // Stok yetmediğinde fırlatılır.
    //
    // Neden istisna, neden `return ResponseEntity.badRequest()` değil:
    // checkout metodu @Transactional'dır ve stok düşürme işlemi kalem kalem
    // ilerler. Üçüncü kalemde stok yetmezse ilk ikisinin stoğu ZATEN düşmüştür.
    // Spring, bir metottan hata YANITI dönmesini "başarısızlık" saymaz —
    // transaction commit edilir ve o iki düşüş kalıcı olur. Geri alma yalnızca
    // kontrolsüz (unchecked) bir istisna ile tetiklenir. Bu sınıfın tek varlık
    // sebebi budur.
    public static class InsufficientStockException extends RuntimeException {
        public InsufficientStockException(String message) {
            super(message);
        }
    }

    // Yukarıdaki istisna buraya düşer ve kullanıcıya 400 + sebep olarak döner.
    // Sıralama önemli: istisna önce @Transactional sarmalayıcısından geçer
    // (transaction geri alınır), sonra Spring MVC bu metodu çağırır.
    @ExceptionHandler(InsufficientStockException.class)
    public ResponseEntity<?> handleInsufficientStock(InsufficientStockException e) {
        return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
    }

    // Checkout formundan gelen teslimat/fatura bilgileri.
    public static class CheckoutRequest {
        public String fullName;
        public String address;
        public String city;
        public String phone;
        public String note;
        public Boolean invoiceRequired;
        public String invoiceTitle;
        public String taxOffice;
        public String taxId;
    }

    // SİPARİŞ OLUŞTURMA: sepeti siparişe çevirir ve sepeti boşaltır.
    //
    // @Transactional şart: sipariş kaydı ile sepetin boşaltılması tek bir işlem.
    // Ortada bir hata olursa ikisi birden geri alınır; aksi halde "sipariş oluştu
    // ama sepet duruyor" ya da "sepet boşaldı ama sipariş kaydedilmedi" gibi
    // yarım durumlar kalırdı.
    @PostMapping
    @Transactional
    public ResponseEntity<?> checkout(Authentication authentication, @RequestBody CheckoutRequest req) {
        // 1) Kimlik
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // 2) Teslimat bilgileri zorunlu
        if (isBlank(req.fullName) || isBlank(req.address) || isBlank(req.city) || isBlank(req.phone)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Ad soyad, adres, şehir ve telefon zorunludur."));
        }

        boolean invoiceRequired = Boolean.TRUE.equals(req.invoiceRequired);
        if (invoiceRequired && (isBlank(req.invoiceTitle) || isBlank(req.taxId))) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Fatura için fatura başlığı ve vergi/TC numarası zorunludur."));
        }

        // 3) Sepet dolu mu?
        Cart cart = cartRepository.findByUserId(user.getId());
        if (cart == null || cart.getItems().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Sepetiniz boş."));
        }

        // Sepeti birazdan boşaltacağımız için kalemlerin kopyasıyla çalışıyoruz.
        List<CartItem> cartItems = new ArrayList<>(cart.getItems());

        // 4) Siparişi kur
        Order order = new Order(user, Instant.now(), "NEW");
        order.setFullName(req.fullName.trim());
        order.setAddress(req.address.trim());
        order.setCity(req.city.trim());
        order.setPhone(req.phone.trim());
        order.setNote(req.note == null ? null : req.note.trim());
        order.setInvoiceRequired(invoiceRequired);
        if (invoiceRequired) {
            order.setInvoiceTitle(req.invoiceTitle.trim());
            order.setTaxId(req.taxId.trim());
            order.setTaxOffice(req.taxOffice == null ? null : req.taxOffice.trim());
        }

        for (CartItem cartItem : cartItems) {
            Product product = cartItem.getProduct();
            // Ürün silinmişse sepette artık kalemi olmamalı; yine de yarım sipariş
            // oluşturmaktansa isteği reddediyoruz. Buraya kadar hiçbir yazma
            // yapılmadığı için düz `return` güvenli.
            if (product == null) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "Sepetinizde artık satışta olmayan bir ürün var. Lütfen sepetinizi yenileyin."));
            }

            // STOK DÜŞÜRME. Kontrol ve düşürme tek bir atomik UPDATE'te birleşir;
            // "önce stoğa bak, sonra düşür" deseydik son ürünü iki kişiye satardık.
            // Sıfır satır etkilendiyse stok yetmemiştir.
            int updated = productRepository.decreaseStock(product.getId(), cartItem.getQuantity());
            if (updated == 0) {
                // Buradan sonrası kritik: önceki kalemlerin stoğu zaten düşmüş
                // olabilir. Yanıt döndürmek transaction'ı geri ALMAZ, istisna alır.
                throw new InsufficientStockException(
                        product.getName() + " için yeterli stok yok. Sepetinizi güncelleyip tekrar deneyin.");
            }

            // Fiyat/isim/görsel burada kopyalanır (snapshot) — ürün sonradan
            // değişse veya silinse bile sipariş geçmişi olduğu gibi kalır.
            order.addItem(new OrderItem(product, cartItem.getQuantity()));
        }

        order.updateTotals();
        orderRepository.save(order); // cascade = ALL sayesinde kalemler de kaydedilir

        // 5) Sepeti boşalt (orphanRemoval = true kalemleri de siler)
        cart.getItems().clear();
        cartRepository.save(cart);

        return ResponseEntity.status(HttpStatus.CREATED).body(order);
    }

    // SİPARİŞ GEÇMİŞİ: yalnızca isteği yapanın siparişleri, en yenisi üstte.
    @GetMapping
    public ResponseEntity<List<Order>> getMyOrders(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(orderRepository.findByUserIdOrderByCreatedAtDesc(user.getId()));
    }

    // TEK SİPARİŞ: id ile geldiği için sahiplik kontrolü şart (IDOR).
    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrder(Authentication authentication, @PathVariable Long id) {
        // 1) Kimlik
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // 2) Nesneyi bul
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) {
            return ResponseEntity.notFound().build();
        }

        // 3) Sahiplik: başkasının siparişi görüntülenemez
        if (order.getUser() == null || !order.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // 4) İşlem
        return ResponseEntity.ok(order);
    }

    // SİPARİŞ İPTALİ: kullanıcı kendi siparişini iptal eder.
    //
    // Adminin /api/admin/orders/{id}/status ucu bilerek paylaşılmıyor: o uç
    // ADMIN'e kilitli ve keyfî durum yazmaya izin verir. Buradaki yetki
    // "durum değiştirme" değil, "kendi siparişini iptal etme" yetkisidir.
    @PutMapping("/{id}/cancel")
    @Transactional
    public ResponseEntity<?> cancelOrder(Authentication authentication, @PathVariable Long id) {
        // 1) Kimlik
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // 2) Nesneyi bul
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) {
            return ResponseEntity.notFound().build();
        }

        // 3) Sahiplik: başkasının siparişi iptal edilemez (IDOR)
        if (order.getUser() == null || !order.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // 4) Durum geçişi geçerli mi? Kargoya verilmiş ya da teslim edilmiş bir
        //    sipariş geri alınamaz; zaten iptal edilmişi tekrar iptal etmek de
        //    sessizce başarılı sayılmamalı — kullanıcı yanlış geri bildirim alır.
        if (!CANCELLABLE_STATUSES.contains(order.getStatus())) {
            String message = "CANCELLED".equals(order.getStatus())
                    ? "Bu sipariş zaten iptal edilmiş."
                    : "Kargoya verilmiş veya teslim edilmiş bir sipariş iptal edilemez.";
            return ResponseEntity.badRequest().body(Map.of("message", message));
        }

        // 5) İşlem: stoğu geri ekle, sonra durumu değiştir.
        //
        // @Transactional burada şart: stok geri eklemeleri ile durum değişikliği
        // tek bir işlem olmalı. Aksi halde araya giren bir hata "stok geri geldi
        // ama sipariş hâlâ aktif" gibi yarım bir durum bırakabilirdi.
        for (OrderItem item : order.getItems()) {
            // productId FK değildir; ürün silinmiş olabilir. O zaman sorgu 0 satır
            // etkiler ve bu normaldir — geri eklenecek bir stok kalmamıştır.
            if (item.getProductId() != null) {
                productRepository.increaseStock(item.getProductId(), item.getQuantity());
            }
        }

        order.setStatus("CANCELLED");
        return ResponseEntity.ok(orderRepository.save(order));
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
