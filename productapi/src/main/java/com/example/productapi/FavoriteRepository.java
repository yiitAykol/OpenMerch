package com.example.productapi;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    boolean existsByProductId(Long productId);
    
    @org.springframework.transaction.annotation.Transactional
    void deleteByProductId(Long productId);
}