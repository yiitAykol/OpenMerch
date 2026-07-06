package com.example.productapi;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<Cart> getCart(@RequestParam(defaultValue = "1") Long userId) {
        Cart cart = cartRepository.findByUserId(userId);
        if (cart == null) {
            Optional<User> user = userRepository.findById(userId);
            if (user.isPresent()) {
                cart = new Cart(user.get());
                cartRepository.save(cart);
            } else {
                return ResponseEntity.notFound().build();
            }
        }
        return ResponseEntity.ok(cart);
    }

    public static class CartItemRequest {
        public Long productId;
        public int quantity;
        public Long userId = 1L;
    }

    // Add item to Cart
    @PostMapping("/items")
    public ResponseEntity<Cart> addItemToCart(@RequestBody CartItemRequest request) {
        Cart cart = cartRepository.findByUserId(request.userId);
        if (cart == null) {
            Optional<User> user = userRepository.findById(request.userId);
            if (user.isPresent()) {
                cart = new Cart(user.get());
                cartRepository.save(cart);
            } else {
                return ResponseEntity.notFound().build();
            }
        }

        Optional<Product> productOpt = productRepository.findById(request.productId);
        if (productOpt.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        Product product = productOpt.get();

        // Check if item already exists in cart
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

        return ResponseEntity.ok(cartRepository.findByUserId(request.userId));
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
