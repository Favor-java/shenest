package com.shenest;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Files;
import java.nio.file.Path;

/** Website settings: uploaded files, allowed API origins, and browser safety checks. */
@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final Path uploadDirectory;
    private final String[] allowedOrigins;
    private final BrowserSession browserSession;

    public WebConfig(
            @Value("${shenest.upload-dir}") String uploadDirectory,
            @Value("${shenest.cors-origins}") String allowedOrigins,
            BrowserSession browserSession)
            throws Exception {
        this.browserSession = browserSession;
        this.uploadDirectory = Path.of(uploadDirectory).toAbsolutePath().normalize();
        this.allowedOrigins = allowedOrigins.split(",");

        Files.createDirectories(this.uploadDirectory);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // Separate frontends may call the API only from these configured origins.
        registry.addMapping("/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // /uploads/photo.png points to a file inside the local upload folder.
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(
                        uploadDirectory.toUri().toString(), "classpath:/static/images/");
        // User uploads take priority. The packaged images supply missing demo photos.
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(browserSession).addPathPatterns("/api/**", "/ui/**");
    }
}
