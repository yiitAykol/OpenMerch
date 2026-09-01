package com.example.productapi;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/api/products")
public class ProductController{

    private final ProductRepository repository;
    private final CartItemRepository cartItemRepository;
    private final FavoriteRepository favoriteRepository;
    
    // Spring repository'yi buraya otomatik verir (dependency injection)
    public ProductController(ProductRepository repository, CartItemRepository cartItemRepository, FavoriteRepository favoriteRepository) {
        this.repository = repository;
        this.cartItemRepository = cartItemRepository;
        this.favoriteRepository = favoriteRepository;
    }

    // Ürün listesi sayfalıdır: sınırsız findAll() tüm tabloyu her istekte
    // döndürürdü. Kategori filtresi de buraya taşındı — tarayıcı artık
    // ürünlerin tamamını görmediği için orada filtreleyemez.
    // minStock / maxStock: stok aralığı filtresi (iki uç da dahil). Admin stok
    // ekranı hem hazır kovaları ("Tükendi" = 0..0, "Kritik" = 0..5) hem de serbest
    // aralığı buradan sorar; ikisi de aynı iki parametreye iner.
    //
    // Üçü de int değil Integer — int olsaydı parametre hiç gelmediğinde 0 sayılır
    // ve maxStock=0 anlamına gelirdi: vitrin ana sayfası sessizce yalnızca tükenmiş
    // ürünleri gösterirdi.
    @GetMapping
    public ResponseEntity<?> getAllProducts(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Integer minStock,
            @RequestParam(required = false) Integer maxStock,
            @PageableDefault(size = 12, sort = "id") Pageable pageable) {

        if (minStock != null && maxStock != null && minStock > maxStock) {
            // Sessizce boş liste dönmek yanlış olurdu: kullanıcı filtreyi ters
            // girdiğini değil, elde ürün olmadığını sanardı.
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Alt sınır üst sınırdan büyük olamaz."));
        }

        boolean byCategory = category != null && !category.isBlank();
        boolean byStock = minStock != null || maxStock != null;

        Page<Product> page;
        if (byStock) {
            // "Sınır verilmedi" durumu burada en geniş değere çevriliyor; böylece
            // null sorguya hiç girmiyor. Alt sınır 0'dır çünkü Product.setStock
            // negatif stoğu zaten sıfıra çeker — 0'ın altı diye bir veri yok.
            int min = minStock != null ? Math.max(minStock, 0) : 0;
            int max = maxStock != null ? Math.max(maxStock, 0) : Integer.MAX_VALUE;

            page = byCategory
                    ? repository.findByCategoryAndStockBetween(category, min, max, pageable)
                    : repository.findByStockBetween(min, max, pageable);
        } else {
            // Filtresiz vitrin yolu bilerek olduğu gibi bırakıldı: her ziyaretçinin
            // çağırdığı sorguya hep doğru çıkan bir WHERE eklemenin karşılığı yok.
            page = byCategory
                    ? repository.findByCategory(category, pageable)
                    : repository.findAll(pageable);
        }

        return ResponseEntity.ok(new PagedModel<>(page));
    }


    // Add a new product
    @PostMapping
    public org.springframework.http.ResponseEntity<Product> createProduct(@org.springframework.web.bind.annotation.RequestBody Product product) {
        Product savedProduct = repository.save(product);
        return org.springframework.http.ResponseEntity.ok(savedProduct);
    }

