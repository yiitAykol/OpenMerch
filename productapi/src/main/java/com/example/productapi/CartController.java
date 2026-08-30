package com.example.productapi;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private ProductRepository productRepository;

    // Bir üründen sepete alınabilecek en fazla adet. Hem ekleme (POST) hem de
    // güncelleme (PUT) ucunda geçerlidir; ikisinden biri kontrolsüz kalırsa
    // sınırın hiçbir anlamı kalmaz.
    private static final int MAX_QUANTITY_PER_ITEM = 100;

    // Kullanıcının sepetini getirir, yoksa oluşturur.
    //
    // "Önce bak, yoksa oluştur" bir yarış durumu barındırır: sepeti henüz olmayan
    // bir kullanıcının iki isteği aynı anda gelirse ikisi de "sepet yok" görür ve
    // ikisi de oluşturmaya kalkar. Bu boşluk kod tarafında kapatılamaz; tek gerçek
    // hakem veritabanıdır. cart.user_id üzerindeki UNIQUE kısıtı ikinci kaydı
    // reddeder, biz de burada o reddi yakalayıp yarışı kazanan isteğin oluşturduğu
    // sepeti okuruz. Yakalanmazsa kullanıcı bu tamamen normal durumda 500 alır.
    private Cart getOrCreateCart(User user) {
        Cart cart = cartRepository.findByUserId(user.getId());
        if (cart != null) {
            return cart;
        }
        try {
            return cartRepository.save(new Cart(user));
        } catch (DataIntegrityViolationException e) {
            // Yarışı kaybettik: bu arada başka bir istek sepeti oluşturdu.
            // Hata değil, beklenen sonuç — onun sepetiyle devam ediyoruz.
            return cartRepository.findByUserId(user.getId());
        }
    }

    // Get Cart for User
    @GetMapping
    public ResponseEntity<Cart> getCart(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return ResponseEntity.ok(getOrCreateCart(user));
    }

    public static class CartItemRequest {
        @NotNull(message = "productId zorunludur.")
        public Long productId;
        // Adet sınırı bilerek anotasyona taşınmadı: üst sınır MAX_QUANTITY_PER_ITEM
        // sabitinde tek yerde duruyor ve mesajı o sabitten kuruluyor. @Max(...) ile
        // birlikte sayıyı bir de mesaj metnine yazmak gerekirdi; iki kopya zamanla
        // ayrışır. Ayrıca asıl kural "mevcut + gelen adet" üzerinden işliyor,
        // onu tek bir alana bakan anotasyon zaten ifade edemez.
        public int quantity;
    }

    @PostMapping("/items")
    public ResponseEntity<?> addItemToCart(Authentication authentication, @Valid @RequestBody CartItemRequest request) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // Tek istekteki adet sınırı. Bu kontrol TEK BAŞINA yeterli değildir:
        // aynı ürün için üst üste istek atılabilir, o yüzden aşağıda sepetteki
        // toplam adet de kontrol edilir.
        if (request.quantity <= 0 || request.quantity > MAX_QUANTITY_PER_ITEM) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Adet 1 ile " + MAX_QUANTITY_PER_ITEM + " arasında olmalıdır."));
        }

        Optional<Product> productOpt = productRepository.findById(request.productId);
        if (productOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ürün bulunamadı."));
        }
        Product product = productOpt.get();

        if (product.getStock() <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Bu ürün tükendi."));
        }

        // Sepet, girdiler doğrulandıktan sonra alınır: geçersiz bir istek yüzünden
        // boş yere sepet oluşturmanın anlamı yok.
        Cart cart = getOrCreateCart(user);

        Optional<CartItem> existingItem = cart.getItems().stream()
                .filter(item -> item.getProduct().getId().equals(product.getId()))
                .findFirst();

        if (existingItem.isPresent()) {
            CartItem item = existingItem.get();
            // Sepette zaten bu üründen varsa sınır, mevcut adet + gelen adet
            // üzerinden hesaplanır. Yalnızca gelen adede bakmak sınırı delerdi:
            // 50'yi üç kez gönderen 150 adete ulaşır ve bu miktar siparişe geçerdi.
            int newQuantity = item.getQuantity() + request.quantity;
            if (newQuantity > MAX_QUANTITY_PER_ITEM) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "Bir üründen en fazla " + MAX_QUANTITY_PER_ITEM
                                + " adet alabilirsiniz. Sepetinizde şu an " + item.getQuantity() + " adet var."));
            }
            if (newQuantity > product.getStock()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "Stokta yalnızca " + product.getStock() + " adet var."
                                + " Sepetinizde şu an " + item.getQuantity() + " adet bulunuyor."));
            }
            item.setQuantity(newQuantity);
            cartItemRepository.save(item);
        } else {
            if (request.quantity > product.getStock()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "Stokta yalnızca " + product.getStock() + " adet var."));
            }
            CartItem newItem = new CartItem(cart, product, request.quantity);
            cartItemRepository.save(newItem);
            cart.getItems().add(newItem);
        }

        return ResponseEntity.ok(cartRepository.findByUserId(user.getId()));
    }


        // Update quantity
    @PutMapping("/items/{itemId}")
    public ResponseEntity<?> updateItemQuantity(Authentication authentication,
                                                @PathVariable Long itemId,
                                                @RequestParam int quantity) {
        // 1) Kimlik: isteği kim yapıyor?
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // 2) Nesneyi bul
        Optional<CartItem> itemOpt = cartItemRepository.findById(itemId);
        if (itemOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        CartItem item = itemOpt.get();

        // 3) Sahiplik: bu kalem gerçekten bu kullanıcının sepetinde mi?
        if (!item.getCart().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // 4) İşlem
        // Adet doğrudan buradan da set edilebildiği için sınır burada da gerekir;
        // yoksa POST'taki kontrol bir işe yaramaz, istemci tek PUT ile istediği
        // sayıyı yazar.
        if (quantity > MAX_QUANTITY_PER_ITEM) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Bir üründen en fazla " + MAX_QUANTITY_PER_ITEM + " adet alabilirsiniz."));
        }

        // Stok sınırı da tıpkı adet sınırı gibi iki uçta birden gerekir; yoksa
        // istemci tek bir PUT ile stoğun üzerine çıkar.
        //
        // Not: buradaki kontrol bir KOLAYLIKTIR, garanti değildir. Sepet bir
        // rezervasyon değil, bir listedir — kullanıcı sepete koyduktan sonra stok
        // başkası tarafından tüketilebilir. Bağlayıcı kontrol checkout'taki
        // koşullu UPDATE'tir; burası sadece kullanıcıyı erken uyarır.
        Product product = item.getProduct();
        if (product != null && quantity > product.getStock()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Stokta yalnızca " + product.getStock() + " adet var."));
        }

        if (quantity <= 0) {
            cartItemRepository.delete(item);
        } else {
            item.setQuantity(quantity);
            cartItemRepository.save(item);
        }

        return ResponseEntity.ok(cartRepository.findByUserId(user.getId()));
    }


    // Remove item
    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<Cart> removeItem(Authentication authentication, @PathVariable Long itemId) {
        // 1) Kimlik
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // 2) Nesneyi bul
        Optional<CartItem> itemOpt = cartItemRepository.findById(itemId);
        if (itemOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        CartItem item = itemOpt.get();

        // 3) Sahiplik
        if (!item.getCart().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // 4) İşlem
        cartItemRepository.delete(item);
        return ResponseEntity.ok(cartRepository.findByUserId(user.getId()));
    }

}
