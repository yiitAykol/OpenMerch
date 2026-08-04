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
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

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

    // Bir kullanıcının favorilerini listele
    @GetMapping
    public ResponseEntity<List<Favorite>> getFavorites(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(favoriteRepository.findByUserId(user.getId()));
    }

    @PostMapping
    public ResponseEntity<?> addFavorite(Authentication authentication, @RequestBody Map<String, Long> body) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Long productId = body.get("productId");
        if (productId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "productId zorunludur."));
        }

        if (favoriteRepository.existsByProductIdAndUserId(productId, user.getId())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Bu ürün zaten favorilerinizde."));
        }

        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ürün bulunamadı."));
        }

        return ResponseEntity.ok(favoriteRepository.save(new Favorite(user, product)));
    }



    // Favoriden çıkar
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFavorite(Authentication authentication, @PathVariable Long id) {
        // 1) Kimlik
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // 2) Nesneyi bul
        Favorite favorite = favoriteRepository.findById(id).orElse(null);
        if (favorite == null) {
            return ResponseEntity.notFound().build();
        }

        // 3) Sahiplik
        if (favorite.getUser() == null || !favorite.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // 4) İşlem
        favoriteRepository.delete(favorite);
        return ResponseEntity.noContent().build();
    }

}