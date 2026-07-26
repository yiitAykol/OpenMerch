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
    public List<Favorite> getFavorites(Authentication authentication) {
        if(authentication == null || !(authentication.getPrincipal() instanceof User user))
        {
            throw new RuntimeException("Yetkisiz kullanıcı");
        }
        return favoriteRepository.findByUserId(user.getId());
    }

        // addFavorite metodunun DOĞRU hali:
    @PostMapping
    public Favorite addFavorite(Authentication authentication, @RequestBody Map<String, Long> body) {
        
        // 1. Kapıdaki güvenlik kontrolü (Senin yazdığın kontrolün aynısı)
        if(authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            throw new RuntimeException("Yetkisiz kullanıcı");
        }

        Long productId = body.get("productId");
        Long userId = user.getId(); // Artık 'user' yukarıdaki if'in içinden geliyor.

        if (favoriteRepository.existsByProductIdAndUserId(productId, userId)) {
            throw new RuntimeException("Bu ürün zaten favorilerinizde!");
        }

        Product product = productRepository.findById(productId).orElseThrow();
        Favorite favorite = new Favorite(user, product);
        return favoriteRepository.save(favorite);
    }


    // Favoriden çıkar
    @DeleteMapping("/{id}")
    public void deleteFavorite(@PathVariable Long id) {
        favoriteRepository.deleteById(id);
    }
}