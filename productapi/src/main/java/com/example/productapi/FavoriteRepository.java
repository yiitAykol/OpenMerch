package com.example.productapi;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    List<Favorite> findByUserId(Long userId);

    boolean existsByProductIdAndUserId(Long productId, Long userId);

    @org.springframework.transaction.annotation.Transactional
    void deleteByProductId(Long productId);
}