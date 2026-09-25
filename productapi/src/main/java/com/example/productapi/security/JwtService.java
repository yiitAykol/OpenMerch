package com.example.productapi.security;

import com.example.productapi.entity.User;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms:86400000}") long expirationMs) {
        // HMAC-SHA imzası için gizli anahtar (en az 32 byte olmalı).
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    // Kullanıcı için token üretir. subject = userId, ekstra olarak email claim'i.
    public String generateToken(User user) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);
        return Jwts.builder()
                .subject(String.valueOf(user.getId()))
                .claim("email", user.getEmail())
                .claim("username", user.getUsername())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key)
                .compact();
    }

    // Token'dan çıkarılan bilgiler. jjwt'nin Claims tipi bu sınıfın dışına sızmasın diye
    // ayrı bir taşıyıcıyla dönülür; böylece jjwt'yi bilen tek yer JwtService kalır.
    public record TokenInfo(Long userId, Instant issuedAt) {}

    // Token'ı doğrular ve içindekileri döner; geçersizse null.
    // DİKKAT: issuedAt (iat) JWT'de epoch SANİYESİ olarak saklanır, yani milisaniyesi
    // her zaman .000'dır. Bir Instant ile karşılaştıran taraf bunu hesaba katmalıdır.
    public TokenInfo parse(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return new TokenInfo(
                    Long.valueOf(claims.getSubject()),
                    claims.getIssuedAt().toInstant());
        } catch (Exception e) {
            return null;
        }
    }
}
