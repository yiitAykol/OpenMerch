package com.example.productapi;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Bellek içi deneme sayacı (sabit pencere).
 *
 * Kural taşımaz: "kaç deneme, ne kadar süre" kararını çağıran verir. Böylece aynı
 * sayaç login, verify, resend ve register için farklı limitlerle kullanılabilir.
 *
 * Sayaçlar uygulama belleğindedir: yeniden başlatınca sıfırlanır ve birden çok sunucu
 * çalışıyorsa her biri kendi sayacını tutar. Tek örnekli bu proje için yeterli; dağıtık
 * bir kurulumda yerini Redis benzeri ortak bir sayaç almalıdır.
 */
@Service
public class RateLimiter {

    // Harita bu boyutu aştığında süresi dolmuş girdiler temizlenir. Temizlik olmasaydı
    // rastgele anahtarlarla istek atan biri haritayı sınırsız büyütebilirdi.
    private static final int CLEANUP_THRESHOLD = 1_000;

    // Anahtar -> içinde bulunulan pencere. Anahtarı çağıran üretir ("login:mail@x.com" gibi).
    private final Map<String, Window> buckets = new ConcurrentHashMap<>();

    // Aynı anda tek bir thread temizlik yapsın; diğerleri boşuna tüm haritayı taramasın.
    private final AtomicBoolean cleaning = new AtomicBoolean(false);

    // Bir pencerenin durumu: kaç deneme yapıldı ve pencere ne zaman bitiyor.
    private record Window(int count, Instant expiresAt) {}

    /**
     * Bir denemeyi sayar. Limit henüz aşılmadıysa true, aşıldıysa false döner.
     *
     * Okuma ve yazma tek bir compute() çağrısında yapılır; bu atomiktir. Ayrı ayrı
     * get() + put() yazılsaydı aynı anahtara gelen iki eşzamanlı istek aynı sayıyı
     * okur, aynı sayıyı yazar ve bir deneme kaybolurdu — saldırgan limiti paralel
     * isteklerle aşardı.
     */
    public boolean tryConsume(String key, int maxAttempts, Duration window) {
        Instant now = Instant.now();
        cleanUpIfNeeded(now);

        Window updated = buckets.compute(key, (k, current) -> {
            // Pencere yoksa ya da süresi dolduysa temiz bir pencere başlat.
            if (current == null || !now.isBefore(current.expiresAt())) {
                return new Window(1, now.plus(window));
            }
            // Pencere sürüyor: bitiş zamanı sabit kalır. Böylece denemeye devam etmek
            // yasağı uzatmaz; süre dolunca sayaç kendiliğinden sıfırlanır.
            return new Window(current.count() + 1, current.expiresAt());
        });

        return updated.count() <= maxAttempts;
    }

    // Başarılı işlemden sonra çağrılır: sayacı siler, kullanıcı sıfırdan başlar.
    public void reset(String key) {
        buckets.remove(key);
    }

    // Pencere bitene kadar kalan saniye (429 yanıtındaki "N saniye sonra deneyin" mesajı için).
    // Yukarı yuvarlanır: aşağı yuvarlansaydı söylenen saniyede yapılan deneme hâlâ erken olurdu.
    public long retryAfterSeconds(String key) {
        Window current = buckets.get(key);
        if (current == null) {
            return 0;
        }
        long millis = Duration.between(Instant.now(), current.expiresAt()).toMillis();
        return millis <= 0 ? 0 : (millis + 999) / 1000;
    }

    /**
     * Süresi dolmuş girdileri siler. Yalnızca harita büyüdüğünde çalışır; her istekte
     * tüm haritayı taramak gereksiz maliyet olurdu.
     *
     * compareAndSet, "bayrak false ise true yap" işlemini atomik yapar. Aynı anda gelen
     * yüz istekten yalnızca biri true alır ve temizliği üstlenir; kalan doksan dokuzu
     * hiç beklemeden kendi işine devam eder.
     */
    private void cleanUpIfNeeded(Instant now) {
        if (buckets.size() <= CLEANUP_THRESHOLD || !cleaning.compareAndSet(false, true)) {
            return;
        }
        try {
            for (Map.Entry<String, Window> entry : buckets.entrySet()) {
                if (!now.isBefore(entry.getValue().expiresAt())) {
                    // İki argümanlı remove: kaydı yalnızca değeri hâlâ aynıysa siler.
                    // Tek argümanlı remove(key) kullanılsaydı, tarama sırasında yeni bir
                    // deneme gelip pencereyi tazelemişse o taze sayaç silinirdi.
                    buckets.remove(entry.getKey(), entry.getValue());
                }
            }
        } finally {
            // finally şart: tarama bir istisnayla kesilse bile bayrak açık kalmamalı,
            // yoksa bir daha hiçbir zaman temizlik yapılmazdı.
            cleaning.set(false);
        }
    }
}