    // Update an existing product
    @PutMapping("/{id}")
    public org.springframework.http.ResponseEntity<Product> updateProduct(@org.springframework.web.bind.annotation.PathVariable Long id, @org.springframework.web.bind.annotation.RequestBody Product productDetails) {
        java.util.Optional<Product> optionalProduct = repository.findById(id);
        if (optionalProduct.isPresent()) {
            Product product = optionalProduct.get();
            product.setName(productDetails.getName());
            product.setDescription(productDetails.getDescription());
            product.setPrice(productDetails.getPrice());
            product.setImageUrl(productDetails.getImageUrl());
            product.setCategory(productDetails.getCategory());
            // Alan alan kopyalıyoruz; bu satır unutulursa her düzenlemede stok
            // sessizce sıfırlanır ve ürün satılamaz hale gelirdi.
            product.setStock(productDetails.getStock());
            Product updatedProduct = repository.save(product);
            return org.springframework.http.ResponseEntity.ok(updatedProduct);
        } else {
            return org.springframework.http.ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{id}")
    public org.springframework.http.ResponseEntity<Product> getProductById(@org.springframework.web.bind.annotation.PathVariable Long id) {
        java.util.Optional<Product> optionalProduct = repository.findById(id);
        if (optionalProduct.isPresent()) {
            return org.springframework.http.ResponseEntity.ok(optionalProduct.get());
        } else {
            return org.springframework.http.ResponseEntity.notFound().build();
        }
    }

    // Delete a product
    @org.springframework.transaction.annotation.Transactional
    @DeleteMapping("/{id}")
    public org.springframework.http.ResponseEntity<Void> deleteProduct(@org.springframework.web.bind.annotation.PathVariable Long id) {
        if (repository.existsById(id)) {
            cartItemRepository.deleteByProductId(id);
            favoriteRepository.deleteByProductId(id);
            repository.deleteById(id);
            return org.springframework.http.ResponseEntity.ok().build();
        } else {
            return org.springframework.http.ResponseEntity.notFound().build();
        }
    }

    // Stok düzeltmesi için istek gövdesi: mutlak değer değil, FARK taşır.
    //
    // Alan neden Integer, neden int değil: int olsaydı gövdede "delta" hiç
    // gönderilmediğinde alan sessizce 0 olurdu ve @NotNull asla tetiklenmezdi.
    // "Alan eksik" ile "sıfır değişim" isteğini ayırt edebilmek için sarıcı tip şart.
    public static class StockDeltaRequest {
        @NotNull(message = "Değişim miktarı zorunludur.")
        public Integer delta;
    }

    // Stok düzeltme ucu — admin stok yönetimi ekranı burayı çağırır.
    //
    // Neden mutlak değer ("stok = 30") değil de fark ("+10" / "-3"):
    // mutlak yazma klasik bir kayıp güncellemedir. Admin tabloda 10 görür, o sırada
    // bir müşteri 1 adet satın alır (stok 9 olur), admin 10 yazınca o satış sessizce
    // silinir. Farkta ise karar veritabanında verilir, araya giren satış korunur
    // (bkz. doküman: "Stok Yarış Durumu").
    @Transactional
    @PostMapping("/{id}/stock")
    public ResponseEntity<?> adjustStock(@PathVariable Long id,
                                         @Valid @RequestBody StockDeltaRequest request) {

        // Bilerek existsById, findById DEĞİL. findById ürünü Hibernate'in persistence
        // context'ine yükler; aşağıdaki @Modifying UPDATE ise doğrudan veritabanına
        // gider ve o önbelleği güncellemez. İkisi bir arada olsaydı güncellemeden
        // sonraki findById veritabanına hiç gitmez, ESKİ stoğu döndürürdü.
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        int delta = request.delta;

        // Aşağıdaki iki hata dönüşü @Transactional içinde olmasına rağmen güvenlidir:
        // ikisi de hiçbir yazma yapılmadan önce çalışır, geri alınacak bir şey yoktur.
        // (Yazıldıktan SONRA hata dönmek geri alma yapmazdı — bkz. doküman:
        // "@Transactional içinde hata dönmek geri alma YAPMAZ".)
        if (delta == 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Değişim miktarı 0 olamaz."));
        }

        if (delta > 0) {
            repository.increaseStock(id, delta);
        } else {
            // Koşullu UPDATE: stok yetmiyorsa hiç yazmaz ve 0 satır döner. Stoğu elle
            // okuyup çıkarmak (getStock/setStock) yarış durumunu geri getirirdi.
            int affected = repository.decreaseStock(id, -delta);
            if (affected == 0) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Mevcut stok bu kadar düşürmeye yetmiyor."));
            }
        }

        // Burası artık taze okur: ürün yukarıda persistence context'e yüklenmedi.
        Product updated = repository.findById(id).orElse(null);
        if (updated == null) {
            // İstek sırasında ürün silinmiş; dönecek bir ürün kalmadı.
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(updated);
    }
}

/*
RequestMapping("/api/products") sınıfta, @GetMapping ise metotta boş — ikisi birleşince adres /api/products olur. Metoda @GetMapping("/falanca") yazsaydın adres /api/products/falanca olurdu.
return repository.findAll(); ile List<Product> döndürüyorsun ama tarayıcıya JSON olarak gidiyor. Bu çeviriyi @RestController arkada Jackson kütüphanesiyle otomatik yapar — sen uğraşmıyorsun.
Constructor injection kısmı önemli: repository'yi new ile sen oluşturmuyorsun, Spring hazır nesneyi constructor'a veriyor. "Neden böyle, neden new yok?" mülakatta sorulur — cevabı, Spring'in nesneleri yönetmesi (IoC / Inversion of Control).*/