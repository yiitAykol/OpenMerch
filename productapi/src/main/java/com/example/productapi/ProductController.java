package com.example.productapi;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/products")
public class ProductController{

    private final ProductRepository repository;
    private final CartItemRepository cartItemRepository;
    private final FavoriteRepository favoriteRepository;
    
    // Spring repository'yi buraya otomatik verir (dependency injection)
    public ProductController(ProductRepository repository, CartItemRepository cartItemRepository, FavoriteRepository favoriteRepository) {
        this.repository = repository;
        this.cartItemRepository = cartItemRepository;
        this.favoriteRepository = favoriteRepository;
    }

    @GetMapping
    public List<Product> getAllProducts() {
        return repository.findAll();
    }

    // Add a new product
    @PostMapping
    public org.springframework.http.ResponseEntity<Product> createProduct(@org.springframework.web.bind.annotation.RequestBody Product product) {
        Product savedProduct = repository.save(product);
        return org.springframework.http.ResponseEntity.ok(savedProduct);
    }

    // Update an existing product
    @PutMapping("/{id}")
    public org.springframework.http.ResponseEntity<Product> updateProduct(@org.springframework.web.bind.annotation.PathVariable Long id, @org.springframework.web.bind.annotation.RequestBody Product productDetails) {
        java.util.Optional<Product> optionalProduct = repository.findById(id);
        if (optionalProduct.isPresent()) {
            Product product = optionalProduct.get();
            product.setName(productDetails.getName());
            product.setDescription(productDetails.getDescription());
            product.setPrice(productDetails.getPrice());
            product.setImageUrl(productDetails.getImageUrl());
            product.setCategory(productDetails.getCategory());
            Product updatedProduct = repository.save(product);
            return org.springframework.http.ResponseEntity.ok(updatedProduct);
        } else {
            return org.springframework.http.ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{id}")
    public org.springframework.http.ResponseEntity<Product> getProductById(@org.springframework.web.bind.annotation.PathVariable Long id) {
        java.util.Optional<Product> optionalProduct = repository.findById(id);
        if (optionalProduct.isPresent()) {
            return org.springframework.http.ResponseEntity.ok(optionalProduct.get());
        } else {
            return org.springframework.http.ResponseEntity.notFound().build();
        }
    }

    // Delete a product
    @org.springframework.transaction.annotation.Transactional
    @DeleteMapping("/{id}")
    public org.springframework.http.ResponseEntity<Void> deleteProduct(@org.springframework.web.bind.annotation.PathVariable Long id) {
        if (repository.existsById(id)) {
            cartItemRepository.deleteByProductId(id);
            favoriteRepository.deleteByProductId(id);
            repository.deleteById(id);
            return org.springframework.http.ResponseEntity.ok().build();
        } else {
            return org.springframework.http.ResponseEntity.notFound().build();
        }
    }
}

/*
RequestMapping("/api/products") sınıfta, @GetMapping ise metotta boş — ikisi birleşince adres /api/products olur. Metoda @GetMapping("/falanca") yazsaydın adres /api/products/falanca olurdu.
return repository.findAll(); ile List<Product> döndürüyorsun ama tarayıcıya JSON olarak gidiyor. Bu çeviriyi @RestController arkada Jackson kütüphanesiyle otomatik yapar — sen uğraşmıyorsun.
Constructor injection kısmı önemli: repository'yi new ile sen oluşturmuyorsun, Spring hazır nesneyi constructor'a veriyor. "Neden böyle, neden new yok?" mülakatta sorulur — cevabı, Spring'in nesneleri yönetmesi (IoC / Inversion of Control).*/