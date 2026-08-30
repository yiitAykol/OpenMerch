package com.example.productapi;

import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import java.util.List;
import java.util.Map;
import java.util.Set;

// Sipariş yönetimi. Bu yolun tamamı SecurityConfig'te ADMIN rolüne kilitlidir;
// bu yüzden burada kimlik/sahiplik kontrolü yoktur — admin bütün siparişleri görür.
@RestController
@RequestMapping("/api/admin/orders")
public class AdminOrderController {

    // Geçerli durumlar sabit bir kümede tutulur ki arayüzden gelen rastgele bir
    // metin veritabanına yazılamasın.
    private static final Set<String> ALLOWED_STATUSES =
            Set.of("NEW", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED");

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private static final String CANCELLED = "CANCELLED";

    public AdminOrderController(OrderRepository orderRepository, ProductRepository productRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
    }

    // Tüm siparişler, en yenisi üstte.
    @GetMapping
    public ResponseEntity<List<Order>> getAllOrders() {
        return ResponseEntity.ok(orderRepository.findAllByOrderByCreatedAtDesc());
    }

    public static class StatusRequest {
        // Yalnızca "boş mu" sorusu anotasyona taşınabilir; "geçerli bir durum mu"
        // sorusunun cevabı ALLOWED_STATUSES'ta durur ve orada kalmalıdır.
        @NotBlank(message = "Sipariş durumu boş olamaz.")
        public String status;
    }

    // Sipariş durumunu günceller (Hazırlanıyor, Kargoya Verildi, ...).
    @Transactional
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @Valid @RequestBody StatusRequest req) {
        String status = req.status.trim().toUpperCase();
        if (!ALLOWED_STATUSES.contains(status)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Geçersiz sipariş durumu."));
        }

        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) {
            return ResponseEntity.notFound().build();
        }

        if (CANCELLED.equals(order.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Sipariş zaten iptal edildi."));
        }

        if(CANCELLED.equals(status))
        {
            for (OrderItem item : order.getItems()) {
                // productId FK değildir; ürün silinmiş olabilir. O zaman sorgu 0 satır
                // etkiler ve bu normaldir — geri eklenecek bir stok kalmamıştır.
                if (item.getProductId() != null) {
                    productRepository.increaseStock(item.getProductId(), item.getQuantity());
                }
            }    
        }

        order.setStatus(status);
        return ResponseEntity.ok(orderRepository.save(order));
    }
}
