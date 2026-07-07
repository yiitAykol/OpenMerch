package com.example.productapi;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/banners")
public class BannerController {

    private final BannerRepository repository;

    public BannerController(BannerRepository repository) {
        this.repository = repository;
    }

    // Tüm banner'ları listele
    @GetMapping
    public List<Banner> getAllBanners() {
        return repository.findAll();
    }

    // Yeni banner ekle
    @PostMapping
    public ResponseEntity<?> createBanner(@RequestBody Banner banner) {
        if (banner.getImageUrl() == null || banner.getImageUrl().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Görsel URL boş olamaz");
        }
        Banner saved = repository.save(banner);
        return ResponseEntity.ok(saved);
    }

    // Banner sil
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBanner(@PathVariable Long id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return ResponseEntity.ok().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}
