package com.example.productapi;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/favorites")
public class FavoriteController {

    private final FavoriteRepository favoriteRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public FavoriteController(FavoriteRepository favoriteRepository,
                              ProductRepository productRepository,
                              UserRepository userRepository) {
        this.favoriteRepository = favoriteRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
    }

    // Bir kullanıcının favorilerini listele  → /api/favorites?userId=1
    @GetMapping
    public List<Favorite> getFavorites(@RequestParam Long userId) {
        return favoriteRepository.findByUserId(userId);
    }

    // Favori ekle  → body: { "productId": 1, "userId": 1 }
    @PostMapping
    public Favorite addFavorite(@RequestBody Map<String, Long> body) {

        Long productId = body.get("productId");
        Long userId = body.get("userId");

        if (favoriteRepository.existsByProductIdAndUserId(productId, userId)) {
            throw new RuntimeException("Bu ürün zaten favorilerinizde!");
        }

        Product product = productRepository.findById(productId).orElseThrow();
        User user = userRepository.findById(userId).orElseThrow();
        Favorite favorite = new Favorite(user, product);
        return favoriteRepository.save(favorite);
    }

    // Favoriden çıkar
    @DeleteMapping("/{id}")
    public void deleteFavorite(@PathVariable Long id) {
        favoriteRepository.deleteById(id);
    }
}