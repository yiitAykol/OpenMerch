package com.example.productapi.repository;

import com.example.productapi.entity.Category;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    // Aynı isimde kategori var mı diye kontrol için
    boolean existsByName(String name);
}
