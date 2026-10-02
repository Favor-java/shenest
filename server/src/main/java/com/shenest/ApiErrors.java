package com.shenest;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.Map;

// Spring calls these methods when an API endpoint throws one of these errors.
// Every error uses the same JSON shape: { "message": "..." }.
@RestControllerAdvice
public class ApiErrors {
    @ExceptionHandler(ApiException.class)
    ResponseEntity<Map<String, String>> handleApiError(ApiException exception) {
        return ResponseEntity.status(exception.status())
                .body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler({
        HttpMessageNotReadableException.class,
        MethodArgumentTypeMismatchException.class
    })
    ResponseEntity<Map<String, String>> handleInvalidRequest(Exception exception) {
        return ResponseEntity.badRequest()
                .body(Map.of("message", "Please provide valid request fields."));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<Map<String, String>> handleOversizedUpload(Exception exception) {
        return ResponseEntity.badRequest().body(Map.of("message", "Maximum image size is 5 MB."));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<Map<String, String>> handleDatabaseConflict(Exception exception) {
        return ResponseEntity.status(409)
                .body(Map.of("message", "This record already exists or contains invalid data."));
    }
}
