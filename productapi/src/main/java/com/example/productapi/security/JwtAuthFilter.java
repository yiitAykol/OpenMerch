package com.example.productapi.security;

import com.example.productapi.repository.UserRepository;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.time.Instant;
import java.util.List;


import java.io.IOException;

// Her istekte "Authorization: Bearer <token>" başlığını okur, geçerliyse
// SecurityContext'e kimlik doğrulanmış kullanıcıyı (userId) yerleştirir.
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            JwtService.TokenInfo info = jwtService.parse(token);

            if (info != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                userRepository.findById(info.userId()).ifPresent(user -> {
                    // Şifre, token üretildikten SONRA değiştiyse bu token artık geçersizdir.
                    // null = şifre hiç değiştirilmemiş, kontrol edilecek bir şey yok.
                    // isBefore (kesin küçüktür) bilinçlidir: iat saniyeye yuvarlandığı için
                    // "aynı saniye" eşit sayılmalı, yoksa şifre değişiminden hemen sonra
                    // üretilen taze token da reddedilirdi.
                    Instant changedAt = user.getPasswordChangedAt();
                    if (changedAt != null && info.issuedAt().isBefore(changedAt)) {
                        // Yalnızca lambda'dan çıkar: kimlik yerleştirilmez, istek anonim devam eder.
                        // Reddetme kararını Spring Security verir (korumalı uçta 401/403,
                        // açık uçta istek normal geçer).
                        return;
                    }

                    String role = user.getRole() == null ? "USER" : user.getRole();
                    List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));
                    var auth = new UsernamePasswordAuthenticationToken(
                            user, null, authorities);
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                });
            }
        }

        filterChain.doFilter(request, response);
    }
}
