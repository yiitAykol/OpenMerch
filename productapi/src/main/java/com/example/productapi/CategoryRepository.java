package com.example.productapi;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    // Aynı isimde kategori var mı diye kontrol için
    boolean existsByName(String name);
}
