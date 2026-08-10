package com.example.productapi;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;

import java.util.Optional;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    // Get Cart for User
    @GetMapping
    public ResponseEntity<Cart> getCart(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        Cart cart = cartRepository.findByUserId(user.getId());
        if (cart == null) {
            cart = new Cart(user);
            cartRepository.save(cart);
        }
        return ResponseEntity.ok(cart);
    }

    public static class CartItemRequest {
        public Long productId;
        public int quantity;
    }

    @PostMapping("/items")
    public ResponseEntity<Cart> addItemToCart(Authentication authentication, @RequestBody CartItemRequest request) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Cart cart = cartRepository.findByUserId(user.getId());

        if(request.productId == null)
        {
            return ResponseEntity.badRequest().build();
        }

        if(request.quantity <= 0 || request.quantity > 100)
        {
            return ResponseEntity.badRequest().build();
        }


        Optional<Product> productOpt = productRepository.findById(request.productId);
        if (productOpt.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        Product product = productOpt.get();
        
        if (cart == null) {
            cart = new Cart(user);
            cartRepository.save(cart);
        }

        Optional<CartItem> existingItem = cart.getItems().stream()
                .filter(item -> item.getProduct().getId().equals(product.getId()))
                .findFirst();

        if (existingItem.isPresent()) {
            CartItem item = existingItem.get();
            item.setQuantity(item.getQuantity() + request.quantity);
            cartItemRepository.save(item);
        } else {
            CartItem newItem = new CartItem(cart, product, request.quantity);
            cartItemRepository.save(newItem);
            cart.getItems().add(newItem);
        }

        return ResponseEntity.ok(cartRepository.findByUserId(user.getId()));
    }


        // Update quantity
    @PutMapping("/items/{itemId}")
    public ResponseEntity<Cart> updateItemQuantity(Authentication authentication,
                                                   @PathVariable Long itemId,
                                                   @RequestParam int quantity) {
        // 1) Kimlik: isteği kim yapıyor?
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // 2) Nesneyi bul
        Optional<CartItem> itemOpt = cartItemRepository.findById(itemId);
        if (itemOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        CartItem item = itemOpt.get();

        // 3) Sahiplik: bu kalem gerçekten bu kullanıcının sepetinde mi?
        if (!item.getCart().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // 4) İşlem
        if (quantity <= 0) {
            cartItemRepository.delete(item);
        } else {
            item.setQuantity(quantity);
            cartItemRepository.save(item);
        }

        return ResponseEntity.ok(cartRepository.findByUserId(user.getId()));
    }


    // Remove item
    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<Cart> removeItem(Authentication authentication, @PathVariable Long itemId) {
        // 1) Kimlik
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // 2) Nesneyi bul
        Optional<CartItem> itemOpt = cartItemRepository.findById(itemId);
        if (itemOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        CartItem item = itemOpt.get();

        // 3) Sahiplik
        if (!item.getCart().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // 4) İşlem
        cartItemRepository.delete(item);
        return ResponseEntity.ok(cartRepository.findByUserId(user.getId()));
    }

}
