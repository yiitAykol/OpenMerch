package com.example.productapi;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // REST API olduğu için CSRF gereksiz; CORS'u CorsConfig bean'inden alır.
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                // JWT kullandığımız için sunucu tarafında oturum tutulmaz.
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Mevcut kimliği döndüren uç nokta korumalı.
                        .requestMatchers("/api/auth/me").authenticated()
                        // Kayıt / doğrulama / giriş herkese açık.
                        .requestMatchers("/api/auth/**").permitAll()
                        // Vitrin gezinmesini bozmamak için diğer uç noktalar açık kalıyor.
                        .anyRequest().permitAll()
                )
                // Kendi JWT filtremizi zincire ekliyoruz.
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
