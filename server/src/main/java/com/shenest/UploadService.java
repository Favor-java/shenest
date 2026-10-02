package com.shenest;

import org.springframework.stereotype.Service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;

/** Save a property image on disk and return the address the browser can use. */
@Service
public class UploadService {
    private static final long MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
    private final AuthService authentication;
    private final Path uploadDirectory;

    public UploadService(
            AuthService authentication, @Value("${shenest.upload-dir}") String uploadDirectory) {
        this.authentication = authentication;
        this.uploadDirectory = Path.of(uploadDirectory).toAbsolutePath().normalize();
    }

    public Map<String, String> upload(
            MultipartFile image, AuthenticatedUser currentUser, String baseUrl)
            throws IOException {
        authentication.requireRole(
                currentUser, "LANDLORD", "Only landlord accounts can upload property images.");

        if (image == null || image.isEmpty()) {
            throw new ApiException(400, "Please choose an image.");
        }

        String extension = getImageExtension(image.getContentType());
        if (image.getSize() > MAX_IMAGE_SIZE_BYTES) {
            throw new ApiException(400, "Maximum image size is 5 MB.");
        }

        // A random name avoids overwriting another upload or trusting a submitted filename.
        String filename = UUID.randomUUID().toString() + extension;
        Path destination = uploadDirectory.resolve(filename);
        Files.createDirectories(uploadDirectory);
        image.transferTo(destination);

        String imageUrl = baseUrl + "/uploads/" + filename;
        return Map.of("url", imageUrl);
    }

    private String getImageExtension(String contentType) {
        if ("image/jpeg".equals(contentType)) {
            return ".jpg";
        }
        if ("image/png".equals(contentType)) {
            return ".png";
        }
        if ("image/webp".equals(contentType)) {
            return ".webp";
        }
        if ("image/gif".equals(contentType)) {
            return ".gif";
        }
        throw new ApiException(400, "Only JPEG, PNG, WebP and GIF image files are allowed.");
    }
}
