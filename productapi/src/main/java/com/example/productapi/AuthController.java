package com.example.productapi;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final long CODE_TTL_MINUTES = 15;

    // Deneme limitleri. Saymayı RateLimiter yapar; "kaç deneme, ne kadar süre" ise
    // bir iş kuralıdır ve tek yerde, burada durur.
    private static final int REGISTER_MAX_ATTEMPTS = 5;
    private static final int LOGIN_MAX_ATTEMPTS = 5;
    private static final int VERIFY_MAX_ATTEMPTS = 5;
    private static final int RESEND_MAX_ATTEMPTS = 3;
    private static final Duration RATE_LIMIT_WINDOW = Duration.ofMinutes(10);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final JwtService jwtService;
    private final CartRepository cartRepository;
    private final FavoriteRepository favoriteRepository;
    private final OrderRepository orderRepository;
    private final RateLimiter rateLimiter;

    public AuthController(UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          EmailService emailService,
                          JwtService jwtService,
                          CartRepository cartRepository,
                          FavoriteRepository favoriteRepository,
                          OrderRepository orderRepository,
                          RateLimiter rateLimiter) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.jwtService = jwtService;
        this.cartRepository = cartRepository;
        this.favoriteRepository = favoriteRepository;
        this.orderRepository = orderRepository;
        this.rateLimiter = rateLimiter;
    }

    // ---- İstek gövdeleri (DTO) ----
    public static class RegisterRequest {
        @NotBlank(message = "Kullanıcı adı boş olamaz")
        public String username;
        @NotBlank(message = "E-posta boş olamaz")
        @Email(message = "E-posta formatı geçersiz")
        public String email;
        @NotBlank(message = "Şifre boş olamaz")
        @Size(min = 6, message = "Şifre en az 6 karakter olmalıdır")
        public String password;
    }

    public static class VerifyRequest {
        @NotBlank(message = "E-posta boş olamaz")
        @Email(message = "E-posta formatı geçersiz")
        public String email;
        // Kasten yalnızca @NotBlank: @Pattern("\\d{6}") eklemek, kodu boşluklu
        // yapıştıran kullanıcıyı reddederdi. Kıyaslama zaten trim() ile yapılıyor.
        @NotBlank(message = "Doğrulama kodu boş olamaz")
        public String code;
    }

    public static class LoginRequest {
        @NotBlank(message = "E-posta boş olamaz")
        @Email(message = "E-posta formatı geçersiz")
        public String email;
        // Kasten @Size yok: giriş ucunda uzunluk kuralı, şifre politikasını sızdırır ve
        // "e-posta veya şifre hatalı" genel mesajını deler. Format kuralı kayıt ucunda durur.
        @NotBlank(message = "Şifre boş olamaz")
        public String password;
    }

    public static class ResendRequest {
        @NotBlank(message = "E-posta boş olamaz")
        @Email(message = "E-posta formatı geçersiz")
        public String email;
    }

    public static class ChangePasswordRequest {
        @NotBlank(message = "Eski şifre boş olamaz")
        public String oldPassword;
        @NotBlank(message = "Yeni şifre boş olamaz")
        @Size(min = 6, message = "Şifre en az 6 karakter olmalıdır")
        public String newPassword;
    }

    // 1) KAYIT: kullanıcıyı devre dışı (enabled=false) oluşturur, kod üretir ve e-posta atar.
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req, HttpServletRequest request) {
        // Anahtar burada e-posta olamaz: kayıt var olan adresi zaten reddediyor, saldırgan
        // her istekte yeni bir adres kullanır ve her biri ayrı kovaya düşer. Kötüye
        // kullanımın ortak noktası kaynak IP'dir.
        String key = rateKey("register", request.getRemoteAddr());
        if (!rateLimiter.tryConsume(key, REGISTER_MAX_ATTEMPTS, RATE_LIMIT_WINDOW)) {
            return tooManyRequests(key);
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
    public ResponseEntity<?> verify(@Valid @RequestBody VerifyRequest req) {
        // Limit önce: 6 haneli kod aksi halde süresi dolana dek kaba kuvvetle denenebilir.
        String key = rateKey("verify", req.email);
        if (!rateLimiter.tryConsume(key, VERIFY_MAX_ATTEMPTS, RATE_LIMIT_WINDOW)) {
            return tooManyRequests(key);
        }

        Optional<User> opt = userRepository.findByEmail(req.email);
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
        if (!user.getVerificationCode().equals(req.code.trim())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Kod hatalı."));
        }

        // Kod doğru: sayacı bırakıyoruz, sonraki denemeler sıfırdan başlar.
        rateLimiter.reset(key);

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
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        // Limit, DB sorgusundan ve bcrypt karşılaştırmasından önce: ikisi de pahalıdır.
        String key = rateKey("login", req.email);
        if (!rateLimiter.tryConsume(key, LOGIN_MAX_ATTEMPTS, RATE_LIMIT_WINDOW)) {
            return tooManyRequests(key);
        }

        Optional<User> opt = userRepository.findByEmail(req.email);
        if (opt.isEmpty() || opt.get().getPassword() == null
                || !passwordEncoder.matches(req.password, opt.get().getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "E-posta veya şifre hatalı."));
        }

        // Şifre doğrulandı; bu bir kaba kuvvet denemesi değil, sayacı sıfırla.
        rateLimiter.reset(key);

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
    public ResponseEntity<?> resend(@Valid @RequestBody ResendRequest req) {
        // Burada reset yok: başarı/başarısızlık ayrımı yok, her istek gerçek bir e-posta yolluyor.
        String key = rateKey("resend", req.email);
        if (!rateLimiter.tryConsume(key, RESEND_MAX_ATTEMPTS, RATE_LIMIT_WINDOW)) {
            return tooManyRequests(key);
        }

        Optional<User> opt = userRepository.findByEmail(req.email);
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
    public ResponseEntity<?> changePassword(Authentication authentication, @Valid @RequestBody ChangePasswordRequest req) {
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

        // İlişkili verileri (sepet, favoriler ve siparişler) temizle ki Foreign Key hatası almayalım.
        cartRepository.deleteByUserId(dbUser.getId());
        favoriteRepository.deleteByUserId(dbUser.getId());
        orderRepository.deleteByUserId(dbUser.getId());

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

    // Anahtar uç bazında ayrılır ("login:ali@x.com"): yoksa login denemeleri verify
    // kotasını yer ve kullanıcı neden yasaklandığını anlayamaz. Anahtarın kimliği uca
    // göre değişir: login/verify/resend e-postayı, register kaynak IP'yi kullanır.
    // Locale.ROOT şart: Türkçe locale'de "I".toLowerCase() sonucu "i" değil "ı" olur,
    // aynı adres iki ayrı kovaya düşerdi.
    private static String rateKey(String prefix, String email) {
        return prefix + ":" + (email == null ? "" : email.trim().toLowerCase(Locale.ROOT));
    }

    // Limit aşıldığında dönen 429. Retry-After standart bir başlıktır: istemciye
    // kaç saniye sonra tekrar deneyebileceğini söyler.
    private ResponseEntity<?> tooManyRequests(String key) {
        long retryAfter = rateLimiter.retryAfterSeconds(key);
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header("Retry-After", String.valueOf(retryAfter))
                .body(Map.of("message",
                        "Çok fazla deneme yapıldı. " + retryAfter + " saniye sonra tekrar deneyin."));
    }

    private Map<String, Object> publicUser(User user) {
        return Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "email", user.getEmail(),
                "role", user.getRole()==null ? "USER" : user.getRole());
    }
}
