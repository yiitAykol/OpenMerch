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
import org.springframework.http.HttpMethod;

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
            // --- Vitrin: okumak herkese açık ---
            .requestMatchers(HttpMethod.GET, "/api/products/**", "/api/categories/**", "/api/banners/**").permitAll()

            // --- Yazmak sadece ADMIN ---
            .requestMatchers(HttpMethod.POST,   "/api/products/**", "/api/categories/**", "/api/banners/**").hasRole("ADMIN")
            .requestMatchers(HttpMethod.PUT,    "/api/products/**", "/api/categories/**", "/api/banners/**").hasRole("ADMIN")
            .requestMatchers(HttpMethod.DELETE, "/api/products/**", "/api/categories/**", "/api/banners/**").hasRole("ADMIN")

            // --- Auth: hesap işlemleri giriş ister, kayıt/giriş herkese açık ---
            .requestMatchers("/api/auth/me", "/api/auth/change-password", "/api/auth/delete-account").authenticated()
            .requestMatchers("/api/auth/**").permitAll()

            // --- Sipariş yönetimi sadece ADMIN ---
            .requestMatchers("/api/admin/orders/**").hasRole("ADMIN")

            // --- Kullanıcıya özel veriler ---
            .requestMatchers("/api/cart/**").authenticated()
            .requestMatchers("/api/favorites/**").authenticated()
            .requestMatchers("/api/orders/**").authenticated()

            .anyRequest().authenticated()
            )

            // Kendi JWT filtremizi zincire ekliyoruz.
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
