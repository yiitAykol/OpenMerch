package com.example.productapi;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String username;

    @Column(unique = true)
    private String email;

    // BCrypt ile hash'lenmiş şifre. JSON'a asla sızmaması için @JsonIgnore.
    @JsonIgnore
    private String password;

    // E-posta doğrulanana kadar false. Doğrulanınca login'e izin verilir.
    // columnDefinition ile "default false": mevcut satırlar (seed user) varken de
    // kolonun NOT NULL olarak sorunsuz eklenmesini sağlar.
    @Column(nullable = false, columnDefinition = "boolean not null default false")
    private boolean enabled = false;

    @Column(nullable = false, columnDefinition = "varchar(20) not null default 'USER'")
    private String role = "USER";

    // E-postaya gönderilen 6 haneli doğrulama kodu (doğrulandıktan sonra temizlenir).
    @JsonIgnore
    private String verificationCode;

    // Doğrulama kodunun son geçerlilik anı.
    @JsonIgnore
    private Instant verificationExpiry;

    public User() {
    }

    // Seed verisi (default user) için eski yapıyı koruyan constructor.
    public User(String username, String email) {
        this.username = username;
        this.email = email;
        this.enabled = true;
    }

    public User(String username, String email, String password) {
        this.username = username;
        this.email = email;
        this.password = password;
    }

    public Long getId() {
        return id;
    }
    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }
    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }
    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }
    public void setPassword(String password) {
        this.password = password;
    }

    public boolean isEnabled() {
        return enabled;
    }
    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getVerificationCode() {
        return verificationCode;
    }
    public void setVerificationCode(String verificationCode) {
        this.verificationCode = verificationCode;
    }

    public Instant getVerificationExpiry() {
        return verificationExpiry;
    }
    public void setVerificationExpiry(Instant verificationExpiry) {
        this.verificationExpiry = verificationExpiry;
    }

    public String getRole() {
        return role;
    }
    public void setRole(String role) {
        this.role = role;
    }
}
