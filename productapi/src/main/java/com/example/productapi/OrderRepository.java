package com.example.productapi;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    // Kullanıcının siparişleri, en yenisi üstte.
    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);

    // Admin listesi için: tüm siparişler, en yenisi üstte.
    List<Order> findAllByOrderByCreatedAtDesc();

    // Hesap silinirken siparişleri de temizlemek için.
    @Transactional
    void deleteByUserId(Long userId);
}
