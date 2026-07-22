package com.example.productapi;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CartRepository extends JpaRepository<Cart, Long> {
    Cart findByUserId(Long userId);
    
    @org.springframework.transaction.annotation.Transactional
    void deleteByUserId(Long userId);
}
