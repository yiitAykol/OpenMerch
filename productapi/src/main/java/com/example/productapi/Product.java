package com.example.productapi;

import java.math.BigDecimal;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import org.hibernate.annotations.ColumnDefault;

@Entity
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String description;
    private BigDecimal price;
    private String imageUrl;
     // Kategori alanı (Default olarak "T-Shirts" atayabilirsin)
    private String category = "T-Shirts";

    // Eldeki adet. Siparişte düşer, sipariş iptalinde geri eklenir.
    //
    // @ColumnDefault olmadan Hibernate bu kolonu "not null" olarak eklemeye
    // çalışır; PostgreSQL ise dolu bir tabloya varsayılansız NOT NULL kolon
    // eklemeyi reddeder. Yani bu satır olmadan ddl-auto=update mevcut ürünleri
    // olan bir veritabanında patlardı.
    @ColumnDefault("0")
    private int stock = 0;

    // 1. Boş constructor — JPA bunu ister
    public Product() {
    }

    // 2. (İsteğe bağlı) örnek veri eklerken kolaylık olsun diye
    public Product(String name, String description, BigDecimal price, String imageUrl, String category) {
        this(name, description, price, imageUrl, category, 0);
    }

    public Product(String name, String description, BigDecimal price, String imageUrl, String category, int stock) {
        this.name = name;
        this.description = description;
        this.price = price;
        this.imageUrl = imageUrl;
        this.category = category != null ? category : "T-Shirts";
        this.stock = stock;
    }

    // Getter / Setter'lar
    public Long getId() {
        return id;
    }
    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }
    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }
    public void setDescription(String description) {
        this.description = description;
    }

    public BigDecimal getPrice() {
        return price;
    }
    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public String getImageUrl() {
        return imageUrl;
    }
    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getCategory() {
        return category;
    }
    public void setCategory(String category) {
        this.category = category != null ? category : "T-Shirts";
    }

    public int getStock() {
        return stock;
    }
    public void setStock(int stock) {
        // Negatif stok anlamsız; gelen değeri burada sıfıra çekiyoruz ki
        // admin formundan gelen bir hata veritabanına yazılmasın.
        this.stock = Math.max(stock, 0);
    }
}