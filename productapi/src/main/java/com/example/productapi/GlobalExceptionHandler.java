package com.example.productapi;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.stream.Collectors;

// @Valid'in reddettiği istekleri projenin geri kalanıyla aynı biçimde döndürür:
// {"message": "..."}. Bu sınıf tüm controller'lar için geçerlidir.
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidationError(MethodArgumentNotValidException ex) {
        // 1) ex.getBindingResult().getFieldErrors() → reddedilen alanlar
        // 2) her birinin getDefaultMessage()'ını al
        // 3) Collectors.joining(" ") ile birleştir
        // 4) ResponseEntity.badRequest().body(Map.of("message", birlesmisMetin)) dön
        String message = ex.getBindingResult().getFieldErrors().stream()
            .map(FieldError::getDefaultMessage)
            .collect(Collectors.joining(" "));
            
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }
}
