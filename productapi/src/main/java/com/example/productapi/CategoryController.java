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
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryRepository repository;

    public CategoryController(CategoryRepository repository) {
        this.repository = repository;
    }

    // Tüm kategorileri listele
    @GetMapping
    public List<Category> getAllCategories() {
        return repository.findAll();
    }

    // Yeni kategori ekle
    @PostMapping
    public ResponseEntity<?> createCategory(@RequestBody Category category) {
        // İsim boşsa reddet
        if (category.getName() == null || category.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Kategori adı boş olamaz");
        }
        String name = category.getName().trim();
        // Aynı isim varsa tekrar ekleme
        if (repository.existsByName(name)) {
            return ResponseEntity.badRequest().body("Bu kategori zaten var");
        }
        Category saved = repository.save(new Category(name));
        return ResponseEntity.ok(saved);
    }

    // Kategori sil
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return ResponseEntity.ok().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}
