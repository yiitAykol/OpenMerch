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

    @PostMapping("/items")
    public ResponseEntity<Cart> addItemToCart(Authentication authentication, @RequestBody CartItemRequest request) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Cart cart = cartRepository.findByUserId(user.getId());
        if (cart == null) {
            cart = new Cart(user);
            cartRepository.save(cart);
        }

        Optional<Product> productOpt = productRepository.findById(request.productId);
        if (productOpt.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        Product product = productOpt.get();

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
    public ResponseEntity<Cart> updateItemQuantity(@PathVariable Long itemId, @RequestParam int quantity) {
        Optional<CartItem> itemOpt = cartItemRepository.findById(itemId);
        if (itemOpt.isPresent()) {
            CartItem item = itemOpt.get();
            if (quantity <= 0) {
                cartItemRepository.delete(item);
            } else {
                item.setQuantity(quantity);
                cartItemRepository.save(item);
            }
            return ResponseEntity.ok(cartRepository.findByUserId(item.getCart().getUser().getId()));
        }
        return ResponseEntity.notFound().build();
    }

    // Remove item
    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<Cart> removeItem(@PathVariable Long itemId) {
        Optional<CartItem> itemOpt = cartItemRepository.findById(itemId);
        if (itemOpt.isPresent()) {
            CartItem item = itemOpt.get();
            Long userId = item.getCart().getUser().getId();
            cartItemRepository.delete(item);
            return ResponseEntity.ok(cartRepository.findByUserId(userId));
        }
        return ResponseEntity.notFound().build();
    }
}
