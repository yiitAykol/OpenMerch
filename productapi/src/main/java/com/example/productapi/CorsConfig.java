package com.example.productapi;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.beans.factory.annotation.Value;

import java.util.List;

@Configuration
public class CorsConfig {

    @Value("${app.cors.allowed-origins}")
    private List<String> allowedOrigins;

    // Tek CORS kaynağı: Spring Security'nin cors() filtresi bu bean'i kullanır.
    // Authorization başlığına izin veriyoruz ki JWT gönderilebilsin.
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));

        // config.setAllowCredentials(true);
        // Credentials (çerez) kullanmıyoruz: oturum JWT ile Authorization başlığında taşınıyor,
        // o da allowedHeaders("*") kapsamında geçer. Bu yüzden allowCredentials açılmadı —
        // açık olsaydı allowedOrigins'e "*" vermek spec gereği yasak olurdu.
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
