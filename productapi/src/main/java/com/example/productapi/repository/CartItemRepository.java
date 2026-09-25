package com.example.productapi.repository;

import com.example.productapi.entity.CartItem;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Long> {
    @org.springframework.transaction.annotation.Transactional
    void deleteByProductId(Long productId);
}
