package com.example.productapi;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<Product, Long>{

    // Stoğu KOŞULLU olarak düşürür ve kaç satır etkilediğini döndürür (0 veya 1).
    //
    // Neden böyle, neden "oku, kontrol et, kaydet" değil:
    //
    //     if (product.getStock() >= adet) {              // kontrol
    //         product.setStock(product.getStock() - adet); // davranış
    //     }
    //
    // Bu kalıp, sepet yarış durumunun birebir aynısıdır. Stok 1 iken iki istek
    // aynı anda gelirse ikisi de kontrol anında "1 var" görür, ikisi de düşürür,
    // stok -1 olur ve aynı ürün iki kişiye satılır.
    //
    // Aşağıdaki sorguda kontrol (WHERE p.stock >= :quantity) ile davranış
    // (SET p.stock = p.stock - :quantity) veritabanı tarafında TEK bir atomik
    // ifadedir; araya girilecek boşluk yoktur. Hakem yine veritabanıdır.
    //
    // Dönen değer 0 ise stok yetmemiştir — bu bir hata değil, cevabın kendisidir.
    @Modifying
    @Query("UPDATE Product p SET p.stock = p.stock - :quantity WHERE p.id = :id AND p.stock >= :quantity")
    int decreaseStock(@Param("id") Long id, @Param("quantity") int quantity);

    // Sipariş iptalinde stoğu geri ekler. Burada koşul yok: geri ekleme
    // her zaman geçerlidir. Ürün bu arada silinmişse sorgu 0 satır etkiler,
    // bu da beklenen bir sonuçtur (sipariş kalemi ürüne FK ile bağlı değildir).
    @Modifying
    @Query("UPDATE Product p SET p.stock = p.stock + :quantity WHERE p.id = :id")
    int increaseStock(@Param("id") Long id, @Param("quantity") int quantity);
}
