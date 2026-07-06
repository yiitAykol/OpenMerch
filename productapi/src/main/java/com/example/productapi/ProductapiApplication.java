package com.example.productapi;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import java.math.BigDecimal;

@SpringBootApplication
public class ProductapiApplication {

	public static void main(String[] args) {
		SpringApplication.run(ProductapiApplication.class, args);
	}

	@Bean
	CommandLineRunner seedData(ProductRepository productRepository, UserRepository userRepository, CartRepository cartRepository) {
		return args -> {
			// Varsayılan Kullanıcı ve Sepet Oluşturma
			if (userRepository.count() == 0) {
				User defaultUser = new User("defaultUser", "default@example.com");
				userRepository.save(defaultUser);
				
				Cart cart = new Cart(defaultUser);
				cartRepository.save(cart);
			}

			// Örnek Ürünleri Oluşturma
			if (productRepository.count() == 0) {
				productRepository.save(new Product("Kahve", "Taze çekilmiş", BigDecimal.valueOf(120.0), "https://..."));
				productRepository.save(new Product("Çay", "Demlik çayı", BigDecimal.valueOf(80.0), "https://..."));
				// birkaç tane daha
			}
		};
	}

}
