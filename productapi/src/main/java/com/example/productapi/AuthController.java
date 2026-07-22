package com.example.productapi;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final long CODE_TTL_MINUTES = 15;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final JwtService jwtService;
    private final CartRepository cartRepository;
    private final FavoriteRepository favoriteRepository;

    public AuthController(UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          EmailService emailService,
                          JwtService jwtService,
                          CartRepository cartRepository,
                          FavoriteRepository favoriteRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.jwtService = jwtService;
        this.cartRepository = cartRepository;
        this.favoriteRepository = favoriteRepository;
    }

    // ---- İstek gövdeleri (DTO) ----
    public static class RegisterRequest {
        public String username;
        public String email;
        public String password;
    }

    public static class VerifyRequest {
        public String email;
        public String code;
    }

    public static class LoginRequest {
        public String email;
        public String password;
    }

    public static class ResendRequest {
        public String email;
    }

    public static class ChangePasswordRequest {
        public String oldPassword;
        public String newPassword;
    }

    // 1) KAYIT: kullanıcıyı devre dışı (enabled=false) oluşturur, kod üretir ve e-posta atar.
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
        if (req.username == null || req.username.isBlank()
                || req.email == null || req.email.isBlank()
                || req.password == null || req.password.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Kullanıcı adı, e-posta ve en az 6 karakterlik şifre zorunludur."));
        }

        if (userRepository.existsByEmail(req.email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Bu e-posta zaten kayıtlı."));
        }
        if (userRepository.existsByUsername(req.username)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Bu kullanıcı adı zaten alınmış."));
        }

        User user = new User(req.username, req.email, passwordEncoder.encode(req.password));
        applyNewCode(user);
        userRepository.save(user);

        sendCodeSafely(user);
        return ResponseEntity.ok(Map.of(
                "message", "Kayıt alındı. Doğrulama kodu e-postana gönderildi.",
                "email", user.getEmail()));
    }

    // 2) DOĞRULAMA: koda ve süreye bakar, doğruysa hesabı aktifleştirir ve JWT döner.
    @PostMapping("/verify")
    public ResponseEntity<?> verify(@RequestBody VerifyRequest req) {
        Optional<User> opt = userRepository.findByEmail(req.email == null ? "" : req.email);
        if (opt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Kullanıcı bulunamadı."));
        }
        User user = opt.get();

        if (user.isEnabled()) {
            return ResponseEntity.ok(Map.of("message", "Hesap zaten doğrulanmış."));
        }
        if (user.getVerificationCode() == null || user.getVerificationExpiry() == null
                || user.getVerificationExpiry().isBefore(Instant.now())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Kodun süresi dolmuş. Lütfen yeni kod isteyin."));
        }
        if (!user.getVerificationCode().equals(req.code == null ? "" : req.code.trim())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Kod hatalı."));
        }

        user.setEnabled(true);
        user.setVerificationCode(null);
        user.setVerificationExpiry(null);
        userRepository.save(user);

        String token = jwtService.generateToken(user);
        return ResponseEntity.ok(Map.of(
                "message", "E-posta doğrulandı.",
                "token", token,
                "user", publicUser(user)));
    }

    // 3) GİRİŞ: şifre ve doğrulanmışlık kontrolü, başarılıysa JWT döner.
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        Optional<User> opt = userRepository.findByEmail(req.email == null ? "" : req.email);
        if (opt.isEmpty() || opt.get().getPassword() == null
                || !passwordEncoder.matches(req.password, opt.get().getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "E-posta veya şifre hatalı."));
        }

        User user = opt.get();
        if (!user.isEnabled()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Hesap doğrulanmamış. Lütfen e-postandaki kodu gir."));
        }

        String token = jwtService.generateToken(user);
        return ResponseEntity.ok(Map.of(
                "message", "Giriş başarılı.",
                "token", token,
                "user", publicUser(user)));
    }

    // 4) KODU TEKRAR GÖNDER
    @PostMapping("/resend")
    public ResponseEntity<?> resend(@RequestBody ResendRequest req) {
        Optional<User> opt = userRepository.findByEmail(req.email == null ? "" : req.email);
        if (opt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Kullanıcı bulunamadı."));
        }
        User user = opt.get();
        if (user.isEnabled()) {
            return ResponseEntity.ok(Map.of("message", "Hesap zaten doğrulanmış."));
        }
        applyNewCode(user);
        userRepository.save(user);
        sendCodeSafely(user);
        return ResponseEntity.ok(Map.of("message", "Yeni doğrulama kodu gönderildi."));
    }

    // 5) ME: JWT ile gelen isteğin sahibini döner (korumalı uç nokta).
    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Oturum bulunamadı."));
        }
        return ResponseEntity.ok(publicUser(user));
    }

    // 6) ŞİFRE DEĞİŞTİRME: Mevcut kullanıcının şifresini doğrular ve günceller.
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(Authentication authentication, @RequestBody ChangePasswordRequest req) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Oturum bulunamadı."));
        }
        
        if (req.oldPassword == null || req.newPassword == null || req.newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("message", "Eski şifre ve en az 6 karakterlik yeni şifre gereklidir."));
        }

        User dbUser = userRepository.findById(user.getId()).orElse(null);
        if (dbUser == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Kullanıcı bulunamadı."));
        }

        if (!passwordEncoder.matches(req.oldPassword, dbUser.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Eski şifre hatalı."));
        }

        dbUser.setPassword(passwordEncoder.encode(req.newPassword));
        userRepository.save(dbUser);

        return ResponseEntity.ok(Map.of("message", "Şifre başarıyla güncellendi."));
    }

    // 7) HESAP SİLME: Mevcut kullanıcının hesabını ve ilişkili verilerini siler.
    @DeleteMapping("/delete-account")
    public ResponseEntity<?> deleteAccount(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Oturum bulunamadı."));
        }

        User dbUser = userRepository.findById(user.getId()).orElse(null);
        if (dbUser == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Kullanıcı bulunamadı."));
        }

        // İlişkili verileri (sepet ve favoriler) temizle ki Foreign Key hatası almayalım.
        cartRepository.deleteByUserId(dbUser.getId());
        favoriteRepository.deleteByUserId(dbUser.getId());

        // Son olarak kullanıcıyı sil.
        userRepository.delete(dbUser);

        return ResponseEntity.ok(Map.of("message", "Hesap başarıyla silindi."));
    }

    // ---- Yardımcılar ----
    private void applyNewCode(User user) {
        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        user.setVerificationCode(code);
        user.setVerificationExpiry(Instant.now().plus(CODE_TTL_MINUTES, ChronoUnit.MINUTES));
    }

    // SMTP hatası kaydın tümden patlamasına yol açmasın; konsola da düşürüyoruz.
    private void sendCodeSafely(User user) {
        try {
            emailService.sendVerificationCode(user.getEmail(), user.getVerificationCode());
        } catch (Exception e) {
            System.err.println("[Auth] E-posta gönderilemedi (" + user.getEmail()
                    + "). Kod: " + user.getVerificationCode() + " | Hata: " + e.getMessage());
        }
    }

    private Map<String, Object> publicUser(User user) {
        return Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "email", user.getEmail());
    }
}
