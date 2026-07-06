package com.example.productapi;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/favorites")
public class FavoriteController {

    private final FavoriteRepository favoriteRepository;
    private final ProductRepository productRepository;

    public FavoriteController(FavoriteRepository favoriteRepository,
                              ProductRepository productRepository) {
        this.favoriteRepository = favoriteRepository;
        this.productRepository = productRepository;
    }

    // Favorileri listele
    @GetMapping
    public List<Favorite> getAllFavorites() {
        return favoriteRepository.findAll();
    }

    // Favori ekle  → body: { "productId": 1 }
    @PostMapping
    public Favorite addFavorite(@RequestBody Map<String, Long> body) {

        Long productId = body.get("productId");

        if (favoriteRepository.existsByProductId(productId)) {
            throw new RuntimeException("Bu ürün zaten favorilerinizde!");
        }
        
        Product product = productRepository.findById(productId).orElseThrow();
        Favorite favorite = new Favorite(product);
        return favoriteRepository.save(favorite);
    }

    // Favoriden çıkar
    @DeleteMapping("/{id}")
    public void deleteFavorite(@PathVariable Long id) {
        favoriteRepository.deleteById(id);
    }
}