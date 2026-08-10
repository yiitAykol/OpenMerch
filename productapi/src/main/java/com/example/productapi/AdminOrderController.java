package com.example.productapi;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    public AdminOrderController(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    // Tüm siparişler, en yenisi üstte.
    @GetMapping
    public ResponseEntity<List<Order>> getAllOrders() {
        return ResponseEntity.ok(orderRepository.findAllByOrderByCreatedAtDesc());
    }

    public static class StatusRequest {
        public String status;
    }

    // Sipariş durumunu günceller (Hazırlanıyor, Kargoya Verildi, ...).
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody StatusRequest req) {
        String status = req.status == null ? "" : req.status.trim().toUpperCase();
        if (!ALLOWED_STATUSES.contains(status)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Geçersiz sipariş durumu."));
        }

        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) {
            return ResponseEntity.notFound().build();
        }

        order.setStatus(status);
        return ResponseEntity.ok(orderRepository.save(order));
    }
}
